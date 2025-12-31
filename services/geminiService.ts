import { GoogleGenAI, Modality, Type, GenerateContentResponse } from "@google/genai";
import { ProcessingOptions } from "../types";

// Initialize AI Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// -- Models --
const MODEL_SEARCH = 'gemini-3-flash-preview';
const MODEL_THINKING = 'gemini-3-pro-preview'; // For complex tasks
const MODEL_IMAGE = 'gemini-3-pro-preview'; // For image analysis
const MODEL_TTS = 'gemini-2.5-flash-preview-tts';
const MODEL_STT = 'gemini-3-flash-preview'; // For audio transcription

/**
 * Main function to generate text response based on configuration
 */
export const generateResponse = async (
  prompt: string,
  options: ProcessingOptions
): Promise<{ text: string; sources?: any[] }> => {
  let model = MODEL_SEARCH;
  let config: any = {};
  const tools: any[] = [];

  // System Instruction for Visual Interleaving
  config.systemInstruction = `
    You are Lumina, a bioluminescent AI interface. 
    Format your responses using Markdown. 
    If a concept implies a process, flow, or hierarchy, VISUALIZE it using a Mermaid.js diagram.
    Wrap the Mermaid diagram code in [DIAGRAM]...[/DIAGRAM] tags.
    Use 'graph TD' (Top-Down) or 'graph LR' (Left-Right) for flowcharts.
    Example: 
    [DIAGRAM]
    graph TD;
    A[Start] --> B{Decision};
    B -- Yes --> C[Result];
    [/DIAGRAM]
    
    If you find an image URL relevant to the topic (only if you have a valid grounded link), wrap it in [IMAGE]...[/IMAGE].
    Keep text explanations concise and use bolding for key terms.
  `;

  // 1. Determine Model & Config based on options
  if (options.image) {
    model = MODEL_IMAGE;
    // Image model logic
  } else if (options.useThinking) {
    model = MODEL_THINKING;
    // Thinking Config - High budget for deep reasoning
    config.thinkingConfig = { thinkingBudget: 32768 }; 
    // IMPORTANT: Do NOT set maxOutputTokens when using thinkingBudget logic for this model specifically unless carefully calculated.
  } else if (options.useSearch) {
    model = MODEL_SEARCH;
    tools.push({ googleSearch: {} });
  }

  config.tools = tools.length > 0 ? tools : undefined;

  // 2. Prepare Contents
  const parts: any[] = [];
  
  if (options.image) {
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg', // Assuming JPEG for simplicity in this demo
        data: options.image
      }
    });
  }
  
  parts.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: { parts },
      config: config
    });

    const text = response.text || "I couldn't generate a response.";
    
    // Extract grounding chunks if available (Google Search)
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
      title: chunk.web?.title || 'Source',
      url: chunk.web?.uri
    })).filter((s: any) => s.url) || [];

    return { text, sources };

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};

/**
 * Transcribe Audio (Speech-to-Text)
 */
export const transcribeAudio = async (base64Audio: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_STT,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'audio/wav', // Adjust if using different recording format
              data: base64Audio
            }
          },
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

/**
 * Generate Speech (Text-to-Speech)
 * Returns raw PCM base64 string
 */
export const generateSpeech = async (text: string): Promise<string | null> => {
  try {
    // 1. Remove custom tags
    let cleanText = text.replace(/\[DIAGRAM\][\s\S]*?\[\/DIAGRAM\]|\[IMAGE\][\s\S]*?\[\/IMAGE\]/g, "");
    
    // 2. Remove Markdown syntax that might confuse TTS (bold, headers, lists)
    // Replace bold/italic (**text**, *text*) with just text
    cleanText = cleanText.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1");
    // Remove hash headers
    cleanText = cleanText.replace(/^#+\s+/gm, "");
    // Remove links [text](url) -> text
    cleanText = cleanText.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
    // Normalize whitespace
    cleanText = cleanText.replace(/\s+/g, " ").trim();

    const safeText = cleanText.length > 300 ? cleanText.substring(0, 300) + "..." : cleanText;

    if (!safeText.trim()) return null;

    const response = await ai.models.generateContent({
      model: MODEL_TTS,
      contents: [{ parts: [{ text: safeText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) {
    console.error("TTS Error:", error);
    // Return null to allow the app to continue without audio rather than crashing
    return null;
  }
};