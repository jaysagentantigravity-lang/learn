import { Modality } from "@google/genai";
import { ai, MODELS } from "./client";
import { VoiceName } from "../../types";
import { tokenEstimator } from "../tokenEstimator";

// LRU Cache Implementation
class ImageLRUCache {
  private capacity: number;
  private map: Map<string, string>;

  constructor(capacity: number = 20) {
    this.capacity = capacity;
    this.map = new Map();
  }

  get(key: string): string | undefined {
    if (!this.map.has(key)) return undefined;
    // Refresh item
    const val = this.map.get(key)!;
    this.map.delete(key);
    this.map.set(key, val);
    return val;
  }

  set(key: string, value: string) {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.capacity) {
      // Evict oldest
      const firstKey = this.map.keys().next().value;
      if (firstKey) {
        const urlToRevoke = this.map.get(firstKey);
        if (urlToRevoke) URL.revokeObjectURL(urlToRevoke); // Clean up memory
        this.map.delete(firstKey);
      }
    }
    this.map.set(key, value);
  }
}

const imageCache = new ImageLRUCache(20);

// Helper to convert Base64 to Blob URL
const base64ToBlobUrl = (base64: string): string => {
  try {
    const byteString = atob(base64.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: 'image/png' });
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error("Blob conversion failed", e);
    return base64; // Fallback
  }
};

export const generateStoryModeSummary = async (articleText: string): Promise<string> => {
  try {
    const prompt = `Convert the following article into a natural, spoken-word podcast script. 
      Make it sound like a friendly expert explaining it to a friend. 
      Keep it under 3 minutes of reading time. 
      Do not include speaker labels or sound effects. Just the text.
      
      ARTICLE: ${articleText.substring(0, 20000)}`;
    
    // TRACK (Synthesis because it's LLM text gen)
    tokenEstimator.track('synthesis', MODELS.FAST, prompt);

    const response = await ai.models.generateContent({
      model: MODELS.FAST,
      contents: prompt
    });
    return response.text || "";
  } catch (e) {
    return articleText; // Fallback
  }
};

export const transcribeAudio = async (base64Audio: string): Promise<string> => {
  try {
    // TRACK
    tokenEstimator.track('stt', MODELS.STT, 'audio_blob');

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

export const getVoiceForMood = (mood: string): VoiceName => {
  const m = mood.toLowerCase();
  if (m.includes('tragic') || m.includes('sad') || m.includes('dark')) return 'Charon';
  if (m.includes('heroic') || m.includes('bold') || m.includes('action')) return 'Fenrir';
  if (m.includes('peaceful') || m.includes('calm') || m.includes('mysterious')) return 'Aoede';
  if (m.includes('energetic') || m.includes('bright')) return 'Puck';
  return 'Kore'; // Default/Academic
};

export const generateSpeech = async (text: string, voiceName: VoiceName = 'Kore'): Promise<string | null> => {
  try {
    if (!text.trim()) return null;
    
    // TRACK
    tokenEstimator.track('tts', MODELS.TTS, text);

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

export const generateImage = async (prompt: string, orientation: 'landscape' | 'portrait' = 'landscape', useHQ: boolean = false): Promise<string | null> => {
  const cacheKey = `${prompt}::${orientation}::${useHQ ? 'HQ' : 'LQ'}`;
  
  // Check Cache
  const cached = imageCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const modelToUse = useHQ ? MODELS.GEN_IMAGE_HQ : MODELS.GEN_IMAGE;
    
    // TRACK
    tokenEstimator.track('image_gen', modelToUse, prompt);

    const aspectRatio = orientation === 'portrait' ? "3:4" : "16:9";
    const sizeConfig = useHQ ? { imageSize: "2K" } : {};
    
    // Enhanced prompt for cinematic quality and accuracy
    const enhancedPrompt = useHQ 
      ? `Hyper-realistic 8k portrait. CRITICAL: Ensure historical accuracy and correct physical features for verified public figures. Cinematic lighting, highly detailed skin texture, photorealistic depth of field. Prompt: ${prompt}`
      : `Cinematic, highly detailed, photorealistic, 8k resolution, dramatic lighting. ${prompt}`;

    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: {
        parts: [{ text: enhancedPrompt }]
      },
      config: {
        imageConfig: { aspectRatio: aspectRatio, ...sizeConfig } 
      }
    });
    
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          const base64 = `data:image/png;base64,${part.inlineData.data}`;
          // Convert to Blob URL for memory efficiency
          const blobUrl = base64ToBlobUrl(base64);
          
          // Set Cache
          imageCache.set(cacheKey, blobUrl);
          return blobUrl;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Image Gen Error:", error);
    return null;
  }
};