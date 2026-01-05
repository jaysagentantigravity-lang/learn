import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StoryManifest } from '../types';
import { generateImage, generateSpeech, getVoiceForMood } from '../services/geminiService';
import { startAtmosphere, decode, decodeAudioData, AtmosphereController } from '../services/audioUtils';
import AudioContextManager from '../services/audioContext';
import SmartWidget from './SmartWidget';

interface CinematicStoryCardProps {
  manifest: StoryManifest;
}

// --- ENGINE STATE ---
type EngineState = 'INIT' | 'BUFFERING' | 'PLAYING' | 'ENDED' | 'ERROR';

// --- ASSET CACHE ---
interface ChapterAssets {
    audioBuffer: AudioBuffer | null;
    imageUrl: string | null;
    status: 'pending' | 'loading' | 'ready' | 'error';
}

const CinematicStoryCard: React.FC<CinematicStoryCardProps> = ({ manifest }) => {
  // Core State
  const [engineState, setEngineState] = useState<EngineState>('INIT');
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [playbackProgress, setPlaybackProgress] = useState(0); // 0 to 100
  const [bufferingMsg, setBufferingMsg] = useState("Initializing Director...");
  
  // Asset Management
  const assetsRef = useRef<Map<string, ChapterAssets>>(new Map());
  const [coverImage, setCoverImage] = useState<string | null>(null);

  // Audio Controllers
  const atmosphereRef = useRef<AtmosphereController | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const rafRef = useRef<number>(0);

  // --- 1. ASSET GENERATOR (JIT) ---
  const loadChapterAssets = useCallback(async (chapterIndex: number): Promise<boolean> => {
      // Boundary check
      if (chapterIndex >= manifest.chapters.length) return false;
      
      const chapter = manifest.chapters[chapterIndex];
      if (!chapter) return false;

      // Check cache first
      let entry = assetsRef.current.get(chapter.id);
      if (entry && (entry.status === 'ready' || entry.status === 'loading')) {
          return true; // Already processed/processing
      }

      // Initialize entry
      assetsRef.current.set(chapter.id, { audioBuffer: null, imageUrl: null, status: 'loading' });
      
      try {
        const ctx = AudioContextManager.getContext();
        
        // Audio is always specific to the chapter text
        const audioPromise = generateSpeech(chapter.narrative, getVoiceForMood(chapter.mood));

        // Image Optimization: Only generate 3 unique images, then cycle them (1,2,3, 1,2,3...)
        // This saves tokens/costs while testing.
        let imagePromise: Promise<string | null>;

        if (chapterIndex < 3) {
            // Generate new image for the first 3 chapters
            imagePromise = generateImage(chapter.visualPrompt + `, Context: ${manifest.subjectName}`, 'landscape', false);
        } else {
            // Reuse existing image from previous chapters (Modulo 3)
            // Since we play sequentially, the source chapter (0, 1, or 2) is guaranteed to be loaded
            const sourceIndex = chapterIndex % 3;
            const sourceId = manifest.chapters[sourceIndex]?.id;
            const sourceAssets = assetsRef.current.get(sourceId);
            
            // Resolve immediately with the cached URL
            imagePromise = Promise.resolve(sourceAssets?.imageUrl || null);
        }
        
        // Parallel Fetch
        const [audioResult, imageResult] = await Promise.allSettled([
            audioPromise,
            imagePromise
        ]);

        let audioBuffer: AudioBuffer | null = null;
        let imageUrl: string | null = null;

        if (audioResult.status === 'fulfilled' && audioResult.value) {
            const bytes = decode(audioResult.value);
            audioBuffer = await decodeAudioData(bytes, ctx, 24000, 1);
        }

        if (imageResult.status === 'fulfilled' && imageResult.value) {
            imageUrl = imageResult.value;
            // If this is the first chapter, set it as cover
            if (chapterIndex === 0 && imageUrl) setCoverImage(imageUrl);
        }

        assetsRef.current.set(chapter.id, { 
            audioBuffer, 
            imageUrl, 
            status: 'ready' 
        });
        
        return true;

      } catch (e) {
        console.error(`Failed to load chapter ${chapterIndex}`, e);
        assetsRef.current.set(chapter.id, { audioBuffer: null, imageUrl: null, status: 'error' });
        return false;
      }
  }, [manifest]);

  // --- 2. INITIALIZATION ---
  useEffect(() => {
    // Start by loading the first chapter immediately
    if (engineState === 'INIT') {
        setBufferingMsg("Preparing Scene 1...");
        loadChapterAssets(0).then(() => {
            setEngineState('BUFFERING'); // Ready for user to click play
        });
    }
    
    // Strict Cleanup on Unmount
    return () => {
       stopAllAudio();
       cancelAnimationFrame(rafRef.current);
       if (atmosphereRef.current) {
           atmosphereRef.current.stop();
           atmosphereRef.current = null;
       }
    };
  }, []);

  const stopAllAudio = () => {
    if (sourceNodeRef.current) {
        try { sourceNodeRef.current.stop(); } catch(e) {}
        sourceNodeRef.current = null;
    }
    // Atmosphere is managed separately to allow cross-fades, but stopAllAudio is a hard stop
  };

  // --- 3. PLAYBACK ENGINE ---
  const playChapter = async (index: number) => {
    const chapter = manifest.chapters[index];
    const assets = assetsRef.current.get(chapter.id);

    if (!assets || assets.status !== 'ready') {
        // Fallback: If not ready, show buffering and wait a bit
        setEngineState('BUFFERING');
        setBufferingMsg(`Buffering Scene ${index + 1}...`);
        await loadChapterAssets(index);
        
        // Safety check to prevent infinite loops if asset loading fails permanently
        const retryAssets = assetsRef.current.get(chapter.id);
        if (retryAssets?.status === 'error') {
            handleChapterEnd(index); // Skip chapter if it fails
            return;
        }
        
        playChapter(index);
        return;
    }

    setEngineState('PLAYING');
    setCurrentChapterIndex(index);
    setPlaybackProgress(0);

    // A. Atmosphere (Music)
    if (!atmosphereRef.current) {
        atmosphereRef.current = startAtmosphere(chapter.mood);
    } else {
        // Transition mood if needed, or just keep playing
        atmosphereRef.current.duck(); 
    }

    // B. Voiceover
    const ctx = AudioContextManager.getContext();
    if (ctx.state === 'suspended') await ctx.resume();
    
    if (sourceNodeRef.current) try { sourceNodeRef.current.stop(); } catch(e) {}

    const duration = assets.audioBuffer ? assets.audioBuffer.duration : 5; // Default 5s if no audio
    const startTime = ctx.currentTime;

    if (assets.audioBuffer) {
        const source = ctx.createBufferSource();
        source.buffer = assets.audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => {
            handleChapterEnd(index);
        };
        source.start();
        sourceNodeRef.current = source;
    } else {
        // Silent fallback timer
        setTimeout(() => handleChapterEnd(index), duration * 1000);
    }

    // C. Progress Loop (Visual Indicator)
    const updateProgress = () => {
        const elapsed = ctx.currentTime - startTime;
        const pct = Math.min((elapsed / duration) * 100, 100);
        setPlaybackProgress(pct);
        if (pct < 100) rafRef.current = requestAnimationFrame(updateProgress);
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(updateProgress);

    // D. PREFETCH NEXT SCENE (Look-ahead)
    // While current plays, generate next
    if (index + 1 < manifest.chapters.length) {
        loadChapterAssets(index + 1);
    }
  };

  const handleChapterEnd = (completedIndex: number) => {
      cancelAnimationFrame(rafRef.current);
      setPlaybackProgress(100);

      // Lift music volume during transition
      if (atmosphereRef.current) atmosphereRef.current.lift();

      // Transition Delay (Cinematic pause)
      setTimeout(() => {
          if (completedIndex < manifest.chapters.length - 1) {
              playChapter(completedIndex + 1);
          } else {
              setEngineState('ENDED');
              stopAllAudio();
              if (atmosphereRef.current) atmosphereRef.current.stop();
          }
      }, 1500);
  };

  const handleStartPlayback = async () => {
      // CRITICAL: Explicitly resume audio context on user interaction
      // This unlocks audio on Chrome/Safari
      const ctx = AudioContextManager.getContext();
      if (ctx.state === 'suspended') {
          await ctx.resume();
      }
      
      playChapter(0);
  };

  // --- RENDERERS ---

  const renderCover = () => (
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black">
          {coverImage && (
             <motion.img 
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 0.6, scale: 1 }}
                transition={{ duration: 2 }}
                src={coverImage} 
                className="absolute inset-0 w-full h-full object-cover" 
             />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
          
          <div className="relative z-30 text-center px-8 w-full max-w-4xl">
              <h2 className="text-4xl md:text-6xl font-serif-display text-white mb-4 tracking-tight drop-shadow-2xl">
                  {manifest.title}
              </h2>
              <p className="text-zinc-300 mb-8 max-w-lg mx-auto line-clamp-2 leading-relaxed opacity-80">{manifest.chapters[0].narrative}</p>
              
              {engineState === 'INIT' ? (
                 <div className="flex items-center justify-center gap-3 text-cyan-400">
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                    <span className="text-xs uppercase tracking-widest">{bufferingMsg}</span>
                 </div>
              ) : (
                 <button 
                    onClick={handleStartPlayback}
                    className="px-10 py-4 bg-white text-black rounded-full font-bold hover:scale-105 transition-transform flex items-center gap-3 mx-auto shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:bg-zinc-100"
                 >
                    <i className="fa-solid fa-play"></i> Start Movie
                 </button>
              )}
          </div>
      </div>
  );

  const activeChapter = manifest.chapters[currentChapterIndex];
  const activeAssets = assetsRef.current.get(activeChapter?.id);

  return (
    <div className="w-full max-w-5xl mx-auto my-12 relative group rounded-[40px] overflow-hidden shadow-2xl bg-zinc-900 border border-white/10 aspect-[16/9] flex flex-col">
        
        {/* VIEWPORT */}
        <div className="relative flex-1 w-full h-full overflow-hidden bg-black">
            
            {/* 1. COVER / LOADING STATE */}
            <AnimatePresence>
                {(engineState === 'INIT' || engineState === 'BUFFERING' && currentChapterIndex === 0) && (
                    <motion.div exit={{ opacity: 0 }} className="absolute inset-0 z-50">
                        {renderCover()}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 2. MAIN PLAYER */}
            <AnimatePresence mode="popLayout">
                {engineState === 'PLAYING' && activeChapter && (
                    <motion.div
                        key={activeChapter.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1 }}
                        className="absolute inset-0"
                    >
                        {/* Image Layer */}
                        {activeAssets?.imageUrl ? (
                             <motion.img 
                                src={activeAssets.imageUrl}
                                initial={{ scale: 1 }}
                                animate={{ scale: 1.1 }}
                                transition={{ duration: 20, ease: "linear" }}
                                className="w-full h-full object-cover opacity-80"
                             />
                        ) : (
                             // Fallback Gradient
                             <div className={`w-full h-full opacity-50 bg-gradient-to-br from-gray-900 to-black`} />
                        )}

                        {/* Widget Overlay */}
                        {activeChapter.widget && (
                             <div className="absolute inset-0 flex items-center justify-center z-30 p-8 pt-20 pointer-events-none">
                                 <motion.div
                                    initial={{ y: 50, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="w-full max-w-3xl pointer-events-auto"
                                 >
                                    <SmartWidget type={activeChapter.widget.type} jsonString={JSON.stringify(activeChapter.widget.data)} />
                                 </motion.div>
                             </div>
                        )}

                        {/* Text Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 p-8 pb-12 bg-gradient-to-t from-black via-black/80 to-transparent z-40 flex flex-col items-center text-center">
                            <motion.h3 
                                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                                className="text-cyan-400 font-serif-display text-2xl mb-2 tracking-wide"
                            >
                                {activeChapter.title}
                            </motion.h3>
                            <motion.p 
                                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
                                className="text-white/90 text-lg md:text-xl font-light leading-relaxed max-w-4xl drop-shadow-md text-balance"
                            >
                                {activeChapter.narrative}
                            </motion.p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 3. END SCREEN */}
            {engineState === 'ENDED' && (
                <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center text-center p-8">
                    <h2 className="text-3xl text-white font-serif-display mb-6">Fin.</h2>
                    <button 
                        onClick={() => {
                            setEngineState('BUFFERING');
                            setCurrentChapterIndex(0);
                            handleStartPlayback();
                        }}
                        className="text-zinc-400 hover:text-white flex items-center gap-2 transition-colors border border-white/10 hover:bg-white/10 px-6 py-2 rounded-full"
                    >
                        <i className="fa-solid fa-rotate-right"></i> Replay
                    </button>
                </div>
            )}
        </div>

        {/* PROGRESS BAR */}
        <div className="h-1 w-full bg-zinc-800 relative z-50">
            <motion.div 
               className="h-full bg-cyan-500 shadow-[0_0_10px_#22d3ee]"
               style={{ width: `${playbackProgress}%` }}
               transition={{ duration: 0.1, ease: "linear" }}
            />
        </div>
    </div>
  );
};

export default CinematicStoryCard;