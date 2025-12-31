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
}

export enum AppState {
  IDLE = 'idle',
  THINKING = 'thinking', // Processing/Generating
  SPEAKING = 'speaking', // TTS Playing
  LISTENING = 'listening' // Microphone active
}

export interface ProcessingOptions {
  useThinking: boolean;
  useSearch: boolean;
  image?: string; // base64 data
}