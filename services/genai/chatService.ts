import { ai, MODELS } from "./client";
import { ProcessingOptions, Clarification, Message } from "../../types";

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
        model: MODELS.FAST,
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

     const raw = (preCheck.text || "").replace(/```json|```/g, '').trim();
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
    
    // Only use search if options.useSearch is true
    const tools = options.useSearch ? [{ googleSearch: {} }] : [];

    const researchResponse = await ai.models.generateContent({
      model: MODELS.RESEARCH,
      contents: `
      You are a PhD Researcher. 
      
      CONVERSATION HISTORY:
      ${conversationContext}
      
      CURRENT TASK: Gather factual details, history, mechanisms, and "why it matters" about: ${fullPrompt}. 
      
      Output RAW, unstructured data notes using your internal knowledge base AND external search if available. Do not summarize yet. Focus on answering the user's specific question in the context of the history.`,
      config: {
        tools: tools,
      }
    });
    
    if (signal?.aborted) return;

    researchData = researchResponse.text || "";
    
    // Extract Grounding Metadata (Sources)
    if (researchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      sources = researchResponse.candidates[0].groundingMetadata.groundingChunks
        .map((chunk: any) => {
          if (chunk.web) return { title: chunk.web.title, url: chunk.web.uri };
          return null;
        })
        .filter((s: any) => s !== null);
    }
    
    onUpdate({ sources });

  } catch (error) {
    if (signal?.aborted) return;
    console.error("Step 1 (Research) Failed", error);
    // Continue even if research fails, using internal knowledge for synthesis
    researchData = `(Research Unavailable) ${fullPrompt}`;
  }

  // --- STEP 2: VISUAL ARCHITECTURE (INFOGRAPHIC TUNED) ---
  onUpdate({ status: "Designing Visuals..." });
  let imagePrompts = "";
  try {
    if (signal?.aborted) return;
    const visualResponse = await ai.models.generateContent({
      model: MODELS.FAST,
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
    imagePrompts = (visualResponse.text || "[]").replace(/```json|```/g, '').trim();
  } catch (e) {
    console.warn("Step 2 (Visuals) Failed", e);
  }

  // --- STEP 3: FINAL SYNTHESIS (Streaming) ---
  onUpdate({ status: "Synthesizing Response..." });
  try {
    if (signal?.aborted) return;
    const result = await ai.models.generateContentStream({
      model: MODELS.WRITER,
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