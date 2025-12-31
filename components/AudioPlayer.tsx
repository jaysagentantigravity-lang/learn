import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AudioChunk } from '../types';

interface AudioPlayerProps {
  queue: AudioChunk[];
  currentChunkId: string | null;
  isPlaying: boolean;
  isBuffering: boolean;
  onTogglePlay: () => void;
  analyserNode: AnalyserNode | null;
  currentProgress: number; // 0 to 1
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ 
  isPlaying, 
  isBuffering, 
  onTogglePlay, 
  analyserNode,
  currentProgress
}) => {
  const [amplitude, setAmplitude] = useState(0);
  const animationFrameRef = useRef<number>(0);
  
  // Amplitude loop for glow effect
  useEffect(() => {
    if (!analyserNode || !isPlaying) {
        setAmplitude(0);
        return;
    }

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkAmplitude = () => {
      analyserNode.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const avg = sum / bufferLength;
      setAmplitude(avg); // 0 to 255 roughly

      animationFrameRef.current = requestAnimationFrame(checkAmplitude);
    };

    checkAmplitude();

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [analyserNode, isPlaying]);

  // Visual Props
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (currentProgress * circumference);
  
  // Glow Intensity based on amplitude (0-255) -> 0px to 30px
  const glowSize = Math.max(10, amplitude / 5); 

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      drag
      dragConstraints={{ left: 0, right: 0, top: -500, bottom: 0 }}
      dragElastic={0.2}
      className="fixed bottom-8 right-8 z-50 cursor-grab active:cursor-grabbing"
    >
      <div className="relative group">
         {/* Glow Layer */}
         <motion.div 
           className="absolute inset-0 rounded-full bg-cyan-500/30 blur-md"
           animate={{ 
             boxShadow: isPlaying ? `0 0 ${glowSize}px 2px rgba(34, 211, 238, 0.6)` : '0 0 0px 0px rgba(0,0,0,0)' 
           }}
           transition={{ type: "tween", ease: "linear", duration: 0.1 }}
         />

         {/* The Orb */}
         <button 
           onClick={onTogglePlay}
           className="relative w-16 h-16 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-2xl transition-transform active:scale-95 group-hover:scale-105 overflow-hidden"
         >
            {/* SVG Progress Ring */}
            <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
              <circle
                cx="32"
                cy="32"
                r={radius}
                fill="none"
                strokeWidth="2"
                className="stroke-white/5"
              />
              
              {isBuffering ? (
                // Loading Spinner Ring
                <circle
                  cx="32"
                  cy="32"
                  r={radius}
                  fill="none"
                  strokeWidth="2"
                  className="stroke-zinc-500 origin-center animate-spin-slow"
                  strokeDasharray={`${circumference * 0.25} ${circumference * 0.75}`}
                />
              ) : (
                // Progress Ring
                <circle
                  cx="32"
                  cy="32"
                  r={radius}
                  fill="none"
                  strokeWidth="2"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="stroke-cyan-400 transition-[stroke-dashoffset] duration-200 ease-linear"
                />
              )}
            </svg>

            {/* Icon Center */}
            <div className="relative z-10 text-white group-hover:text-cyan-200 transition-colors text-xl">
               {isBuffering ? (
                 <i className="fa-solid fa-circle-notch animate-spin text-zinc-400"></i>
               ) : isPlaying ? (
                 <i className="fa-solid fa-pause"></i>
               ) : (
                 <i className="fa-solid fa-play ml-1"></i>
               )}
            </div>
         </button>
      </div>
    </motion.div>
  );
};

export default AudioPlayer;