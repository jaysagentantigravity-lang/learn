import React from 'react';

interface BorderBeamProps {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  borderWidth?: number;
  colorFrom?: string;
  colorTo?: string;
  alwaysOn?: boolean; 
  isThinking?: boolean; 
  allowOverflow?: boolean;
}

const BorderBeam: React.FC<BorderBeamProps> = ({
  children,
  className = "",
  allowOverflow = false,
  // props preserved for interface compatibility
}) => {
  return (
    <div className={`relative group ${className}`}>
      
      {/* 1. Base Glassmorphism Layer */}
      <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-xl rounded-[inherit] z-0 border border-white/5" />

      {/* 2. Static High-Gloss Ridge (Texture) */}
      <div className="absolute inset-0 rounded-[inherit] pointer-events-none z-20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] mix-blend-overlay" />

      {/* 3. Content */}
      <div className={`relative z-30 w-full h-full rounded-[inherit] ${allowOverflow ? 'overflow-visible' : 'overflow-hidden'}`}>
        {children}
      </div>

    </div>
  );
};

export default BorderBeam;