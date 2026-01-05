import { GoogleGenAI } from "@google/genai";

// Initialize AI Client
// API Key is strictly sourced from process.env.API_KEY as per security guidelines
export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// -- Model Configuration --
// Using Gemini 3 series for superior instruction following (Director Agent)
// and Gemini 2.5 Flash for low-latency tasks (TTS/Discovery).
export const MODELS = {
  // Research & Discovery (Fast, Grounded)
  RESEARCH: 'gemini-3-flash-preview',
  FAST: 'gemini-3-flash-preview',
  
  // Creative Writing & Director Agent (Requires high reasoning for JSON output)
  WRITER: 'gemini-3-pro-preview',
  
  // Multimodal Capabilities
  TTS: 'gemini-2.5-flash-preview-tts',
  STT: 'gemini-2.5-flash-native-audio-preview-09-2025', // Updated for robust audio ingestion
  
  // Image Generation
  GEN_IMAGE: 'gemini-2.5-flash-image', // Fast generation for story buffering
  GEN_IMAGE_HQ: 'gemini-3-pro-image-preview' // High fidelity for Hero Portraits
};
