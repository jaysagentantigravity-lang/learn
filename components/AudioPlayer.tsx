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

  // Canvas State for Particles
  const particlesRef = useRef<Array<{x: number, y: number, vx: number, vy: number, life: number}>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserNode) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High DPI setup
    const dpr = window.devicePixelRatio || 1;
    const size = 120; // Internal canvas size
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      // Get Audio Data
      if (isPlaying && !isBuffering) {
        analyserNode.getByteFrequencyData(dataArray);
      } else {
        // Fallback or Decay when paused
        for(let i=0; i<bufferLength; i++) dataArray[i] = Math.max(0, dataArray[i] - 5);
      }

      // Clear
      ctx.clearRect(0, 0, size, size);
      
      const centerX = size / 2;
      const centerY = size / 2;
      
      // Calculate Average Volume (Intensity)
      let sum = 0;
      // Focus on lower-mid frequencies for "body" movement
      for (let i = 0; i < bufferLength / 2; i++) sum += dataArray[i];
      const avgVolume = sum / (bufferLength / 2);
      const pulseFactor = 1 + (avgVolume / 255) * 0.4; // Scale 1.0 to 1.4

      // --- LAYER 1: The Bio-Core (Organic Blob) ---
      ctx.beginPath();
      const baseRadius = 22;
      const points = 12; // Number of vertices for the blob
      
      // Rotate the blob slowly
      const time = Date.now() / 1000;
      const rotationOffset = time * 0.5;

      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2 + rotationOffset;
        // Map frequency data to vertex displacement
        // We wrap around the dataArray to match points
        const dataIndex = Math.floor((i / points) * (bufferLength / 4));
        const val = isPlaying && !isBuffering ? dataArray[dataIndex] : 0;
        const deformation = (val / 255) * 12;
        
        const r = (baseRadius + deformation) * (isBuffering ? 0.9 : pulseFactor);
        
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        
        if (i === 0) ctx.moveTo(x, y);
        else {
           // Smooth quadratic curves for organic feel
           // (Simplified to lineTo for performance, but good enough with high point count)
           ctx.lineTo(x, y);
        }
      }
      ctx.closePath();

      // Bio-Luminescent Gradient
      const gradient = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, 40);
      if (isBuffering) {
         gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
         gradient.addColorStop(0.5, 'rgba(6, 182, 212, 0.4)'); // Cyan
         gradient.addColorStop(1, 'rgba(6, 182, 212, 0)');
      } else {
         gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
         gradient.addColorStop(0.4, 'rgba(34, 211, 238, 0.6)'); // Cyan-400
         gradient.addColorStop(1, 'rgba(8, 145, 178, 0)'); // Cyan-700
      }
      
      ctx.fillStyle = gradient;
      ctx.fill();

      // Inner Core Glow
      ctx.beginPath();
      ctx.arc(centerX, centerY, 10 * pulseFactor, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fill();

      // --- LAYER 2: Progress Ring (Outer Orbit) ---
      if (!isBuffering) {
          ctx.beginPath();
          ctx.arc(centerX, centerY, 54, -Math.PI/2, (-Math.PI/2) + (Math.PI * 2 * currentProgress));
          ctx.strokeStyle = 'rgba(34, 211, 238, 0.5)';
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.stroke();
      }

      // --- LAYER 3: Particles (Dust) ---
      if (isPlaying && !isBuffering && avgVolume > 30) {
         // Emit new particles
         if (particlesRef.current.length < 20 && Math.random() > 0.7) {
            const angle = Math.random() * Math.PI * 2;
            const r = 25;
            particlesRef.current.push({
               x: centerX + Math.cos(angle) * r,
               y: centerY + Math.sin(angle) * r,
               vx: Math.cos(angle) * (Math.random() * 0.5 + 0.2),
               vy: Math.sin(angle) * (Math.random() * 0.5 + 0.2),
               life: 1.0
            });
         }
      }

      // Update & Draw Particles
      particlesRef.current.forEach((p, idx) => {
         p.x += p.vx;
         p.y += p.vy;
         p.life -= 0.02;
         
         ctx.beginPath();
         ctx.arc(p.x, p.y, 1.5 * p.life, 0, Math.PI * 2);
         ctx.fillStyle = `rgba(165, 243, 252, ${p.life})`;
         ctx.fill();
      });
      // Cleanup dead particles
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
           {/* Glass Container Background */}
           <div className="absolute inset-2 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl transition-transform duration-300 group-hover:scale-105 group-active:scale-95" />
           
           {/* The Bio-Canvas */}
           <canvas 
             ref={canvasRef} 
             style={{ width: '120px', height: '120px' }}
             className="relative z-10 pointer-events-none mix-blend-screen"
           />
           
           {/* Icon Overlay (Only visible on hover or pause) */}
           <div className={`absolute z-20 text-white transition-opacity duration-300 flex items-center justify-center ${isPlaying && !isBuffering ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
              {isBuffering ? (
                 <i className="fa-solid fa-spinner fa-spin text-xl text-cyan-200"></i>
              ) : isPlaying ? (
                 <i className="fa-solid fa-pause text-xl drop-shadow-[0_0_5px_rgba(0,0,0,0.8)]"></i>
              ) : (
                 <i className="fa-solid fa-play ml-1 text-xl drop-shadow-[0_0_5px_rgba(0,0,0,0.8)]"></i>
              )}
           </div>

           {/* Buffering Label Floating */}
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