import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StoryManifest } from '../types';
import { generateImage, generateSpeech, getVoiceForMood } from '../services/geminiService';
import { startAtmosphere, stopAtmosphere, decode, decodeAudioData, AtmosphereController } from '../services/audioUtils';
import AudioContextManager from '../services/audioContext';
import SmartWidget from './SmartWidget';
import StatsWidget from './StatsWidget';

interface CinematicStoryCardProps {
  manifest: StoryManifest;
}

// 1. ROBUST VALIDATION: Prevents "Blank Card" syndrome
const validateManifest = (manifest: any): string | null => {
  if (!manifest) return "Story data is missing.";
  if (!manifest.title) return "Story title is missing.";
  if (!manifest.chapters || !Array.isArray(manifest.chapters) || manifest.chapters.length === 0) {
    return "Story script is empty.";
  }
  return null;
};

// Helper: Procedural Background if Image Gen fails
const getMoodGradient = (mood: string) => {
    switch(mood) {
        case 'heroic': return 'linear-gradient(to bottom right, #b91c1c, #450a0a)'; // Red
        case 'energetic': return 'linear-gradient(to bottom right, #d97706, #78350f)'; // Amber
        case 'mysterious': return 'linear-gradient(to bottom right, #4338ca, #1e1b4b)'; // Indigo
        case 'peaceful': return 'linear-gradient(to bottom right, #059669, #064e3b)'; // Emerald
        default: return 'linear-gradient(to bottom right, #0e7490, #164e63)'; // Cyan
    }
};

const CinematicStoryCard: React.FC<CinematicStoryCardProps> = ({ manifest }) => {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [loadingText, setLoadingText] = useState("Director is planning shots...");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Asset Stores
  const audioAssets = useRef<Map<string, AudioBuffer>>(new Map());
  const imageAssets = useRef<Map<string, string>>(new Map());
  
  // Controllers
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const atmosphereCtrlRef = useRef<AtmosphereController | null>(null);

  // --- PHASE 1: PRE-PRODUCTION (Asset Generation) ---
  useEffect(() => {
    let isMounted = true;
    setError(null);

    const validationError = validateManifest(manifest);
    if (validationError) {
        if(isMounted) { setError(validationError); setIsReady(true); }
        return;
    }

    const prepareAssets = async () => {
        let completed = 0;
        // Estimate tasks: 1 image + 1 audio per chapter
        const totalTasks = manifest.chapters.length * 2; 
        
        const updateStatus = (pct: number, text: string) => {
            if (!isMounted) return;
            setLoadingProgress(Math.min(pct, 99));
            setLoadingText(text);
        };

        const ctx = AudioContextManager.getContext();

        // Process chapters in parallel to speed up "Pre-Production"
        await Promise.all(manifest.chapters.map(async (chapter, idx) => {
             
             // A. Visuals
             try {
                if (chapter.visualPrompt) {
                    // Enrich prompt with subject context
                    const imgPrompt = `Cinematic shot, ${chapter.visualPrompt}. Context: ${manifest.subjectName}. Mood: ${chapter.mood}. 8k resolution, highly detailed.`;
                    
                    // Use standard model for speed/reliability in this demo
                    const imgUrl = await generateImage(imgPrompt, 'landscape', false);
                    
                    if (isMounted && imgUrl) {
                        imageAssets.current.set(chapter.id, imgUrl);
                        if (idx === 0) setCoverImage(imgUrl); // Prefer first chapter as cover
                    }
                }
             } catch(e) { console.warn(`Scene ${idx} visual failed`, e); }
             
             completed++;
             updateStatus((completed/totalTasks)*100, `Rendering Scene: ${chapter.title}`);

             // B. Audio (Vocals)
             try {
                 const voice = getVoiceForMood(chapter.mood);
                 const audioBase64 = await generateSpeech(chapter.narrative, voice);
                 
                 if (isMounted && audioBase64) {
                    const bytes = decode(audioBase64);
                    const buffer = await decodeAudioData(bytes, ctx, 24000, 1);
                    audioAssets.current.set(chapter.id, buffer);
                 }
             } catch (e) { console.warn(`Scene ${idx} audio failed`, e); }
             
             completed++;
             updateStatus((completed/totalTasks)*100, `Recording Voiceover: ${chapter.title}`);
        }));

        if (isMounted) {
            // Fallback: If chapter 1 image failed, try to find ANY image for cover
            if (!coverImage) {
                const anyImg = Array.from(imageAssets.current.values())[0];
                if (anyImg) setCoverImage(anyImg);
            }
            setLoadingProgress(100);
            setIsReady(true);
        }
    };

    prepareAssets();
    
    // Cleanup on unmount
    return () => {
        isMounted = false;
        if(atmosphereCtrlRef.current) atmosphereCtrlRef.current.stop();
        if(sourceNodeRef.current) try { sourceNodeRef.current.stop(); } catch(e) {}
    };
  }, [manifest]);

  // --- PHASE 2: PLAYBACK ENGINE ---
  const playChapter = async (index: number) => {
      const chapter = manifest.chapters[index];
      const ctx = AudioContextManager.getContext();
      
      // 1. Cleanup Previous Voice
      if (sourceNodeRef.current) {
          try { sourceNodeRef.current.stop(); } catch(e) {}
      }
      
      // 2. Manage Atmosphere (Layer 1)
      // Initialize atmosphere if not running, or if mood changes significantly (optional logic)
      if (!atmosphereCtrlRef.current) {
          atmosphereCtrlRef.current = startAtmosphere(chapter.mood);
      }
      
      // 3. AUTO-DUCKING: Lower background music volume for voice
      atmosphereCtrlRef.current.duck();

      // 4. Play Voice (Layer 2)
      const buffer = audioAssets.current.get(chapter.id);
      
      if (buffer) {
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          
          source.onended = () => {
              // 5. AUTO-LIFT: Raise background music volume when voice ends
              if (atmosphereCtrlRef.current) atmosphereCtrlRef.current.lift();

              // 6. Transition Logic (Wait 2s for music swell, then next chapter)
              setTimeout(() => {
                  if (index < manifest.chapters.length - 1) {
                      setCurrentChapterIndex(index + 1);
                  } else {
                      // End of Story
                      if(atmosphereCtrlRef.current) atmosphereCtrlRef.current.stop();
                      atmosphereCtrlRef.current = null;
                      setIsPlaying(false);
                  }
              }, 2000);
          };

          source.start();
          sourceNodeRef.current = source;
      } else {
          // Fallback if audio gen failed: Just wait 5s reading time
          setTimeout(() => {
              if (index < manifest.chapters.length - 1) setCurrentChapterIndex(index + 1);
              else setIsPlaying(false);
          }, 5000);
      }
  };

  // React Effect to trigger playback when index changes
  useEffect(() => {
      if (currentChapterIndex >= 0 && isPlaying) {
          playChapter(currentChapterIndex);
      }
  }, [currentChapterIndex, isPlaying]);

  const handleStart = async () => {
      await AudioContextManager.getContext().resume();
      setCurrentChapterIndex(0);
      setIsPlaying(true);
  };

  // --- RENDER HELPERS ---
  const activeChapter = currentChapterIndex >= 0 ? manifest.chapters[currentChapterIndex] : null;
  const activeImage = activeChapter ? imageAssets.current.get(activeChapter.id) : null;

  return (
    <div className="w-full max-w-5xl mx-auto my-12 relative group rounded-[40px] overflow-hidden shadow-2xl bg-zinc-900 border border-white/10 min-h-[450px]">
        
        {/* --- ERROR STATE --- */}
        {error && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-8 bg-zinc-950/95 backdrop-blur-md">
                <i className="fa-solid fa-triangle-exclamation text-red-500 text-3xl mb-4 animate-pulse"></i>
                <h3 className="text-xl font-light text-white uppercase tracking-widest mb-2">Production Error</h3>
                <p className="text-red-300 font-mono text-xs max-w-md text-center">{error}</p>
            </div>
        )}

        {/* --- STATE 1: LOADING (Production Studio) --- */}
        {!isReady && !error && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-8 bg-zinc-950">
                <div className="absolute inset-0 opacity-20" style={{ 
                    backgroundImage: 'radial-gradient(circle, #22d3ee 1px, transparent 1px)', 
                    backgroundSize: '30px 30px' 
                }}></div>
                
                <div className="z-10 text-center space-y-6 max-w-md w-full">
                    <div className="relative mx-auto w-20 h-20">
                         <svg className="w-full h-full animate-spin text-cyan-500/20" viewBox="0 0 100 100">
                             <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="10 10" />
                         </svg>
                         <div className="absolute inset-0 flex items-center justify-center font-mono text-lg font-bold text-cyan-400">
                             {Math.round(loadingProgress)}%
                         </div>
                    </div>
                    
                    <div>
                        <h3 className="text-lg font-light text-white tracking-[0.2em] uppercase animate-pulse">In Production</h3>
                        <div className="text-cyan-400/80 text-[10px] mt-2 font-mono bg-cyan-900/10 py-1 px-3 rounded-full inline-block border border-cyan-500/10">
                           {loadingText}
                        </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div 
                           className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.8)]"
                           initial={{ width: 0 }}
                           animate={{ width: `${loadingProgress}%` }}
                           transition={{ duration: 0.3 }}
                        />
                    </div>
                </div>
            </div>
        )}

        {/* --- STATE 2: PREMIERE (Ready to Play) --- */}
        {isReady && !isPlaying && !error && (
             <div className="aspect-video w-full relative cursor-pointer" onClick={handleStart}>
                 {coverImage ? (
                    <img 
                        src={coverImage} 
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-[10s] ease-linear hover:scale-110 opacity-60"
                        alt="Cover"
                    />
                 ) : (
                    <div className="absolute inset-0 opacity-40" style={{ background: getMoodGradient('mysterious') }} />
                 )}
                 
                 <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                 
                 <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center z-20">
                     <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                     >
                        <div className="text-cyan-400 font-bold tracking-[0.3em] uppercase text-xs mb-4">Cinematic Experience</div>
                        <h2 className="text-4xl md:text-6xl font-serif-display text-white mb-8 tracking-tight drop-shadow-2xl max-w-4xl leading-tight">
                            {manifest.title}
                        </h2>
                        
                        <button 
                            className="px-10 py-4 bg-white text-black rounded-full font-bold text-lg hover:scale-105 hover:bg-cyan-50 transition-all flex items-center gap-3 mx-auto shadow-[0_0_40px_rgba(255,255,255,0.2)] mt-4"
                        >
                            <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center">
                                <i className="fa-solid fa-play text-xs ml-0.5"></i>
                            </div>
                            <span>Start Journey</span>
                        </button>
                     </motion.div>
                 </div>
             </div>
        )}

        {/* --- STATE 3: PLAYING (The Experience) --- */}
        {isPlaying && activeChapter && !error && (
             <div className="aspect-[16/9] w-full relative bg-black flex items-center justify-center overflow-hidden">
                 
                 {/* Visual Layer (Crossfade) */}
                 <AnimatePresence mode="popLayout">
                    <motion.div
                        key={activeChapter.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.5 }}
                        className="absolute inset-0"
                    >
                         {activeImage ? (
                             <img 
                                src={activeImage}
                                className="w-full h-full object-cover opacity-60 scale-105 animate-[kenburns_20s_ease-out_forwards]"
                                alt={activeChapter.title}
                             />
                         ) : (
                             // Procedural Fallback if image failed
                             <div className="w-full h-full opacity-60" style={{ background: getMoodGradient(activeChapter.mood) }} />
                         )}
                    </motion.div>
                 </AnimatePresence>

                 {/* Ken Burns CSS */}
                 <style>{`
                    @keyframes kenburns {
                        from { transform: scale(1.0); }
                        to { transform: scale(1.15); }
                    }
                 `}</style>
                 
                 {/* Widget Overlay (If Present) */}
                 {activeChapter.widget && (
                     <motion.div
                        key={activeChapter.id + "_widget"}
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        transition={{ duration: 0.8, delay: 0.5 }}
                        className="relative z-30 w-full max-w-4xl px-4 md:px-8"
                     >
                        {activeChapter.widget.type === 'STATS' ? (
                            <StatsWidget data={activeChapter.widget.data.data || []} title={activeChapter.title} />
                        ) : (
                            <SmartWidget type={activeChapter.widget.type} jsonString={JSON.stringify(activeChapter.widget.data)} />
                        )}
                     </motion.div>
                 )}

                 {/* Cinematic Bars */}
                 <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black to-transparent z-10" />
                 <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black via-black/90 to-transparent z-10" />
                 
                 {/* Narrative Subtitles */}
                 <div className="absolute bottom-10 left-0 right-0 p-8 z-20 flex flex-col items-center text-center">
                     <motion.div
                        key={activeChapter.id + "text"}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 1 }}
                        className="max-w-4xl"
                     >
                        {!activeChapter.widget ? (
                            <>
                                <h3 className="text-xl font-serif-display text-cyan-400 mb-3 tracking-wide drop-shadow-md">
                                    {activeChapter.title}
                                </h3>
                                <p className="text-xl md:text-2xl font-light text-white leading-relaxed drop-shadow-lg">
                                    "{activeChapter.narrative}"
                                </p>
                            </>
                        ) : (
                             <p className="text-base md:text-lg font-light text-zinc-300 italic bg-black/60 px-6 py-2 rounded-full inline-block backdrop-blur-md border border-white/5">
                                {activeChapter.narrative}
                             </p>
                        )}
                     </motion.div>
                 </div>

                 {/* Live Indicator */}
                 <div className="absolute top-6 right-6 z-20">
                     <div className="px-3 py-1 bg-red-950/40 backdrop-blur-md rounded-full border border-red-500/20 flex items-center gap-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]" />
                         <span className="text-[10px] uppercase text-red-200 font-bold tracking-widest">Live</span>
                     </div>
                 </div>
             </div>
        )}
    </div>
  );
};

export default CinematicStoryCard;