import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
  
  // User Menu State
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [activeOptions, setActiveOptions] = useState<ProcessingOptions>({ useThinking: false, useSearch: true });

  // --- CONTROL STATE ---
  const abortControllerRef = useRef<AbortController | null>(null);

  // --- STREAM SMOOTHING STATE ---
  // The 'target' text that the model has generated so far (raw from network)
  const streamTargetRef = useRef<string>(""); 
  // The text currently displayed in the UI
  const streamDisplayedRef = useRef<string>(""); 
  // The ID of the message currently being streamed
  const streamingMessageIdRef = useRef<string | null>(null);
  // Animation frame reference
  const streamLoopRef = useRef<number>(0);

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

  // Click outside listener for user menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // --- STREAM SMOOTHING LOOP ---
  useEffect(() => {
    const loop = () => {
      if (!streamingMessageIdRef.current) {
        streamLoopRef.current = requestAnimationFrame(loop);
        return;
      }

      const target = streamTargetRef.current;
      const current = streamDisplayedRef.current;

      if (current.length < target.length) {
        // Determine typing speed based on lag
        const distance = target.length - current.length;
        // If far behind (e.g. large chunk arrived), speed up. If close, slow down for effect.
        // Min 1 char, Max 10 chars per frame
        const charsToAdd = Math.max(1, Math.min(10, Math.ceil(distance / 5)));
        
        const nextSlice = target.substring(0, current.length + charsToAdd);
        streamDisplayedRef.current = nextSlice;

        // Update React State
        setMessages(prev => prev.map(m => {
          if (m.id === streamingMessageIdRef.current) {
            return { ...m, text: nextSlice };
          }
          return m;
        }));
      }

      streamLoopRef.current = requestAnimationFrame(loop);
    };

    streamLoopRef.current = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(streamLoopRef.current);
  }, []);


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
    
    // Start Loading Loop Sound
    if (audioContextRef.current) playSystemSound('thrum_start', audioContextRef.current);
    
    // Ensure data is ready
    let audioData = chunk.audioData;
    if (!audioData) {
       audioData = await loadChunkAudio(chunk);
    }
    
    // Stop Loading Loop Sound
    if (audioContextRef.current) playSystemSound('thrum_stop', audioContextRef.current);
    
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
      
      // Play 'Ping' Ready Sound
      playSystemSound('ping', audioContextRef.current);

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
     if (audioContextRef.current) playSystemSound('thrum_stop', audioContextRef.current);
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
    if(audioContextRef.current) playSystemSound('thrum_start', audioContextRef.current);

    stopAudio();
    setIsBuffering(true);
    setAudioQueue([{ id: 'init', text: 'init', audioData: null, status: 'pending' }]); 
    setCurrentChunkId('init');

    let textToRead = msg.text;
    if (mode === 'story') {
       textToRead = await generateStoryModeSummary(msg.text);
    }

    const chunks = splitTextIntoChunks(textToRead);
    const newQueue: AudioChunk[] = chunks.map((text, i) => ({
       id: `${msg.id}_${mode}_part_${i}`,
       text,
       audioData: null,
       status: 'pending'
    }));

    setAudioQueue(newQueue);
    
    if(audioContextRef.current) playSystemSound('thrum_stop', audioContextRef.current);

    if (newQueue.length > 0) {
       playChunk(newQueue[0].id);
    }
  };


  // --- Main App Logic ---

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setAppState(AppState.IDLE);
      setThinkingStatus("Stopped.");
      // Force text sync if stopped mid-stream
      streamingMessageIdRef.current = null;
    }
  };

  const handleSendMessage = async (text: string, options: ProcessingOptions) => {
    initAudio();
    setActiveOptions(options);

    // Cancel previous
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    // New Controller
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const history = [...messages]; 

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
    
    setMessages(prev => [...prev, modelMsg]);

    // Initialize Streaming Refs
    streamingMessageIdRef.current = modelMsgId;
    streamTargetRef.current = "";
    streamDisplayedRef.current = "";

    try {
      const imageForApi = options.image ? options.image.split(',')[1] : undefined;
      
      await generateResponseStream(
        text, 
        history,
        { ...options, image: imageForApi },
        (update: StreamUpdate) => {
           // We ONLY update the message structure (clarifications, sources) directly.
           // Text is routed through the smoothing buffer.
           
           if (update.text !== undefined) {
             // API gives accumulated text. Update target.
             streamTargetRef.current = update.text;
           }

           setMessages(prev => prev.map(m => {
             if (m.id === modelMsgId) {
               return {
                 ...m,
                 // We do NOT update 'text' here, the loop does it.
                 // Unless the update provides NO text (e.g. just sources), then we keep existing.
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
                 // Ensure final text is fully synced (snap to end)
                 streamDisplayedRef.current = streamTargetRef.current;
                 setMessages(prev => prev.map(m => m.id === modelMsgId ? { ...m, text: streamTargetRef.current } : m));
                 streamingMessageIdRef.current = null;
                 abortControllerRef.current = null;
              }
           }
        },
        abortController.signal
      );

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error(error);
        setMessages(prev => prev.map(m => m.id === modelMsgId ? { ...m, text: "I encountered a disturbance in the network.", isError: true } : m));
      }
      setAppState(AppState.IDLE);
      streamingMessageIdRef.current = null;
      abortControllerRef.current = null;
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

  const handleSettingsClick = () => {
    setIsUserMenuOpen(false);
    setIsSettingsOpen(true);
  };

  const handleSubscriptionClick = () => {
    setIsUserMenuOpen(false);
    // Mock subscription action
    alert("Subscription management would open here.");
  };

  const handleLogoutClick = () => {
    setIsUserMenuOpen(false);
    // Mock logout action
    if(window.confirm("Are you sure you want to log out?")) {
        window.location.reload();
    }
  };

  return (
    <div className="relative h-screen w-full flex overflow-hidden font-sans bg-black">
      
      {/* Background */}
      <BackgroundMesh mode={visualMode} />

      {/* User Avatar & Dropdown */}
      <div className="absolute top-5 right-6 z-50" ref={userMenuRef}>
        <button 
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          className="relative w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all flex items-center justify-center overflow-hidden shadow-lg group"
        >
          {/* Mock Avatar Gradient */}
          <div className="absolute inset-0 bg-gradient-to-tr from-cyan-900 to-purple-900 opacity-80 group-hover:opacity-100 transition-opacity"></div>
          <span className="relative text-xs font-bold text-white z-10">JS</span>
        </button>

        <AnimatePresence>
          {isUserMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-3 w-48 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl"
            >
              <div className="py-1">
                <button onClick={handleSettingsClick} className="w-full text-left px-4 py-3 text-sm text-zinc-300 hover:text-white hover:bg-white/10 flex items-center gap-3 transition-colors">
                  <i className="fa-solid fa-gear text-xs w-4"></i> Settings
                </button>
                <button onClick={handleSubscriptionClick} className="w-full text-left px-4 py-3 text-sm text-zinc-300 hover:text-white hover:bg-white/10 flex items-center gap-3 transition-colors">
                  <i className="fa-solid fa-credit-card text-xs w-4"></i> Subscription
                </button>
                <div className="h-px bg-white/5 my-1 mx-2"></div>
                <button onClick={handleLogoutClick} className="w-full text-left px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-3 transition-colors">
                  <i className="fa-solid fa-right-from-bracket text-xs w-4"></i> Log out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
      />

      {/* Content Container */}
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

          <div className="w-full flex flex-col items-center justify-end pb-4 pt-4 pointer-events-none absolute bottom-0">
             <div className="pointer-events-auto w-full flex justify-center px-4">
                 <InputBar 
                     appState={appState} 
                     onSendMessage={handleSendMessage}
                     onAudioInput={handleAudioInput}
                     onStop={handleStopGeneration}
                 />
             </div>
             
             {/* Disclaimer */}
             <div className="mt-4 text-[10px] text-zinc-600 font-sans tracking-tight text-center px-4 opacity-60">
                Lumina may display inaccurate info, including about people, so double-check its responses.
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