import React from 'react';
import { motion } from 'framer-motion';
import { ProcessingOptions } from '../types';
import BorderBeam from './BorderBeam';

interface WelcomeScreenProps {
  onSuggestionClick: (text: string, options: ProcessingOptions) => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSuggestionClick }) => {
  
  // Row A: Visual Discovery Squares
  const discoveryTiles = [
    {
      id: 'news1',
      title: "Quantum Leap",
      subtitle: "Computing Update",
      image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=600&auto=format&fit=crop", 
      prompt: "What are the latest breakthroughs in Quantum Computing this month?",
      options: { useThinking: true, useSearch: true }
    },
    {
      id: 'news2',
      title: "AI Synthesis",
      subtitle: "Model Architecture",
      image: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=600&auto=format&fit=crop",
      prompt: "Explain the architecture of multimodal AI models like Gemini.",
      options: { useThinking: true, useSearch: true }
    },
    {
      id: 'action1',
      icon: "fa-image",
      title: "Generate",
      subtitle: "Visual Concept",
      color: "from-zinc-500/10 to-slate-500/10",
      prompt: "Generate a futuristic concept art of a bioluminescent city.",
      options: { useThinking: false, useSearch: false }
    },
    {
      id: 'action2',
      icon: "fa-chart-pie",
      title: "Analyze",
      subtitle: "Data Insight",
      color: "from-stone-500/10 to-zinc-500/10",
      prompt: "Create a visualization for global energy consumption trends.",
      options: { useThinking: true, useSearch: true }
    }
  ];

  // Row B: Slim Presets
  const slimPresets = [
    { text: "Explain String Theory", icon: "fa-atom" },
    { text: "Debug Python Code", icon: "fa-bug" },
    { text: "Summarize History", icon: "fa-clock-rotate-left" },
    { text: "Write a Haiku", icon: "fa-feather" }
  ];

  const descriptionText = "Illuminate your curiosity with intelligent visualization.";
  const words = descriptionText.split(" ");

  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-4 md:px-8 text-center z-10 overflow-y-auto">
      
      {/* Hero Header */}
      <div className="mb-6 flex flex-col items-center">
        {/* Title with "Focus Hunt" Animation */}
        <motion.h1
          initial={{ filter: "blur(15px)", opacity: 0, y: 30 }}
          animate={{ 
            filter: ["blur(15px)", "blur(0px)", "blur(6px)", "blur(0px)"], // Sharp -> Blur -> Sharp
            opacity: [0, 1, 1, 1], // Explicitly hold opacity at 1
            y: 0 
          }}
          transition={{ 
            duration: 1.2, // Faster total duration
            times: [0, 0.3, 0.6, 1], // 30% fade-in/focus, 30% defocus, 40% final snap
            ease: "easeInOut"
          }}
          className="text-6xl md:text-8xl font-thin tracking-tighter mb-4 pb-2 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 text-transparent bg-clip-text drop-shadow-[0_2px_10px_rgba(255,255,255,0.1)]"
        >
          Lumina
        </motion.h1>

        {/* Word-by-word fade in description */}
        <div className="text-zinc-400 font-normal text-lg tracking-normal max-w-xl leading-relaxed h-8">
           {words.map((word, i) => (
             <motion.span
               key={i}
               initial={{ opacity: 0, filter: 'blur(4px)' }}
               animate={{ opacity: 1, filter: 'blur(0px)' }}
               transition={{ 
                 duration: 0.8, 
                 delay: 1.0 + (i * 0.08), // Slightly tighter start
                 ease: "easeOut" 
               }}
               className="inline-block mr-1.5"
             >
               {word}
             </motion.span>
           ))}
        </div>
      </div>

      {/* Row A: Visual Discovery Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl mb-10">
        {discoveryTiles.map((tile, idx) => (
          <motion.div
            key={tile.id}
            initial={{ opacity: 0, y: 40 }} // Slide from bottom
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              delay: 1.8 + (idx * 0.15), // Reduced delay
              duration: 0.8,
              ease: "easeOut"
            }}
            className="rounded-[32px]"
          >
            {/* BorderBeam handles the glass background now */}
            <BorderBeam className="rounded-[32px] w-full h-full shadow-2xl">
              <button
                onClick={() => onSuggestionClick(tile.prompt, tile.options)}
                className="group relative w-full aspect-square flex flex-col justify-end text-left transition-all"
              >
                {/* Background Image / Color */}
                {tile.image ? (
                  <>
                    <img src={tile.image} alt={tile.title} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 group-hover:scale-110 transition-all duration-700 grayscale hover:grayscale-0" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />
                  </>
                ) : (
                  <div className={`absolute inset-0 bg-gradient-to-br ${tile.color} opacity-30 group-hover:opacity-50 transition-opacity`} />
                )}

                {/* Icon for Action Tiles */}
                {tile.icon && (
                  <div className="absolute inset-0 flex items-center justify-center text-white/20 group-hover:text-white/40 transition-colors">
                      <i className={`fa-solid ${tile.icon} text-6xl drop-shadow-lg`}></i>
                  </div>
                )}

                {/* Label Overlay */}
                <div className="relative z-20 p-5 w-full">
                  <span className="block text-[10px] uppercase tracking-widest text-zinc-400 font-semibold mb-1 opacity-80">
                    {tile.subtitle}
                  </span>
                  <span className="text-xl font-light text-white tracking-wide group-hover:text-cyan-200 transition-colors">
                    {tile.title}
                  </span>
                </div>
              </button>
            </BorderBeam>
          </motion.div>
        ))}
      </div>

      {/* Row B: Slim Presets (Single Row Layout) */}
      <div className="w-full max-w-4xl overflow-x-auto scrollbar-hide pb-4">
        <div className="flex flex-nowrap md:justify-center gap-4 min-w-max px-2">
          {slimPresets.map((preset, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                delay: 2.4 + (idx * 0.1), // Reduced delay
                duration: 0.6 
              }}
              className="rounded-full"
            >
              <BorderBeam className="rounded-full" borderWidth={1}>
                <button
                  onClick={() => onSuggestionClick(preset.text, { useThinking: false, useSearch: true })}
                  className="group flex items-center gap-3 px-6 py-3 transition-all w-full h-full hover:bg-white/5"
                >
                  <i className={`fa-solid ${preset.icon} text-zinc-500 group-hover:text-cyan-300 text-sm group-hover:scale-110 transition-transform`}></i>
                  <span className="text-sm font-medium text-zinc-300 group-hover:text-white whitespace-nowrap tracking-wide">{preset.text}</span>
                </button>
              </BorderBeam>
            </motion.div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default WelcomeScreen;