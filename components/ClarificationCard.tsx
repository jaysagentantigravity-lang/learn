import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-3xl mx-auto my-8 p-8 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-xl shadow-2xl relative overflow-hidden"
    >
      {/* Decorative gradient */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none" />

      <div className="flex items-center gap-2 mb-6 text-cyan-400">
        <div className="p-1.5 bg-cyan-500/10 rounded-lg">
          <i className="fa-solid fa-wand-magic-sparkles text-sm"></i>
        </div>
        <span className="text-xs uppercase tracking-widest font-bold">Refine Request</span>
      </div>

      <h3 className="text-2xl font-light text-white mb-8 leading-relaxed">
        {data.question}
      </h3>

      <div className="flex flex-wrap gap-3 mb-10">
        {data.options.map((option) => (
          <button
            key={option}
            onClick={() => setSelected(option)}
            className={`px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 border flex items-center gap-2 ${
              selected === option
                ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)] scale-105'
                : 'bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10 hover:border-white/20 hover:text-white'
            }`}
          >
            {selected === option ? (
              <i className="fa-solid fa-check-circle"></i>
            ) : (
              <i className={`fa-solid ${getCategoryIcon(option)} opacity-70`}></i>
            )}
            {option}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex justify-end"
          >
            <button
              onClick={() => selected && onSubmit(selected)}
              className="group flex items-center gap-3 px-8 py-3 rounded-xl font-bold text-sm uppercase tracking-wide transition-all duration-300 bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-lg hover:shadow-cyan-500/25 hover:scale-[1.02]"
            >
              Generate Answer
              <i className="fa-solid fa-arrow-right transition-transform duration-300 group-hover:translate-x-1"></i>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ClarificationCard;