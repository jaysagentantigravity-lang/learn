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

// --- PROCEDURAL ATMOSPHERE ENGINE (LOUD & ROBUST) ---

let activeOscillators: OscillatorNode[] = [];
let activeGains: GainNode[] = [];
let currentMasterGain: GainNode | null = null;

export interface AtmosphereController {
  duck: () => void;
  lift: () => void;
  stop: () => void;
}

// Frequencies optimized for cinematic tension
const MOOD_FREQUENCIES: Record<string, number[]> = {
  'heroic': [55, 110, 164.81, 220], // A Major (Deep Bass A1 + A2 + E3 + A3)
  'tragic': [58.27, 116.54, 138.59, 174.61], // Bb Minor (Dark)
  'mysterious': [73.42, 110, 130.81, 146.83], // D minor add 9 (Sci-fi)
  'energetic': [65.41, 130.81, 196.00, 261.63], // C Major (Bright)
  'peaceful': [49.00, 98.00, 146.83, 196.00] // G Major (Warm)
};

export const startAtmosphere = (mood: string): AtmosphereController => {
  stopAtmosphere(); // Clean up previous

  const ctx = AudioContextManager.getContext();
  
  // Ensure context is running (Fix for browser autoplay policy)
  if (ctx.state === 'suspended') {
      ctx.resume();
  }

  const freqs = MOOD_FREQUENCIES[mood] || MOOD_FREQUENCIES['peaceful'];
  const now = ctx.currentTime;

  // Master Gain: Controls the overall volume of the music layer
  // INCREASED BASE VOLUME from 0.12 to 0.25 so it is audible
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0, now);
  masterGain.gain.linearRampToValueAtTime(0.25, now + 2); // Quick fade in
  
  // Add a Compressor to prevent clipping/distortion when loud
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-24, now);
  compressor.knee.setValueAtTime(30, now);
  compressor.ratio.setValueAtTime(12, now);
  compressor.attack.setValueAtTime(0.003, now);
  compressor.release.setValueAtTime(0.25, now);

  masterGain.connect(compressor);
  compressor.connect(ctx.destination);
  
  currentMasterGain = masterGain;
  activeGains.push(masterGain);

  // Create Oscillators (The Layer)
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    
    // CHANGED: Use 'triangle' and 'sawtooth' instead of 'sine'.
    // Sine waves are very quiet on small speakers. Triangle/Sawtooth have harmonics.
    osc.type = i === 0 ? 'triangle' : (i % 2 === 0 ? 'sine' : 'triangle');
    
    osc.frequency.setValueAtTime(freq, now);
    // Detune adds richness/chorus effect
    osc.detune.setValueAtTime(Math.random() * 12 - 6, now);
    
    // LFO for movement (Breathing effect)
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.05 + (Math.random() * 0.1), now);
    
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(0.15, now); // Depth of modulation
    lfo.connect(lfoGain.gain);
    
    const oscGain = ctx.createGain();
    // Lower volume for high pitch, higher volume for bass
    const baseVol = i === 0 ? 0.6 : 0.3; 
    oscGain.gain.setValueAtTime(baseVol, now); 
    
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
        // Drop volume to 8% when voice is speaking (was 4%)
        masterGain.gain.cancelScheduledValues(ctx.currentTime);
        masterGain.gain.setTargetAtTime(0.08, ctx.currentTime, 0.5); 
      }
    },
    lift: () => {
      if (masterGain) {
        // Swell volume to 25% during transitions (was 12%)
        masterGain.gain.cancelScheduledValues(ctx.currentTime);
        masterGain.gain.setTargetAtTime(0.25, ctx.currentTime, 1.5);
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
  if (ctx.state === 'suspended') ctx.resume(); // Vital for UI sounds
  const now = ctx.currentTime;

  if (type === 'tick') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
    gain.gain.setValueAtTime(0.1, now); // Boosted volume
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.start(now);
    osc.stop(now + 0.06);
  } else if (type === 'ping') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.start(now);
    osc.stop(now + 0.6);
  }
};