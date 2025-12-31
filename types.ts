export interface Clarification {
  question: string;
  options: string[];
  selectedOption?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isError?: boolean;
  groundingSources?: Array<{
    title?: string;
    url?: string;
  }>;
  image?: string; // base64
  clarification?: Clarification; // If model requests clarification
}

export enum AppState {
  IDLE = 'idle',
  THINKING = 'thinking', 
  SPEAKING = 'speaking', 
  LISTENING = 'listening'
}

export interface ProcessingOptions {
  useThinking: boolean;
  useSearch: boolean;
  image?: string;
  clarificationContext?: string; // Context from selected clarification chip
}

export interface AudioChunk {
  id: string;
  text: string;
  audioData: string | null; // base64
  status: 'pending' | 'loading' | 'ready' | 'played' | 'error';
}

export type VoiceName = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Aoede';

export interface UserSettings {
  voiceName: VoiceName;
}

export type AudioMode = 'verbatim' | 'story';
