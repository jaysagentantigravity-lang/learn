import React from 'react';
import { motion } from 'framer-motion';
import { Clarification } from '../types';

interface ClarificationCardProps {
  data: Clarification;
  onSubmit: (selectedOption: string) => void;
}

const getCategoryIcon = (optionText: string) => {
  const lower = optionText.toLowerCase();
  if (lower.includes('deep dive') || lower.includes('detail')) return 'fa-anchor';
  if (lower.includes('summary') || lower.includes('brief')) return 'fa-bolt';
  if (lower.includes('explain') || lower.includes('teach')) return 'fa-person-chalkboard';
  return 'fa-lightbulb';
};

const ClarificationCard: React.FC<ClarificationCardProps> = ({ data, onSubmit }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-3xl mx-auto my-8 p-8 rounded-[40px] bg-black/40 border border-white/10 backdrop-blur-xl shadow-2xl relative overflow-hidden"
    >
      {/* Decorative gradient */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-zinc-500/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Header with Aluminium Gradient */}
      <div className="flex items-center gap-2 mb-6">
        <div className="p-1.5 rounded-lg border border-white/5 bg-white/5">
          <i className="fa-solid fa-wand-magic-sparkles text-sm bg-gradient-to-b from-white via-zinc-200 to-zinc-500 text-transparent bg-clip-text"></i>
        </div>
        <span className="text-xs uppercase tracking-widest font-bold bg-gradient-to-b from-white via-zinc-200 to-zinc-500 text-transparent bg-clip-text">Refine Request</span>
      </div>

      <h3 className="text-2xl font-light text-white mb-8 leading-relaxed">
        {data.question}
      </h3>

      <div className="flex flex-wrap gap-3 mb-2">
        {data.options.map((option) => (
          <button
            key={option}
            onClick={() => onSubmit(option)}
            className="group px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 border flex items-center gap-2 bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10 hover:border-white/20 hover:text-white active:scale-95"
          >
            <i className={`fa-solid ${getCategoryIcon(option)} opacity-70 group-hover:opacity-100 transition-opacity`}></i>
            {option}
          </button>
        ))}
      </div>
    </motion.div>
  );
};

export default ClarificationCard;