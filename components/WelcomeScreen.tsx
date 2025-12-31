import React from 'react';
import { motion } from 'framer-motion';
import { ProcessingOptions } from '../types';

interface WelcomeScreenProps {
  onSuggestionClick: (text: string, options: ProcessingOptions) => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSuggestionClick }) => {
  const suggestions = [
    {
      icon: <i className="fa-solid fa-brain text-amber-400 text-lg"></i>,
      text: "Analyze the implications of quantum entanglement in computing",
      label: "Deep Reasoning",
      options: { useThinking: true, useSearch: true }
    },
    {
      icon: <i className="fa-solid fa-code text-cyan-400 text-lg"></i>,
      text: "Write a React component for a 3D data visualization",
      label: "Coding Assistant",
      options: { useThinking: false, useSearch: false }
    },
    {
      icon: <i className="fa-solid fa-wand-magic-sparkles text-purple-400 text-lg"></i>,
      text: "Explain the water cycle with a diagram",
      label: "Visual Learning",
      options: { useThinking: false, useSearch: true }
    },
    {
      icon: <i className="fa-solid fa-bolt text-emerald-400 text-lg"></i>,
      text: "What are the latest breakthroughs in fusion energy?",
      label: "Live Knowledge",
      options: { useThinking: false, useSearch: true }
    }
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-4 text-center z-10">
      
      {/* Hero Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, type: "spring" }}
        className="mb-12 relative"
      >
        <div className="absolute inset-0 bg-cyan-500/20 blur-[100px] rounded-full"></div>
        <h1 className="text-6xl md:text-8xl font-thin tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-cyan-100 to-cyan-900/50 relative z-10 font-sans">
          Lumina
        </h1>
        <p className="mt-4 text-zinc-400 font-light text-lg tracking-wide uppercase">
          Adaptive Knowledge Engine
        </p>
      </motion.div>

      {/* Suggestion Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl w-full">
        {suggestions.map((item, index) => (
          <motion.button
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            onClick={() => onSuggestionClick(item.text, item.options)}
            className="group relative bg-white/5 hover:bg-white/10 border border-white/5 hover:border-cyan-500/30 rounded-2xl p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(6,182,212,0.1)] flex flex-col gap-2 overflow-hidden"
          >
            {/* Hover Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/0 to-cyan-500/0 group-hover:via-cyan-500/5 transition-all duration-500" />
            
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-lg bg-black/40 border border-white/10 group-hover:border-cyan-500/30 transition-colors">
                {item.icon}
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500 group-hover:text-cyan-300 transition-colors">
                {item.label}
              </span>
            </div>
            
            <p className="text-zinc-300 group-hover:text-white transition-colors font-light text-lg leading-snug">
              {item.text}
            </p>
          </motion.button>
        ))}
      </div>

    </div>
  );
};

export default WelcomeScreen;