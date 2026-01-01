import { Modality } from "@google/genai";
import { ai, MODELS } from "./client";
import { VoiceName } from "../../types";

const imageCache = new Map<string, string>();

export const generateStoryModeSummary = async (articleText: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: MODELS.FAST,
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
      model: MODELS.STT,
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
      model: MODELS.TTS,
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
    return imageCache.get(prompt) || null;
  }

  try {
    const response = await ai.models.generateContent({
      model: MODELS.GEN_IMAGE,
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