import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import BackgroundMesh, { BackgroundMode } from './components/BackgroundMesh';
import InputBar from './components/InputBar';
import MessageList from './components/MessageList';
import AudioPlayer from './components/AudioPlayer';
import WelcomeScreen from './components/WelcomeScreen';
import SettingsModal from './components/SettingsModal';
import HistoryPanel from './components/HistoryPanel';
import { generateResponseStream, generateSpeech, transcribeAudio, generateStoryModeSummary, StreamUpdate } from './services/geminiService';
import { splitTextIntoChunks, decode, decodeAudioData, playSystemSound, blobToBase64 } from './services/audioUtils';
import AudioContextManager from './services/audioContext';
import { storageService, ChatSession } from './services/storageService';
import { Message, AppState, ProcessingOptions, AudioChunk, UserSettings, AudioMode } from './types';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [thinkingStatus, setThinkingStatus] = useState<string>("Processing...");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Initialize settings from LocalStorage or Default
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const saved = localStorage.getItem('lumina_settings');
      return saved ? JSON.parse(saved) : { voiceName: 'Kore' };
    } catch (e) {
      return { voiceName: 'Kore' };
    }
  });

  // Persist settings changes
  useEffect(() => {
    localStorage.setItem('lumina_settings', JSON.stringify(settings));
  }, [settings]);
  
  // History & Session State
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>(Date.now().toString());
  
  // User Menu State
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [activeOptions, setActiveOptions] = useState<ProcessingOptions>({ useThinking: false, useSearch: true, mode: 'explanatory' });

  // --- CONTROL STATE ---
  const abortControllerRef = useRef<AbortController | null>(null);

  // --- STREAM SMOOTHING STATE ---
  const streamTargetRef = useRef<string>(""); 
  const streamDisplayedRef = useRef<string>(""); 
  const streamingMessageIdRef = useRef<string | null>(null);
  const streamLoopRef = useRef<number>(0);

  // Audio Engine State
  const [audioQueue, setAudioQueue] = useState<AudioChunk[]>([]);
  const audioQueueRef = useRef<AudioChunk[]>([]);
  
  const [currentChunkId, setCurrentChunkId] = useState<string | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0); 
  const [isBuffering, setIsBuffering] = useState(false);
  
  // Refs for Audio Logic - Unified Manager
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(0);
  const progressLoopRef = useRef<number>(0);
  const prefetchTriggeredRef = useRef<boolean>(false);

  // CACHE & DEDUPLICATION
  const chunkFetchPromises = useRef<Map<string, Promise<string | null>>>(new Map());

  // Init Storage on Mount
  useEffect(() => {
    storageService.init();
  }, []);

  // Save Session Effect (Debounced)
  useEffect(() => {
    if (messages.length === 0) return;

    const timeout = setTimeout(() => {
        const title = messages[0].text.substring(0, 50) + (messages[0].text.length > 50 ? '...' : '');
        const preview = messages[messages.length - 1].text.substring(0, 100);
        
        storageService.saveSession({
            id: currentSessionId,
            timestamp: Date.now(),
            title: title,
            preview: preview,
            messages: messages
        });
    }, 1000); // Save 1s after last update

    return () => clearTimeout(timeout);
  }, [messages, currentSessionId]);

  // Sync Ref with State
  useEffect(() => {
    audioQueueRef.current = audioQueue;
  }, [audioQueue]);

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

  // Initialize Audio Context (Single Source)
  const initAudio = () => {
    const ctx = AudioContextManager.getContext();
    if (!analyserRef.current) {
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64; 
      analyserRef.current = analyser;
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
        const distance = target.length - current.length;
        const charsToAdd = Math.max(1, Math.min(10, Math.ceil(distance / 5)));
        
        const nextSlice = target.substring(0, current.length + charsToAdd);
        streamDisplayedRef.current = nextSlice;

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

  // --- "Invisible Relay" Audio Engine Methods ---
  const loadChunkAudio = async (chunkId: string): Promise<string | null> => {
      const chunk = audioQueueRef.current.find(c => c.id === chunkId);
      if (!chunk) return null;

      if (chunk.status === 'ready' || chunk.status === 'played' || chunk.audioData) {
          return chunk.audioData;
      }

      if (chunkFetchPromises.current.has(chunkId)) {
          return chunkFetchPromises.current.get(chunkId)!;
      }
      
      const fetchPromise = (async () => {
         try {
            const audioData = await generateSpeech(chunk.text, settings.voiceName);
            if (audioData) {
                setAudioQueue(prev => prev.map(c => c.id === chunkId ? { ...c, status: 'ready', audioData } : c));
                return audioData;
            } else {
                setAudioQueue(prev => prev.map(c => c.id === chunkId ? { ...c, status: 'error' } : c));
                return null;
            }
         } catch (e) {
            console.error("Audio Fetch Error", e);
            setAudioQueue(prev => prev.map(c => c.id === chunkId ? { ...c, status: 'error' } : c));
            return null;
         } finally {
            chunkFetchPromises.current.delete(chunkId);
         }
      })();

      chunkFetchPromises.current.set(chunkId, fetchPromise);
      return fetchPromise;
  };

  const playChunk = async (chunkId: string) => {
    const chunk = audioQueueRef.current.find(c => c.id === chunkId);
    if (!chunk) return;

    setCurrentChunkId(chunkId);
    setIsBuffering(true);
    
    playSystemSound('thrum_start');
    
    const audioData = await loadChunkAudio(chunkId);
    
    playSystemSound('thrum_stop');
    
    if (!audioData) {
       setIsBuffering(false);
       handleNextChunk();
       return;
    }

    const ctx = AudioContextManager.getContext();
    if (!analyserRef.current) {
        setIsBuffering(false);
        return;
    }
    
    if (sourceNodeRef.current) {
       try { sourceNodeRef.current.stop(); } catch(e) {}
    }

    try {
      const audioBytes = decode(audioData);
      const audioBuffer = await decodeAudioData(audioBytes, ctx, 24000, 1);
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(analyserRef.current);
      analyserRef.current.connect(ctx.destination);
      
      source.onended = () => {
         setAudioQueue(prev => prev.map(c => c.id === chunkId ? { ...c, status: 'played' } : c));
         handleNextChunk();
      };
      
      playSystemSound('ping');

      setIsBuffering(false);
      source.start();
      
      sourceNodeRef.current = source;
      startTimeRef.current = ctx.currentTime;
      durationRef.current = audioBuffer.duration;
      prefetchTriggeredRef.current = false;
      setIsAudioPlaying(true);
      
      startProgressLoop();

    } catch (e) {
      console.error("Playback Error", e);
      setIsBuffering(false);
      handleNextChunk();
    }
  };

  const startProgressLoop = () => {
     cancelAnimationFrame(progressLoopRef.current);
     const ctx = AudioContextManager.getContext();

     const loop = () => {
        if (!isAudioPlaying || !sourceNodeRef.current) return;
        
        const elapsed = ctx.currentTime - startTimeRef.current;
        const progress = Math.min(elapsed / durationRef.current, 1);
        setAudioProgress(progress);

        if (progress > 0.15 && !prefetchTriggeredRef.current) {
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
     const currentId = currentChunkId; 
     const queue = audioQueueRef.current;
     
     const idx = queue.findIndex(c => c.id === currentId);
     if (idx !== -1 && idx < queue.length - 1) {
        const nextChunk = queue[idx + 1];
        if (nextChunk.status === 'pending' || nextChunk.status === 'error') {
           setAudioQueue(prev => prev.map(c => c.id === nextChunk.id ? { ...c, status: 'loading' } : c));
           loadChunkAudio(nextChunk.id);
        }
     }
  };

  const handleNextChunk = () => {
     const queue = audioQueueRef.current;
     const currentIdx = queue.findIndex(c => c.id === currentChunkId);
     if (currentIdx !== -1 && currentIdx < queue.length - 1) {
        playChunk(queue[currentIdx + 1].id);
     } else {
        stopAudio();
     }
  };

  const stopAudio = () => {
     if (sourceNodeRef.current) {
        try { sourceNodeRef.current.stop(); } catch(e) {}
     }
     playSystemSound('thrum_stop');
     setIsAudioPlaying(false);
     setAudioProgress(0);
     cancelAnimationFrame(progressLoopRef.current);
     setIsBuffering(false);
  };

  const togglePlayPause = () => {
     const ctx = AudioContextManager.getContext();
     if (isAudioPlaying) {
        ctx.suspend();
        setIsAudioPlaying(false);
     } else {
        ctx.resume();
        setIsAudioPlaying(true);
     }
  };

  const handleAudioTrigger = async (msg: Message, mode: AudioMode) => {
    initAudio();
    playSystemSound('thrum_start');

    stopAudio();
    setIsBuffering(true);
    setAudioQueue([]); 
    
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
    audioQueueRef.current = newQueue;
    
    playSystemSound('thrum_stop');

    if (newQueue.length > 0) {
       playChunk(newQueue[0].id);
    } else {
       setIsBuffering(false);
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setAppState(AppState.IDLE);
      setThinkingStatus("Stopped.");
      streamingMessageIdRef.current = null;
      stopAudio();
      setAudioQueue([]);
    }
  };

  const handleSendMessage = async (text: string, options: ProcessingOptions) => {
    initAudio();
    setActiveOptions(options);

    // If we were in history view, close it
    setShowHistory(false);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
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

    const modelMsgId = (Date.now() + 1).toString();
    const modelMsg: Message = {
      id: modelMsgId,
      role: 'model',
      text: "",
      timestamp: Date.now(),
      groundingSources: [],
      suggestedActions: [],
    };
    
    setMessages(prev => [...prev, modelMsg]);

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
           if (update.text !== undefined) {
             streamTargetRef.current = update.text;
           }

           setMessages(prev => prev.map(m => {
             if (m.id === modelMsgId) {
               return {
                 ...m,
                 groundingSources: update.sources ? update.sources : m.groundingSources,
                 clarification: update.clarification ? update.clarification : m.clarification,
                 suggestedActions: update.suggestedActions ? update.suggestedActions : m.suggestedActions
               };
             }
             return m;
           }));

           if (update.status) {
              setThinkingStatus(update.status);
              if (update.status === "completed") {
                 setAppState(AppState.IDLE);
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
          mode: 'learning',
          clarificationContext: selectedOption 
        });
     }
  };

  const handleAudioInput = async (blob: Blob) => {
    initAudio();
    setShowHistory(false);
    setAppState(AppState.THINKING);
    setThinkingStatus("Listening...");
    setActiveOptions({ useSearch: true, useThinking: false, mode: 'explanatory' }); 
    
    try {
      const base64Audio = await blobToBase64(blob);
      setThinkingStatus("Transcribing...");
      const transcribedText = await transcribeAudio(base64Audio);
      if(transcribedText) {
         handleSendMessage(transcribedText, { useThinking: false, useSearch: true, mode: 'explanatory' });
      } else {
        setAppState(AppState.IDLE);
      }
    } catch (error) {
        setAppState(AppState.IDLE);
        console.error(error);
    }
  };

  // --- HISTORY HANDLERS ---
  const handleToggleHistory = async () => {
      if (!showHistory) {
          // Opening History: Fetch optimized list (metadata only)
          const saved = await storageService.getSessions();
          setSessions(saved);
      }
      setShowHistory(!showHistory);
  };

  const handleLoadSession = async (sessionSummary: ChatSession) => {
      // FIX: Fetch full session details (including messages) from IDB on demand
      const fullSession = await storageService.getSession(sessionSummary.id);
      
      if (fullSession && fullSession.messages) {
          setMessages(fullSession.messages);
          setCurrentSessionId(fullSession.id);
          setShowHistory(false);
      } else {
          console.error("Failed to load full session details");
      }
  };

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      await storageService.deleteSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
  };
  
  const handleClearChat = () => {
     setMessages([]);
     setCurrentSessionId(Date.now().toString());
     setShowHistory(false);
  }

  // Determine Background Mode
  let bgMode: BackgroundMode = 'idle';
  if (appState === AppState.THINKING) {
    bgMode = activeOptions.useSearch ? 'searching' : 'thinking';
  } else if (appState === AppState.SPEAKING) {
    bgMode = 'speaking';
  }

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden text-white font-sans selection:bg-cyan-500/30 selection:text-cyan-100">
      
      {/* 1. Dynamic Background */}
      <BackgroundMesh mode={bgMode} />

      {/* 2. Top Bar (Settings / Clear) */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-50 pointer-events-none">
         <div className="pointer-events-auto">
             <button 
               onClick={handleClearChat}
               className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all border border-white/5 hover:border-white/20 text-zinc-400 hover:text-white"
               title="New Chat"
             >
                <i className="fa-solid fa-plus"></i>
             </button>
         </div>

         <div className="pointer-events-auto relative" ref={userMenuRef}>
            <button 
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all border border-white/5 hover:border-white/20 text-zinc-400 hover:text-white"
            >
              <i className="fa-solid fa-bars"></i>
            </button>
            <AnimatePresence>
              {isUserMenuOpen && (
                <motion.div 
                   initial={{ opacity: 0, scale: 0.9, y: -10 }}
                   animate={{ opacity: 1, scale: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.9, y: -10 }}
                   className="absolute right-0 top-12 w-48 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden py-1"
                >
                   <button 
                     onClick={() => { setIsSettingsOpen(true); setIsUserMenuOpen(false); }}
                     className="w-full text-left px-4 py-3 text-sm text-zinc-300 hover:text-white hover:bg-white/10 flex items-center gap-3"
                   >
                     <i className="fa-solid fa-sliders w-4 text-center"></i> Settings
                   </button>
                   <button 
                     onClick={() => { window.open('https://ai.google.dev', '_blank'); setIsUserMenuOpen(false); }}
                     className="w-full text-left px-4 py-3 text-sm text-zinc-300 hover:text-white hover:bg-white/10 flex items-center gap-3"
                   >
                     <i className="fa-brands fa-google w-4 text-center"></i> About Gemini
                   </button>
                </motion.div>
              )}
            </AnimatePresence>
         </div>
      </div>

      {/* 3. Main Content Area */}
      <div className="flex-1 relative flex flex-col min-h-0">
         <AnimatePresence mode="wait">
            {showHistory ? (
                <motion.div 
                    key="history"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="flex-1 min-h-0"
                >
                    <HistoryPanel 
                        sessions={sessions}
                        onLoadSession={handleLoadSession}
                        onDeleteSession={handleDeleteSession}
                        onClose={() => setShowHistory(false)}
                    />
                </motion.div>
            ) : messages.length === 0 ? (
                <motion.div
                    key="welcome"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex-1 min-h-0"
                >
                    <WelcomeScreen onSuggestionClick={(txt, opts) => handleSendMessage(txt, opts)} />
                </motion.div>
            ) : (
                <motion.div
                    key="chat"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 min-h-0 relative"
                >
                    <MessageList 
                        messages={messages} 
                        onPlayAudio={handleAudioTrigger}
                        onClarificationSubmit={handleClarificationSubmit}
                        onSuggestionClick={(txt) => handleSendMessage(txt, { useThinking: false, useSearch: true, mode: 'explanatory' })}
                        isThinking={appState === AppState.THINKING}
                        thinkingStatus={thinkingStatus}
                    />
                </motion.div>
            )}
         </AnimatePresence>
      </div>

      {/* 4. Input Area (Fixed Bottom) */}
      <div className="flex-none z-40 w-full flex justify-center bg-gradient-to-t from-black via-black/80 to-transparent pt-10">
         <InputBar 
            appState={appState}
            onSendMessage={handleSendMessage}
            onAudioInput={handleAudioInput}
            onStop={handleStopGeneration}
            onToggleHistory={handleToggleHistory}
            isHistoryOpen={showHistory}
         />
      </div>

      {/* 5. Overlays */}
      <SettingsModal 
         isOpen={isSettingsOpen} 
         onClose={() => setIsSettingsOpen(false)}
         settings={settings}
         onUpdateSettings={setSettings}
      />

      <AnimatePresence>
         {(isAudioPlaying || isBuffering) && (
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