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

// --- NEW LOGIC: 3-Chunk Splitter ---
export const splitTextIntoChunks = (text: string): string[] => {
  // Clean text first
  const clean = text
    .replace(/!\[.*?\]/g, "")
    .replace(/\[DIAGRAM\][\s\S]*?\[\/DIAGRAM\]/g, "")
    .replace(/\[IMAGE\][\s\S]*?\[\/IMAGE\]/g, "")
    .replace(/[#*`]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (clean.length < 200) return [clean]; // Too short to split

  const words = clean.split(' ');
  const totalWords = words.length;
  
  // Targets: 20%, 60% (cumulative of 20+40), 100%
  const target1 = Math.floor(totalWords * 0.2);
  const target2 = Math.floor(totalWords * 0.6);

  const findNearestPeriod = (targetIndex: number): number => {
    // Look forward and backward for a word ending in '.'
    let range = 0;
    const maxRange = 50; // Don't look too far
    
    while(range < maxRange) {
      // Check forward
      if (targetIndex + range < words.length && words[targetIndex + range].endsWith('.')) {
        return targetIndex + range + 1;
      }
      // Check backward
      if (targetIndex - range > 0 && words[targetIndex - range].endsWith('.')) {
        return targetIndex - range + 1;
      }
      range++;
    }
    return targetIndex; // Fallback if no period found
  };

  const split1 = findNearestPeriod(target1);
  const split2 = findNearestPeriod(target2);

  const chunk1 = words.slice(0, split1).join(' ');
  const chunk2 = words.slice(split1, split2).join(' ');
  const chunk3 = words.slice(split2).join(' ');

  return [chunk1, chunk2, chunk3].filter(c => c.trim().length > 0);
};

// --- Procedural System Sounds ---

export const playSystemSound = (type: 'thinking' | 'ready', ctx: AudioContext) => {
  if (ctx.state === 'suspended') ctx.resume();
  
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;

  if (type === 'thinking') {
    // Subtle breathe: 200Hz - 220Hz
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(220, now + 1.5);
    osc.frequency.linearRampToValueAtTime(200, now + 3.0);
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.05, now + 1.5); // Very quiet
    gain.gain.linearRampToValueAtTime(0, now + 3.0);
    
    osc.start(now);
    osc.stop(now + 3.0);
  } 
  else if (type === 'ready') {
    // Glassy Chime: 800Hz -> 1200Hz fast sweep
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    
    osc.start(now);
    osc.stop(now + 0.6);
  }
};
