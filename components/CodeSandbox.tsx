
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CodeSandboxProps {
  code: string;
  language: string;
}

const CodeSandbox: React.FC<CodeSandboxProps> = ({ code, language }) => {
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('preview');
  const [iframeHeight, setIframeHeight] = useState(300);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Only enable preview for HTML/XML/SVG, otherwise default to code view
  const canPreview = ['html', 'xml', 'svg'].includes(language.toLowerCase());

  useEffect(() => {
    if (!canPreview) setActiveTab('code');
  }, [canPreview]);

  useEffect(() => {
    if (activeTab === 'preview' && iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        // Inject styles for a basic dark mode responsive reset
        const resetStyle = `
          <style>
            body { 
              margin: 0; 
              padding: 20px; 
              font-family: system-ui, -apple-system, sans-serif; 
              color: #e4e4e7; 
              background: transparent;
              overflow-x: hidden;
            }
            * { box-sizing: border-box; }
            ::-webkit-scrollbar { width: 8px; height: 8px; }
            ::-webkit-scrollbar-track { background: transparent; }
            ::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }
          </style>
        `;
        doc.write(resetStyle + code);
        doc.close();

        // Auto-resize
        setTimeout(() => {
            if(iframeRef.current?.contentDocument?.body) {
                setIframeHeight(Math.max(300, iframeRef.current.contentDocument.body.scrollHeight + 40));
            }
        }, 500);
      }
    }
  }, [code, activeTab]);

  return (
    <div className="rounded-3xl overflow-hidden my-8 border border-white/10 shadow-2xl bg-black/40 backdrop-blur-sm group">
      
      {/* Header / Tabs */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/5">
        <div className="flex items-center gap-2">
           <div className="flex gap-1.5 mr-3">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/50"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
           </div>
           <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">{language} Simulation</span>
        </div>

        {canPreview && (
          <div className="flex bg-black/50 rounded-lg p-1 border border-white/5">
            <button
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider transition-all ${activeTab === 'code' ? 'bg-zinc-700 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Code
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider transition-all flex items-center gap-1.5 ${activeTab === 'preview' ? 'bg-cyan-600 text-white shadow-[0_0_10px_rgba(8,145,178,0.5)]' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <i className="fa-solid fa-play text-[8px]"></i> Preview
            </button>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="relative">
        {activeTab === 'preview' ? (
          <div className="bg-[#0f0f11] relative">
             {/* Grid Background for Preview */}
             <div className="absolute inset-0 opacity-10 pointer-events-none" 
                  style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '20px 20px' }} 
             />
             <iframe
                ref={iframeRef}
                title="code-preview"
                style={{ height: iframeHeight }}
                className="w-full border-none relative z-10"
                sandbox="allow-scripts" // Basic security
             />
          </div>
        ) : (
          <div className="max-h-[500px] overflow-auto custom-scrollbar bg-[#050505] p-0">
             {/* Syntax highlighting is handled by parent MessageList wrapper usually, 
                 but we simply render plain text here if switched back from preview 
                 or let the parent handle the 'code' tab view differently. 
                 For simplicity in this component, we display raw code. */}
             <pre className="p-6 text-sm font-mono text-zinc-300 leading-relaxed whitespace-pre-wrap">
               {code}
             </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeSandbox;
