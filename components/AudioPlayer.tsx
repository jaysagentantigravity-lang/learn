import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);

  // Optimized Particle System
  const particlesRef = useRef<Array<{x: number, y: number, vx: number, vy: number, life: number}>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserNode) return;

    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap DPR at 2 for performance
    const size = 120;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      // PERFORMANCE OPTIMIZATION: Stop loop if hidden or paused
      if (document.hidden) {
         animationRef.current = requestAnimationFrame(render);
         return;
      }

      if (isPlaying && !isBuffering) {
        analyserNode.getByteFrequencyData(dataArray);
      } else {
        // Simple decay without loop if mostly silent
        let hasSignal = false;
        for(let i=0; i<bufferLength; i++) {
            if(dataArray[i] > 5) { dataArray[i] -= 5; hasSignal = true; }
            else dataArray[i] = 0;
        }
        if(!hasSignal && !isBuffering) {
            ctx.clearRect(0, 0, size, size);
            // Throttle polling when idle
            setTimeout(() => { animationRef.current = requestAnimationFrame(render); }, 100);
            return;
        }
      }

      ctx.clearRect(0, 0, size, size);
      const centerX = size / 2;
      const centerY = size / 2;
      
      // Calculate Average Volume
      let sum = 0;
      for (let i = 0; i < bufferLength / 2; i++) sum += dataArray[i];
      const avgVolume = sum / (bufferLength / 2);
      const pulseFactor = 1 + (avgVolume / 255) * 0.4;

      // --- LAYER 1: The Bio-Core (Simplified) ---
      ctx.beginPath();
      const baseRadius = 22;
      const points = 12;
      const time = Date.now() / 1000;
      
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2 + (time * 0.5);
        const dataIndex = Math.floor((i / points) * (bufferLength / 4));
        const val = isPlaying && !isBuffering ? dataArray[dataIndex] : 0;
        const r = (baseRadius + ((val/255)*12)) * (isBuffering ? 0.9 : pulseFactor);
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      const gradient = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, 40);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      gradient.addColorStop(1, isBuffering ? 'rgba(6, 182, 212, 0)' : 'rgba(8, 145, 178, 0)');
      
      ctx.fillStyle = gradient;
      ctx.fill();

      // --- LAYER 2: Progress Ring ---
      if (!isBuffering && currentProgress > 0) {
          ctx.beginPath();
          ctx.arc(centerX, centerY, 54, -Math.PI/2, (-Math.PI/2) + (Math.PI * 2 * currentProgress));
          ctx.strokeStyle = 'rgba(34, 211, 238, 0.5)';
          ctx.lineWidth = 2;
          ctx.stroke();
      }

      // --- LAYER 3: Particles (Reduced Count) ---
      if (isPlaying && !isBuffering && avgVolume > 30 && Math.random() > 0.8 && particlesRef.current.length < 10) {
        const angle = Math.random() * Math.PI * 2;
        const r = 25;
        particlesRef.current.push({
            x: centerX + Math.cos(angle) * r,
            y: centerY + Math.sin(angle) * r,
            vx: Math.cos(angle) * 0.5,
            vy: Math.sin(angle) * 0.5,
            life: 1.0
        });
      }

      particlesRef.current.forEach((p) => {
         p.x += p.vx;
         p.y += p.vy;
         p.life -= 0.05; // Faster decay
         ctx.beginPath();
         ctx.arc(p.x, p.y, 1.5 * p.life, 0, Math.PI * 2);
         ctx.fillStyle = `rgba(165, 243, 252, ${p.life})`;
         ctx.fill();
      });
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationRef.current);
  }, [isPlaying, isBuffering, analyserNode, currentProgress]);


  return (
    <motion.div
      ref={containerRef}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      drag
      dragConstraints={{ left: -window.innerWidth + 100, right: 0, top: -window.innerHeight + 100, bottom: 0 }}
      dragElastic={0.1}
      whileDrag={{ scale: 1.1, cursor: "grabbing" }}
      className="fixed bottom-8 right-8 z-[100] cursor-grab touch-none"
    >
        <button 
           onClick={onTogglePlay}
           className="relative w-[100px] h-[100px] flex items-center justify-center focus:outline-none group"
        >
           <div className="absolute inset-2 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl transition-transform duration-300 group-hover:scale-105 group-active:scale-95" />
           
           <canvas 
             ref={canvasRef} 
             style={{ width: '120px', height: '120px' }}
             className="relative z-10 pointer-events-none mix-blend-screen"
           />
           
           <div className={`absolute z-20 text-white transition-opacity duration-300 flex items-center justify-center ${isPlaying && !isBuffering ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
              {isBuffering ? (
                 <i className="fa-solid fa-spinner fa-spin text-xl text-cyan-200"></i>
              ) : isPlaying ? (
                 <i className="fa-solid fa-pause text-xl drop-shadow-[0_0_5px_rgba(0,0,0,0.8)]"></i>
              ) : (
                 <i className="fa-solid fa-play ml-1 text-xl drop-shadow-[0_0_5px_rgba(0,0,0,0.8)]"></i>
              )}
           </div>

           <AnimatePresence>
             {isBuffering && (
               <motion.div
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: -90 }}
                 exit={{ opacity: 0, x: 20 }}
                 className="absolute right-0 pointer-events-none"
               >
                  <div className="bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-cyan-500/30 shadow-lg whitespace-nowrap">
                     <span className="text-[10px] text-cyan-400 font-mono uppercase tracking-wider animate-pulse">Initializing...</span>
                  </div>
               </motion.div>
             )}
           </AnimatePresence>
        </button>
    </motion.div>
  );
};

export default AudioPlayer;