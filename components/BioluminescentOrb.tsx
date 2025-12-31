import React, { useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { AppState } from '../types';

interface OrbProps {
  state: AppState;
  analyser?: AnalyserNode | null;
}

const BioluminescentOrb: React.FC<OrbProps> = ({ state, analyser }) => {
  const outerControls = useAnimation();
  const innerControls = useAnimation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  // Canvas visualizer for the "speaking" state
  useEffect(() => {
    if (state !== AppState.SPEAKING || !analyser || !canvasRef.current) {
        if(animationRef.current) cancelAnimationFrame(animationRef.current);
        // Clear canvas if stopping
        const canvas = canvasRef.current;
        if(canvas) {
            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
        return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 300;
    canvas.height = 300;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = 80;

      ctx.beginPath();
      // Create a reactive circle
      let average = 0;
      for(let i = 0; i < bufferLength; i++) {
          average += dataArray[i];
      }
      average = average / bufferLength;
      
      const pulse = (average / 255) * 40; 
      
      const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.5, centerX, centerY, radius + pulse);
      gradient.addColorStop(0, 'rgba(6, 182, 212, 0.8)'); // Cyan
      gradient.addColorStop(1, 'rgba(147, 51, 234, 0)'); // Purple fade

      ctx.fillStyle = gradient;
      ctx.arc(centerX, centerY, radius + pulse, 0, 2 * Math.PI);
      ctx.fill();

      // Draw subtle wave ring
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.arc(centerX, centerY, radius + pulse + 10, 0, 2 * Math.PI);
      ctx.stroke();

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if(animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [state, analyser]);


  // Orchestrate Animations based on State
  useEffect(() => {
    const sequence = async () => {
      if (state === AppState.IDLE || state === AppState.LISTENING) {
        // Breathing
        outerControls.start({
          scale: [1, 1.1, 1],
          rotate: [0, 10, -10, 0],
          opacity: 0.6,
          filter: "hue-rotate(0deg) blur(40px)",
          transition: { duration: 6, repeat: Infinity, ease: "easeInOut" }
        });
        innerControls.start({
          scale: [1, 0.9, 1],
          filter: "brightness(1)",
          transition: { duration: 6, repeat: Infinity, ease: "easeInOut" }
        });
      } else if (state === AppState.THINKING) {
        // Rapid Spin & Gold
        outerControls.start({
          rotate: 360,
          scale: [0.9, 1.1, 0.9],
          opacity: 0.8,
          filter: "hue-rotate(140deg) blur(30px)", // Shift cyan/purple towards Gold/Orange spectrum relatively
          transition: { duration: 1.5, repeat: Infinity, ease: "linear" }
        });
        innerControls.start({
          scale: [0.8, 1.2, 0.8],
          filter: "brightness(1.5)", // Brighter core
          transition: { duration: 0.5, repeat: Infinity, ease: "easeInOut" }
        });
      } else if (state === AppState.SPEAKING) {
        // Handled by Canvas mostly, but base glow stays
        outerControls.start({
            scale: 1,
            rotate: 0,
            opacity: 0.4,
            filter: "hue-rotate(0deg) blur(50px)",
            transition: { duration: 1 }
        });
      }
    };
    sequence();
  }, [state, outerControls, innerControls]);

  // Dynamic Colors
  // Base: Cyan-500 (#06b6d4) to Purple-600 (#9333ea)
  // Gold State achieved via filter hue-rotate or conditional styling
  const isThinking = state === AppState.THINKING;

  return (
    <div className="relative w-[400px] h-[400px] flex items-center justify-center pointer-events-none">
      
      {/* Background Ambient Glow (Static-ish) */}
      <div className={`absolute inset-0 bg-cyan-900/20 rounded-full blur-3xl transition-all duration-1000 ${isThinking ? 'bg-amber-700/30' : ''}`} />

      {/* Main Animated Blob */}
      <motion.div
        animate={outerControls}
        className={`absolute w-64 h-64 rounded-full mix-blend-screen blur-2xl
            ${isThinking 
                ? 'bg-gradient-to-tr from-yellow-400 via-orange-500 to-amber-600' 
                : 'bg-gradient-to-tr from-cyan-500 via-blue-500 to-purple-600'
            }
        `}
      />

      {/* Inner Core */}
      <motion.div
        animate={innerControls}
        className={`absolute w-32 h-32 rounded-full mix-blend-overlay blur-xl
            ${isThinking ? 'bg-white' : 'bg-cyan-200'}
        `}
      />

      {/* Visualizer Canvas Overlay */}
      <canvas 
        ref={canvasRef} 
        className={`absolute inset-0 z-10 transition-opacity duration-500 ${state === AppState.SPEAKING ? 'opacity-100' : 'opacity-0'}`}
      />
      
    </div>
  );
};

export default BioluminescentOrb;