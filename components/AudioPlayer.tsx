import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, RotateCw, X } from 'lucide-react';
import { Message } from '../types';

interface AudioPlayerProps {
  message: Message;
  onClose: () => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ message, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  // Simulate Buffering and Auto-play
  useEffect(() => {
    setIsLoading(true);
    setIsPlaying(false);
    setProgress(0);
    
    const bufferTimer = setTimeout(() => {
      setIsLoading(false);
      setIsPlaying(true);
    }, 1500);

    return () => clearTimeout(bufferTimer);
  }, [message.id]);

  // Simulate Progress
  useEffect(() => {
    let interval: number;
    if (isPlaying && !isLoading) {
      interval = window.setInterval(() => {
        setProgress((prev) => {
           if (prev >= 100) {
             setIsPlaying(false);
             return 0;
           }
           return prev + 0.5;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isLoading]);

  const handleSeek = (amount: number) => {
    setProgress((prev) => Math.min(100, Math.max(0, prev + amount)));
  };

  // Visualizer Bars Configuration
  const bars = Array.from({ length: 15 });

  return (
    <motion.div
      initial={{ height: 0, opacity: 0, scale: 0.95, y: -20 }}
      animate={{ height: "auto", opacity: 1, scale: 1, y: 0 }}
      exit={{ height: 0, opacity: 0, scale: 0.95, y: -20 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="w-80 bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl relative flex flex-col"
    >
      <div className="p-4 flex flex-col gap-5">
        
        {/* Header Section */}
        <div className="flex justify-between items-start">
          <div className="flex-1 pr-4">
            <h3 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-1 flex items-center gap-2">
              {isLoading ? (
                 <><span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"/> Buffering...</>
              ) : (
                 "Now Playing"
              )}
            </h3>
            <p className="text-xs text-zinc-400 line-clamp-1 font-medium">{message.text}</p>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Visualizer (Waveform) */}
        <div className="h-12 flex items-center justify-center gap-[3px]">
          {bars.map((_, i) => (
            <motion.div
              key={i}
              className={`w-1 rounded-full ${
                isLoading 
                  ? 'bg-zinc-600' 
                  : 'bg-gradient-to-t from-cyan-500 to-purple-600'
              }`}
              animate={
                isLoading 
                  ? { height: ["30%", "60%", "30%"], opacity: [0.5, 1, 0.5] }
                  : isPlaying 
                    ? { height: ["20%", `${Math.random() * 80 + 20}%`, "20%"] }
                    : { height: "20%" }
              }
              transition={{
                duration: isLoading ? 0.8 : 0.4,
                repeat: Infinity,
                repeatType: "reverse",
                delay: i * 0.05,
                ease: "easeInOut"
              }}
              style={{ minHeight: '4px' }}
            />
          ))}
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-center gap-6">
          <button 
            onClick={() => handleSeek(-5)} // Rewind 5s (approx 5% progress for demo)
            className="text-zinc-400 hover:text-cyan-400 transition-colors p-2 hover:bg-white/5 rounded-full"
            title="Rewind 5s"
          >
            <RotateCcw size={16} />
          </button>

          <button
            onClick={() => !isLoading && setIsPlaying(!isPlaying)}
            disabled={isLoading}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isLoading 
                ? 'bg-white/5 cursor-wait scale-95 opacity-50' 
                : 'bg-white hover:bg-cyan-50 shadow-lg shadow-cyan-500/20 hover:scale-105'
            }`}
          >
            {isPlaying ? (
              <Pause size={20} className="text-black fill-current" />
            ) : (
              <Play size={20} className="text-black fill-current ml-1" />
            )}
          </button>

          <button 
            onClick={() => handleSeek(5)} // Forward 5s
            className="text-zinc-400 hover:text-cyan-400 transition-colors p-2 hover:bg-white/5 rounded-full"
            title="Forward 5s"
          >
            <RotateCw size={16} />
          </button>
        </div>
      </div>

      {/* Progress Bar (Bottom Edge) */}
      <div className="w-full bg-white/5 h-[2px] mt-auto">
        <motion.div 
          className="h-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ ease: "linear", duration: 0.1 }}
        />
      </div>
    </motion.div>
  );
};

export default AudioPlayer;