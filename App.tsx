import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BackgroundMesh, { BackgroundMode } from './components/BackgroundMesh';
import InputBar from './components/InputBar';
import MessageList from './components/MessageList';
import AudioPlayer from './components/AudioPlayer';
import WelcomeScreen from './components/WelcomeScreen';
import SettingsModal from './components/SettingsModal';
import { generateResponseStream, generateSpeech, transcribeAudio, generateStoryModeSummary, StreamUpdate } from './services/geminiService';
import { blobToBase64, splitTextIntoChunks, decode, decodeAudioData, playSystemSound } from './services/audioUtils';
import { Message, AppState, ProcessingOptions, AudioChunk, UserSettings, AudioMode } from './types';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [thinkingStatus, setThinkingStatus] = useState<string>("Processing...");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({ voiceName: 'Kore' });

  const [activeOptions, setActiveOptions] = useState<ProcessingOptions>({ useThinking: false, useSearch: true });

  // Audio Engine State
  const [audioQueue, setAudioQueue] = useState<AudioChunk[]>([]);
  const [currentChunkId, setCurrentChunkId] = useState<string | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0); // 0 to 1
  const [isBuffering, setIsBuffering] = useState(false);
  
  // Refs for Audio Logic
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(0);
  const progressLoopRef = useRef<number>(0);
  const prefetchTriggeredRef = useRef<boolean>(false);

  // Initialize Audio Context
  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 64; 
      analyserRef.current = analyser;
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  // --- "Invisible Relay" Audio Engine ---

  // 1. Fetcher Helper
  const loadChunkAudio = async (chunk: AudioChunk) => {
      if (chunk.status === 'ready' || chunk.status === 'played') return chunk.audioData;
      
      try {
        const audioData = await generateSpeech(chunk.text, settings.voiceName);
        setAudioQueue(prev => prev.map(c => c.id === chunk.id ? { ...c, status: 'ready', audioData } : c));
        return audioData;
      } catch (e) {
        console.error("Audio Fetch Error", e);
        setAudioQueue(prev => prev.map(c => c.id === chunk.id ? { ...c, status: 'error' } : c));
        return null;
      }
  };

  // 2. Play Logic
  const playChunk = async (chunkId: string) => {
    const chunk = audioQueue.find(c => c.id === chunkId);
    if (!chunk) return;

    setCurrentChunkId(chunkId);
    setIsBuffering(true);
    
    // Ensure data is ready
    let audioData = chunk.audioData;
    if (!audioData) {
       audioData = await loadChunkAudio(chunk);
    }
    
    if (!audioData) {
       // Skip if error
       handleNextChunk();
       return;
    }

    setIsBuffering(false);
    
    if (!audioContextRef.current || !analyserRef.current) return;
    
    // Stop previous
    if (sourceNodeRef.current) {
       try { sourceNodeRef.current.stop(); } catch(e) {}
    }

    try {
      const audioBytes = decode(audioData);
      const audioBuffer = await decodeAudioData(audioBytes, audioContextRef.current, 24000, 1);
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
      
      source.onended = () => {
         setAudioQueue(prev => prev.map(c => c.id === chunkId ? { ...c, status: 'played' } : c));
         handleNextChunk();
      };
      
      // Play System Sound 'Ready' if this is the first chunk or we were paused/buffering long
      playSystemSound('ready', audioContextRef.current);

      source.start();
      sourceNodeRef.current = source;
      startTimeRef.current = audioContextRef.current.currentTime;
      durationRef.current = audioBuffer.duration;
      prefetchTriggeredRef.current = false;
      setIsAudioPlaying(true);
      
      startProgressLoop();

    } catch (e) {
      console.error("Playback Error", e);
      handleNextChunk();
    }
  };

  // 3. Progress & Prefetch Loop
  const startProgressLoop = () => {
     cancelAnimationFrame(progressLoopRef.current);
     
     const loop = () => {
        if (!isAudioPlaying || !sourceNodeRef.current || !audioContextRef.current) return;
        
        const elapsed = audioContextRef.current.currentTime - startTimeRef.current;
        const progress = Math.min(elapsed / durationRef.current, 1);
        setAudioProgress(progress);

        // Prefetch Logic: Trigger at 10%
        if (progress > 0.10 && !prefetchTriggeredRef.current) {
           prefetchTriggeredRef.current = true;
           triggerPrefetch();
        }

        if (progress < 1) {
           progressLoopRef.current = requestAnimationFrame(loop);
        }
     };
     progressLoopRef.current = requestAnimationFrame(loop);
  };

  const triggerPrefetch = () => {
     const idx = audioQueue.findIndex(c => c.id === currentChunkId);
     if (idx !== -1 && idx < audioQueue.length - 1) {
        const nextChunk = audioQueue[idx + 1];
        if (nextChunk.status === 'pending') {
           console.log("Prefetching next chunk:", nextChunk.id);
           // Mark as loading internally in queue via loadChunkAudio
           setAudioQueue(prev => prev.map(c => c.id === nextChunk.id ? { ...c, status: 'loading' } : c));
           loadChunkAudio(nextChunk);
        }
     }
  };

  const handleNextChunk = () => {
     const idx = audioQueue.findIndex(c => c.id === currentChunkId);
     if (idx !== -1 && idx < audioQueue.length - 1) {
        playChunk(audioQueue[idx + 1].id);
     } else {
        stopAudio();
     }
  };

  const stopAudio = () => {
     if (sourceNodeRef.current) {
        try { sourceNodeRef.current.stop(); } catch(e) {}
     }
     setIsAudioPlaying(false);
     setAudioProgress(0);
     cancelAnimationFrame(progressLoopRef.current);
     setIsBuffering(false);
  };

  const togglePlayPause = () => {
     if (isAudioPlaying) {
        audioContextRef.current?.suspend();
        setIsAudioPlaying(false);
     } else {
        audioContextRef.current?.resume();
        setIsAudioPlaying(true);
     }
  };

  // --- Trigger Entry Point ---

  const handleAudioTrigger = async (msg: Message, mode: AudioMode) => {
    initAudio();
    if(audioContextRef.current) playSystemSound('thinking', audioContextRef.current);

    // Stop existing
    stopAudio();

    let textToRead = msg.text;
    if (mode === 'story') {
       textToRead = await generateStoryModeSummary(msg.text);
    }

    // 3-Chunk Logic
    const chunks = splitTextIntoChunks(textToRead);
    const newQueue: AudioChunk[] = chunks.map((text, i) => ({
       id: `${msg.id}_${mode}_part_${i}`,
       text,
       audioData: null,
       status: 'pending'
    }));

    setAudioQueue(newQueue);
    
    if (newQueue.length > 0) {
       // Start the engine
       playChunk(newQueue[0].id);
    }
  };


  // --- Main App Logic ---

  const handleSendMessage = async (text: string, options: ProcessingOptions) => {
    initAudio();
    setActiveOptions(options);

    if (!options.clarificationContext) {
      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        text,
        timestamp: Date.now(),
        image: options.image ? options.image.split(',')[1] : undefined
      };
      setMessages(prev => [...prev, userMsg]);
    }

    setAppState(AppState.THINKING);
    setThinkingStatus("Initializing...");

    // Create placeholder message for streaming
    const modelMsgId = (Date.now() + 1).toString();
    const modelMsg: Message = {
      id: modelMsgId,
      role: 'model',
      text: "",
      timestamp: Date.now(),
      groundingSources: [],
    };
    
    // We add the model message immediately, it will be populated via stream
    setMessages(prev => [...prev, modelMsg]);

    try {
      const imageForApi = options.image ? options.image.split(',')[1] : undefined;
      
      await generateResponseStream(
        text, 
        { ...options, image: imageForApi },
        (update: StreamUpdate) => {
           setMessages(prev => prev.map(m => {
             if (m.id === modelMsgId) {
               return {
                 ...m,
                 text: update.text !== undefined ? update.text : m.text,
                 groundingSources: update.sources ? update.sources : m.groundingSources,
                 clarification: update.clarification ? update.clarification : m.clarification
               };
             }
             return m;
           }));

           if (update.status) {
              setThinkingStatus(update.status);
              if (update.status === "completed") {
                 setAppState(AppState.IDLE);
              }
           }
        }
      );

    } catch (error) {
      console.error(error);
      setMessages(prev => prev.map(m => m.id === modelMsgId ? { ...m, text: "I encountered a disturbance in the network.", isError: true } : m));
      setAppState(AppState.IDLE);
    }
  };

  const handleClarificationSubmit = (msgId: string, selectedOption: string) => {
     const lastUserMsg = messages.slice().reverse().find(m => m.role === 'user');
     if (lastUserMsg) {
        handleSendMessage(lastUserMsg.text, { 
          useThinking: true, 
          useSearch: true, 
          clarificationContext: selectedOption 
        });
     }
  };

  const handleAudioInput = async (blob: Blob) => {
    initAudio();
    setAppState(AppState.THINKING);
    setThinkingStatus("Listening...");
    setActiveOptions({ useSearch: true, useThinking: false }); 
    
    try {
      const base64Audio = await blobToBase64(blob);
      setThinkingStatus("Transcribing...");
      const transcribedText = await transcribeAudio(base64Audio);
      if(transcribedText) {
         handleSendMessage(transcribedText, { useThinking: false, useSearch: true });
      } else {
        setAppState(AppState.IDLE);
      }
    } catch (error) {
        setAppState(AppState.IDLE);
    }
  };

  let visualMode: BackgroundMode = 'idle';
  if (appState === AppState.THINKING) {
     visualMode = activeOptions.useThinking ? 'thinking' : 'searching';
  } else if (isAudioPlaying) {
     visualMode = 'speaking';
  }

  return (
    <div className="relative h-screen w-full flex overflow-hidden font-sans bg-black">
      
      {/* Background */}
      <BackgroundMesh mode={visualMode} />

      {/* Settings Button */}
      <div className="absolute top-4 right-4 z-40">
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="p-3 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all hover:rotate-90 duration-500 shadow-lg"
        >
          <i className="fa-solid fa-gear text-lg"></i>
        </button>
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
      />

      {/* Content Container (Simplified, no sidebar shifting) */}
      <div className="flex-1 flex flex-col h-full relative z-10 min-w-0">
          <div className="flex-1 overflow-hidden relative">
            {messages.length === 0 && appState === AppState.IDLE ? (
               <WelcomeScreen onSuggestionClick={handleSendMessage} />
            ) : (
               <MessageList 
                 messages={messages} 
                 onPlayAudio={handleAudioTrigger}
                 onClarificationSubmit={handleClarificationSubmit}
                 isThinking={appState === AppState.THINKING}
                 thinkingStatus={thinkingStatus}
               />
            )}
          </div>

          <div className="w-full flex justify-center pb-8 pt-4 pointer-events-none absolute bottom-0">
             <div className="pointer-events-auto w-full flex justify-center px-4">
                 <InputBar 
                     appState={appState} 
                     onSendMessage={handleSendMessage}
                     onAudioInput={handleAudioInput}
                 />
             </div>
          </div>
      </div>

      {/* Minimalist Orb Player */}
      <AnimatePresence>
        {audioQueue.length > 0 && (
          <AudioPlayer 
             queue={audioQueue}
             currentChunkId={currentChunkId}
             isPlaying={isAudioPlaying}
             isBuffering={isBuffering}
             onTogglePlay={togglePlayPause}
             analyserNode={analyserRef.current}
             currentProgress={audioProgress}
          />
        )}
      </AnimatePresence>

    </div>
  );
}

export default App;