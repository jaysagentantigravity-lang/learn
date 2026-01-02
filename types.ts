
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
  suggestedActions?: string[]; // Smart follow-up suggestions
  storyManifest?: StoryManifest; // New: For Cinematic Story Mode
}

export interface StoryChapter {
  id: string;
  title: string;
  narrative: string; // The text to be spoken/read
  visualPrompt: string; // Prompt for the image generator
  mood: 'heroic' | 'tragic' | 'mysterious' | 'energetic' | 'peaceful';
  widget?: {
    type: 'CHART' | 'MAP' | 'STATS' | 'RADAR' | 'LOGOS';
    data: any; // JSON string or object for the widget
  };
}

export interface StoryManifest {
  title: string;
  subjectName: string; // For consistency in prompts
  directorNotes?: string; // Reasoning for the direction
  chapters: StoryChapter[];
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
  mode: 'learning' | 'explanatory' | 'storytelling'; // Added explicit mode
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

// --- Token Usage Tracking ---

export type FeatureType = 
  | 'discovery' 
  | 'clarification' 
  | 'research' 
  | 'visuals' 
  | 'synthesis' 
  | 'tts' 
  | 'stt' 
  | 'image_gen';

export interface TokenUsageRecord {
  timestamp: number;
  feature: FeatureType;
  model: string;
  inputTokens: number;
  predictedOutputTokens: number;
  totalTokens: number;
}
