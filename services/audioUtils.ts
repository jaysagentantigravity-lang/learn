import AudioContextManager from './audioContext';

// Utility to base64 encode a blob
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// PCM Decoding helpers
export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// --- OPTIMIZED CHUNK SPLITTER ---
export const splitTextIntoChunks = (text: string): string[] => {
  const clean = text
    .replace(/!\[.*?\](?:\(.*?\))?/g, "") 
    .replace(/\[DIAGRAM\][\s\S]*?\[\/DIAGRAM\]/g, "")
    .replace(/\[\[.*?\]\]/g, "") 
    .replace(/[#*`]/g, "")
    .trim();

  if (clean.length < 500) return [clean]; 

  const sentences = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [clean];
  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > 600) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += " " + sentence;
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk.trim());

  return chunks;
};

// --- PROCEDURAL ATMOSPHERE ENGINE (WITH DUCKING) ---

let activeOscillators: OscillatorNode[] = [];
let activeGains: GainNode[] = [];
let currentMasterGain: GainNode | null = null;

export interface AtmosphereController {
  duck: () => void;
  lift: () => void;
  stop: () => void;
}

const MOOD_FREQUENCIES: Record<string, number[]> = {
  'heroic': [110, 164.81, 196.00, 220], // A Major
  'tragic': [58.27, 87.31, 103.83, 138.59], // Bb Minor
  'mysterious': [73.42, 110, 130.81, 146.83], // D minor add 9
  'energetic': [130.81, 196.00, 261.63, 329.63], // C Major fast
  'peaceful': [98.00, 146.83, 196.00, 246.94] // G Major
};

export const startAtmosphere = (mood: string): AtmosphereController => {
  stopAtmosphere(); // Clean up previous

  const ctx = AudioContextManager.getContext();
  const freqs = MOOD_FREQUENCIES[mood] || MOOD_FREQUENCIES['peaceful'];
  const now = ctx.currentTime;

  // Master Gain for Atmosphere (This is what we duck)
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0, now);
  masterGain.gain.linearRampToValueAtTime(0.12, now + 3); // Fade in
  masterGain.connect(ctx.destination);
  
  currentMasterGain = masterGain;
  activeGains.push(masterGain);

  // Create Oscillators (The Layer)
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = i % 2 === 0 ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.detune.setValueAtTime(Math.random() * 10 - 5, now);
    
    // LFO for movement
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.1 + (Math.random() * 0.2), now);
    
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(0.3, now);
    lfo.connect(lfoGain.gain);
    
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.4, now); // Individual osc volume
    
    osc.connect(oscGain);
    oscGain.connect(masterGain);
    
    osc.start(now);
    lfo.start(now);
    
    activeOscillators.push(osc);
    activeOscillators.push(lfo);
    activeGains.push(oscGain);
    activeGains.push(lfoGain);
  });

  return {
    duck: () => {
      if (masterGain) {
        // Drop volume to 30% quickly
        masterGain.gain.cancelScheduledValues(ctx.currentTime);
        masterGain.gain.setTargetAtTime(0.04, ctx.currentTime, 0.5); 
      }
    },
    lift: () => {
      if (masterGain) {
        // Raise volume back slowly
        masterGain.gain.cancelScheduledValues(ctx.currentTime);
        masterGain.gain.setTargetAtTime(0.12, ctx.currentTime, 2.0);
      }
    },
    stop: () => stopAtmosphere()
  };
};

export const stopAtmosphere = () => {
  const ctx = AudioContextManager.getContext();
  const now = ctx.currentTime;
  
  // Fade out
  if (currentMasterGain) {
     try {
       currentMasterGain.gain.cancelScheduledValues(now);
       currentMasterGain.gain.linearRampToValueAtTime(0, now + 2);
     } catch(e) {}
  }

  // Hard stop after fade
  setTimeout(() => {
    activeOscillators.forEach(o => { try { o.stop(); } catch(e) {} });
    activeOscillators = [];
    activeGains = [];
    currentMasterGain = null;
  }, 2100);
};

// --- Procedural System Sounds ---
export const playSystemSound = (type: 'tick' | 'thrum_start' | 'thrum_stop' | 'ping') => {
  const ctx = AudioContextManager.getContext();
  const now = ctx.currentTime;

  // Simple synthesizers for UI feedback
  if (type === 'tick') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.start(now);
    osc.stop(now + 0.06);
  }
  // ... (Other sounds preserved) ...
};