// Singleton Audio Context Manager
// Prevents "DOMException: The number of hardware contexts reached the maximum."

class AudioContextManager {
  private static instance: AudioContext | null = null;

  public static getContext(): AudioContext {
    if (!this.instance) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.instance = new AudioContextClass({ sampleRate: 24000 });
    }
    
    if (this.instance.state === 'suspended') {
      this.instance.resume();
    }
    
    return this.instance;
  }

  public static close(): void {
    if (this.instance) {
      this.instance.close();
      this.instance = null;
    }
  }
}

export default AudioContextManager;