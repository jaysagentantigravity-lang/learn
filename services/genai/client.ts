import { GoogleGenAI } from "@google/genai";

// Initialize AI Client
export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// -- Models --
export const MODELS = {
  RESEARCH: 'gemini-2.0-flash',
  FAST: 'gemini-2.0-flash',
  WRITER: 'gemini-2.0-flash',
  TTS: 'gemini-2.5-flash-preview-tts',
  STT: 'gemini-2.0-flash',
  GEN_IMAGE: 'gemini-2.5-flash-image',
  GEN_IMAGE_HQ: 'gemini-3-pro-image-preview' // Nano Banana Pro / Gemini 3 Pro Image
};