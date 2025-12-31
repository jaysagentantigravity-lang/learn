import React from 'react';
import { motion } from 'framer-motion';

export type BackgroundMode = 'idle' | 'thinking' | 'searching' | 'speaking';

interface BackgroundMeshProps {
  mode?: BackgroundMode;
}

const BackgroundMesh: React.FC<BackgroundMeshProps> = ({ mode = 'idle' }) => {
  // Palette config
  const colors = {
    idle: { tl: '#083344', br: '#1e1b4b' }, // Cyan / Indigo
    thinking: { tl: '#451a03', br: '#4c0519' }, // Amber / Rose
    searching: { tl: '#022c22', br: '#064e3b' }, // Emerald
    speaking: { tl: '#500724', br: '#3b0764' } // Pink / Purple
  };

  const current = colors[mode];

  return (
    <div className="fixed inset-0 z-0 bg-black overflow-hidden pointer-events-none transition-colors duration-1000">
      
      {/* Top Left Gradient */}
      <motion.div 
        animate={{ backgroundColor: current.tl }}
        transition={{ duration: 4, ease: "easeInOut" }}
        className="absolute -top-[10%] -left-[10%] w-[60vw] h-[60vw] rounded-full blur-[150px] opacity-20"
      />

      {/* Bottom Right Gradient */}
      <motion.div 
        animate={{ backgroundColor: current.br }}
        transition={{ duration: 4, ease: "easeInOut" }}
        className="absolute -bottom-[10%] -right-[10%] w-[60vw] h-[60vw] rounded-full blur-[150px] opacity-20"
      />
      
      {/* Cinematic Grain Overlay */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.08] brightness-100 contrast-150 mix-blend-overlay"></div>
    </div>
  );
};

export default BackgroundMesh;
