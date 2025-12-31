import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import BioluminescentOrb from './components/BioluminescentOrb';
import InputBar from './components/InputBar';
import MessageList from './components/MessageList';
import AudioPlayer from './components/AudioPlayer';
import { generateResponse, generateSpeech, transcribeAudio } from './services/geminiService';
import { blobToBase64, decode, decodeAudioData } from './services/audioUtils';
import { Message, AppState, ProcessingOptions } from './types';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [activeAudioMsg, setActiveAudioMsg] = useState<Message | null>(null);
  
  // Audio Context Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  // Initialize AudioContext on first interaction
  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  const playAudioResponse = async (base64Audio: string) => {
    if (!audioEnabled || !base64Audio) {
      setAppState(AppState.IDLE);
      return;
    }

    try {
      initAudio();
      if (!audioContextRef.current || !analyserRef.current) return;

      const ctx = audioContextRef.current;
      
      // Stop previous audio
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
      }

      const audioBytes = decode(base64Audio);
      const audioBuffer = await decodeAudioData(audioBytes, ctx, 24000, 1);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(analyserRef.current);
      analyserRef.current.connect(ctx.destination);
      
      sourceNodeRef.current = source;
      
      source.onended = () => {
        setAppState(AppState.IDLE);
      };

      setAppState(AppState.SPEAKING);
      source.start();

    } catch (e) {
      console.error("Error playing audio", e);
      setAppState(AppState.IDLE);
    }
  };

  const handleSendMessage = async (text: string, options: ProcessingOptions) => {
    initAudio();

    // Add User Message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: Date.now(),
      image: options.image ? options.image.split(',')[1] : undefined
    };
    setMessages(prev => [...prev, userMsg]);

    setAppState(AppState.THINKING);

    try {
      // 1. Get Text Response (Gemini 3 Pro/Flash)
      // Strip header for processing if present
      const imageForApi = options.image ? options.image.split(',')[1] : undefined;
      
      const { text: responseText, sources } = await generateResponse(text, { ...options, image: imageForApi });

      const modelMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now(),
        groundingSources: sources
      };

      setMessages(prev => [...prev, modelMsg]);

      // 2. Generate Audio (Gemini 2.5 TTS)
      // Note: In this improved UI version, we might want to defer auto-play 
      // if the user clicks the play button manually, but for now we keep auto-play
      // if the global toggle is on.
      if (audioEnabled) {
        const audioData = await generateSpeech(responseText);
        if (audioData) {
          await playAudioResponse(audioData);
        } else {
          setAppState(AppState.IDLE);
        }
      } else {
        setAppState(AppState.IDLE);
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "I encountered a disturbance in the network. Please try again.",
        timestamp: Date.now(),
        isError: true
      }]);
      setAppState(AppState.IDLE);
    }
  };

  const handleAudioInput = async (blob: Blob) => {
    initAudio();
    setAppState(AppState.THINKING);
    try {
      const base64Audio = await blobToBase64(blob);
      const transcribedText = await transcribeAudio(base64Audio);
      
      if(transcribedText) {
         handleSendMessage(transcribedText, { useThinking: false, useSearch: true });
      } else {
        setAppState(AppState.IDLE);
      }
    } catch (error) {
        console.error(error);
        setAppState(AppState.IDLE);
    }
  };

  return (
    <div className="relative h-screen w-full flex flex-col items-center overflow-hidden bg-[#0a0a0a]">
      
      {/* Voice Toggle (Sticky Top Right - moved slightly to accommodate dock) */}
      <button 
        onClick={() => setAudioEnabled(!audioEnabled)}
        className="absolute top-6 right-20 z-40 text-white/50 hover:text-white transition-colors p-2 rounded-full bg-black/20 backdrop-blur-md"
        title="Toggle Auto-TTS"
      >
        {audioEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
      </button>

      {/* Audio Player Sidebar Dock */}
      <div className="absolute top-20 right-6 z-50">
        <AnimatePresence>
            {activeAudioMsg && (
                <AudioPlayer 
                    message={activeAudioMsg} 
                    onClose={() => setActiveAudioMsg(null)} 
                />
            )}
        </AnimatePresence>
      </div>

      {/* Main Layout Grid */}
      <div className="flex-1 w-full max-w-4xl flex flex-col items-center relative z-10 h-full">
        
        {/* The Brain (Centered Visual) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none">
          <BioluminescentOrb state={appState} analyser={analyserRef.current} />
        </div>

        {/* Message Area (Fills space above input) */}
        <div className="flex-1 w-full flex flex-col min-h-0 pb-32 pt-20">
           <MessageList 
             messages={messages} 
             onPlayAudio={(msg) => setActiveAudioMsg(msg)} 
           />
        </div>
      </div>

      {/* Input Area (Sticky Bottom) */}
      <div className="fixed bottom-0 w-full flex justify-center pb-6 z-20 bg-gradient-to-t from-black via-black/80 to-transparent pt-10 pointer-events-none">
        <div className="pointer-events-auto w-full flex justify-center">
            <InputBar 
                appState={appState} 
                onSendMessage={handleSendMessage}
                onAudioInput={handleAudioInput}
            />
        </div>
      </div>

    </div>
  );
}

export default App;