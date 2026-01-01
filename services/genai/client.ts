import { GoogleGenAI } from "@google/genai";

// Initialize AI Client
export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// -- Models --
// Using gemini-2.0-flash as it is the stable release that supports API Keys + Search Grounding.
// The gemini-3 preview models currently require OAuth in many regions.
export const MODELS = {
  RESEARCH: 'gemini-2.0-flash',
  FAST: 'gemini-2.0-flash',
  WRITER: 'gemini-2.0-flash',
  TTS: 'gemini-2.5-flash-preview-tts',
  STT: 'gemini-2.0-flash',
  GEN_IMAGE: 'gemini-2.5-flash-image'
};