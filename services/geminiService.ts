import { GoogleGenAI, Modality, Type } from "@google/genai";
import { ProcessingOptions, Clarification, VoiceName, Message } from "../types";

// Initialize AI Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// -- Models --
const MODEL_RESEARCH = 'gemini-3-pro-preview'; 
const MODEL_FAST = 'gemini-3-flash-preview'; 
const MODEL_WRITER = 'gemini-3-pro-preview';

const MODEL_TTS = 'gemini-2.5-flash-preview-tts';
const MODEL_STT = 'gemini-3-flash-preview';
const MODEL_GEN_IMAGE = 'gemini-2.5-flash-image';

// -- Caches --
const imageCache = new Map<string, string>();

export type StreamUpdate = {
  text?: string;
  sources?: any[];
  clarification?: Clarification;
  status?: string; // "Researching...", "Designing...", "Writing..."
};

// Helper: Format history for context (Limit to last 6 turns to save tokens)
const formatHistory = (history: Message[]): string => {
  if (!history || history.length === 0) return "";
  
  return history
    .slice(-6) // Keep last 6 messages
    .map(m => {
      const content = m.image ? `[User uploaded an image] ${m.text}` : m.text;
      return `${m.role.toUpperCase()}: ${content}`;
    })
    .join('\n');
};

/**
 * Orchestrates the 3-Step Pipeline with Streaming and Context
 */
export const generateResponseStream = async (
  prompt: string,
  history: Message[],
  options: ProcessingOptions,
  onUpdate: (update: StreamUpdate) => void,
  signal?: AbortSignal 
): Promise<void> => {
  
  if (signal?.aborted) return;

  const conversationContext = formatHistory(history);

  // 0. Handle Clarification Context
  let fullPrompt = prompt;
  if (options.clarificationContext) {
    fullPrompt = `Context: The user selected "${options.clarificationContext}" for the topic. \n\nOriginal Request: ${prompt}`;
  }

  // --- PRE-CHECK: Clarification (Fast) ---
  onUpdate({ status: "Analyzing Request..." });
  try {
     if (signal?.aborted) return;
     const preCheck = await ai.models.generateContent({
        model: MODEL_FAST,
        contents: `
        HISTORY:
        ${conversationContext}
        
        CURRENT REQUEST: "${fullPrompt}". 
        
        Analyze this request. Is it too vague (e.g. "Explain physics", "Write code")? 
        If YES, return strictly JSON: {"clarification": {"question": "...", "options": [...]}}. 
        If NO, return string "PROCEED".`,
        config: { responseMimeType: 'application/json' }
     });
     
     if (signal?.aborted) return;

     const raw = preCheck.text || "";
     if (raw.includes("clarification")) {
        const parsed = JSON.parse(raw);
        if (parsed.clarification) {
           onUpdate({ clarification: parsed.clarification, status: "completed" });
           return;
        }
     }
  } catch(e) { /* Proceed */ }


  // --- STEP 1: DEEP RESEARCH ---
  onUpdate({ status: "Gathering Deep Knowledge..." });
  let researchData = "";
  let sources: any[] = [];
  
  try {
    if (signal?.aborted) return;
    const researchResponse = await ai.models.generateContent({
      model: MODEL_RESEARCH,
      contents: `
      You are a PhD Researcher. 
      
      CONVERSATION HISTORY:
      ${conversationContext}
      
      CURRENT TASK: Gather factual details, history, mechanisms, and "why it matters" about: ${fullPrompt}. 
      
      Output RAW, unstructured data notes. Do not summarize yet. Focus on answering the user's specific question in the context of the history.`,
      config: {
        tools: options.useSearch ? [{ googleSearch: {} }] : [],
        thinkingConfig: options.useThinking ? { thinkingBudget: 16384 } : undefined
      }
    });
    
    if (signal?.aborted) return;

    researchData = researchResponse.text || "";
    sources = researchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
      title: chunk.web?.title || 'Source',
      url: chunk.web?.uri
    })).filter((s: any) => s.url) || [];
    
    onUpdate({ sources }); // Emit sources early

  } catch (error) {
    if (signal?.aborted) return;
    console.error("Step 1 (Research) Failed", error);
    // Continue without deep research if fails, or handle error
  }

  // --- STEP 2: VISUAL ARCHITECTURE (INFOGRAPHIC TUNED) ---
  onUpdate({ status: "Designing Visuals..." });
  let imagePrompts = "";
  try {
    if (signal?.aborted) return;
    const visualResponse = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: `
      Analyze this data: ${researchData.substring(0, 10000)}. 
      Identify 3 key complex concepts that require visual explanation (e.g., structures, processes, comparisons).
      
      Generate 3 "Futuristic Infographic" prompts.
      
      CRITICAL STYLE GUIDE:
      - Subject: Holographic 3D Data Visualization, Technical Schematic, or Biological Cutaway.
      - Aesthetic: Bioluminescent Cyan/Amber/Purple accents on dark background.
      - Render: Unreal Engine 5, 8k resolution, volumetrics, clear composition.
      - Do NOT ask for generic scenes. Ask for *diagrammatic* or *schematic* visuals.
      
      Return ONLY a JSON list of objects: [{"keyword": "concept_name", "prompt": "..."}]`,
      config: { responseMimeType: 'application/json' }
    });
    if (signal?.aborted) return;
    imagePrompts = visualResponse.text || "[]";
  } catch (e) {
    console.warn("Step 2 (Visuals) Failed", e);
  }

  // --- STEP 3: FINAL SYNTHESIS (Streaming) ---
  onUpdate({ status: "Synthesizing Response..." });
  try {
    if (signal?.aborted) return;
    const result = await ai.models.generateContentStream({
      model: MODEL_WRITER,
      contents: `
        CONVERSATION HISTORY:
        ${conversationContext}

        DATA: ${researchData}
        VISUAL_PROMPTS_JSON: ${imagePrompts}
        
        TASK: Write a comprehensive, engaging response to the user's last request: "${fullPrompt}".
        
        INSTRUCTION:
        - Use H1 (#) for Main Title.
        - Use H2 (##) for Sections.
        - INTELLIGENTLY INSERT IMAGES: Use the provided VISUAL_PROMPTS_JSON. 
          Insert them using markdown syntax: ![PROMPT_TEXT](placeholder) at the EXACT logical point where that concept is explained.
        - Use [DIAGRAM]graph TD...[/DIAGRAM] for specific flowcharts or processes if needed.
        - Tone: Visionary, Educational, Empathetic.
        - Maintain continuity with the history (e.g. if they asked "tell me more", elaborate on the previous topic).
      `
    });

    let accumulatedText = "";
    for await (const chunk of result) {
       if (signal?.aborted) return;
       const textChunk = chunk.text;
       if (textChunk) {
         accumulatedText += textChunk;
         onUpdate({ text: accumulatedText });
       }
    }
    
    if (signal?.aborted) return;
    onUpdate({ status: "completed" });

  } catch (error) {
    if (signal?.aborted) return;
    console.error("Step 3 (Synthesis) Failed", error);
    throw error;
  }
};

// -- Legacy/Utility Functions --

export const generateStoryModeSummary = async (articleText: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: `Convert the following article into a natural, spoken-word podcast script. 
      Make it sound like a friendly expert explaining it to a friend. 
      Keep it under 3 minutes of reading time. 
      Do not include speaker labels or sound effects. Just the text.
      
      ARTICLE: ${articleText.substring(0, 20000)}`
    });
    return response.text || "";
  } catch (e) {
    return articleText; // Fallback
  }
};

export const transcribeAudio = async (base64Audio: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_STT,
      contents: {
        parts: [
          { inlineData: { mimeType: 'audio/wav', data: base64Audio } },
          { text: "Transcribe this audio exactly as spoken." }
        ]
      }
    });
    return response.text || "";
  } catch (error) {
    console.error("Transcription Error:", error);
    throw error;
  }
};

export const generateSpeech = async (text: string, voiceName: VoiceName = 'Kore'): Promise<string | null> => {
  try {
    if (!text.trim()) return null;
    const response = await ai.models.generateContent({
      model: MODEL_TTS,
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
};

export const generateImage = async (prompt: string): Promise<string | null> => {
  // Check Cache
  if (imageCache.has(prompt)) {
    console.log("Image Cache Hit");
    return imageCache.get(prompt) || null;
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL_GEN_IMAGE,
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: { aspectRatio: "16:9" } 
      }
    });
    
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          const base64 = `data:image/png;base64,${part.inlineData.data}`;
          // Set Cache
          imageCache.set(prompt, base64);
          return base64;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Image Gen Error:", error);
    return null;
  }
};