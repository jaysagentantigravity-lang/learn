import React, { useRef, useState, useEffect } from 'react';
import { AppState, ProcessingOptions } from '../types';
import { playSystemSound } from '../services/audioUtils';
import { AnimatePresence, motion } from 'framer-motion';
import BorderBeam from './BorderBeam';

interface InputBarProps {
  appState: AppState;
  onSendMessage: (text: string, options: ProcessingOptions) => void;
  onAudioInput: (blob: Blob) => void;
  onStop?: () => void;
}

type ModeType = 'learning' | 'explanatory' | 'storytelling';

const MODES = [
  { id: 'learning', label: 'Deep Dive', icon: 'fa-brain', desc: 'Thinking & Research' },
  { id: 'explanatory', label: 'Insight', icon: 'fa-lightbulb', desc: 'Fast & Factual' },
  { id: 'storytelling', label: 'Storyteller', icon: 'fa-feather', desc: 'Creative Generation' }
];

const InputBar: React.FC<InputBarProps> = ({ appState, onSendMessage, onAudioInput, onStop }) => {
  const [inputText, setInputText] = useState('');
  
  // UI States
  const [selectedMode, setSelectedMode] = useState<ModeType>('explanatory');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showModeMenu, setShowModeMenu] = useState(false);
  
  // Attachments
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [driveConnecting, setDriveConnecting] = useState(false);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Audio Context
  const [uiAudioCtx, setUiAudioCtx] = useState<AudioContext | null>(null);

  useEffect(() => {
     if (!uiAudioCtx) {
         setUiAudioCtx(new (window.AudioContext || (window as any).webkitAudioContext)());
     }
     
     // Close menus on click outside
     const handleClickOutside = (event: MouseEvent) => {
       if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
         setShowAttachMenu(false);
         setShowModeMenu(false);
       }
     };
     document.addEventListener('mousedown', handleClickOutside);
     return () => document.removeEventListener('mousedown', handleClickOutside);

  }, [uiAudioCtx]);

  const handleSend = () => {
    if ((!inputText.trim() && attachments.length === 0) || isUploading) return;
    
    // Map UI Mode to ProcessingOptions
    let options: ProcessingOptions = { useThinking: false, useSearch: true };
    
    if (selectedMode === 'learning') {
      options = { useThinking: true, useSearch: true };
    } else if (selectedMode === 'storytelling') {
      options = { useThinking: false, useSearch: false };
    }

    // Process first image
    let imageForApi: string | undefined = undefined;
    
    if (attachments.length > 0) {
        const reader = new FileReader();
        reader.onloadend = () => {
             imageForApi = reader.result as string;
             onSendMessage(inputText, { ...options, image: imageForApi }); 
             setInputText('');
             setAttachments([]);
        };
        reader.readAsDataURL(attachments[0]);
    } else {
        onSendMessage(inputText, options);
        setInputText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const triggerFilePicker = (type: 'image' | 'file') => {
      if (fileInputRef.current) {
          fileInputRef.current.accept = type === 'image' ? "image/*" : "*/*";
          fileInputRef.current.click();
      }
      setShowAttachMenu(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...newFiles]);
      
      // Simulate Upload
      setIsUploading(true);
      setTimeout(() => {
        setIsUploading(false);
        if (uiAudioCtx) playSystemSound('ping', uiAudioCtx);
      }, 1500);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDriveClick = () => {
      setDriveConnecting(true);
      setShowAttachMenu(false);
      setTimeout(() => {
          setDriveConnecting(false);
          if (uiAudioCtx) playSystemSound('tick', uiAudioCtx);
          alert("Google Drive: Connected (Mock)");
      }, 1000);
  };

  const removeAttachment = (index: number) => {
      setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        const chunks: BlobPart[] = [];

        mediaRecorder.ondataavailable = (e) => {
          chunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/wav' }); 
          onAudioInput(blob);
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Mic Error:", err);
        alert("Could not access microphone.");
      }
    }
  };

  const isThinking = appState === AppState.THINKING;
  const activeModeObj = MODES.find(m => m.id === selectedMode) || MODES[1];

  return (
    <motion.div 
      ref={menuRef}
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 3.0, duration: 0.8, ease: "easeOut" }} // Delays until after welcome screen chips
      className="w-full max-w-3xl px-4 pb-8" 
    >
       {/* Main Input Container - Wrapped in BorderBeam for Continuous Effect */}
       {/* BorderBeam provides the glass background now */}
       <div className="rounded-[40px] shadow-2xl">
         <BorderBeam 
            alwaysOn={true} 
            className="rounded-[40px]" 
            // Removed manual duration to use the new slower default (14s)
            isThinking={isThinking}
         >
           <div className={`relative flex flex-col transition-all duration-300 group
               ${isThinking 
                 ? 'bg-purple-900/10' // Very subtle tint for thinking
                 : 'bg-transparent'
               }
           `}>
              
              {/* Top Section: Attachment Preview */}
              {(attachments.length > 0 || isUploading) && (
                  <div className="flex gap-3 p-4 pb-0 overflow-x-auto scrollbar-hide">
                      {attachments.map((file, i) => (
                          <div key={i} className="relative flex-shrink-0 w-16 h-16 rounded-2xl overflow-hidden group/img border border-white/10 bg-white/5">
                              <img 
                                  src={URL.createObjectURL(file)} 
                                  alt="preview" 
                                  className={`w-full h-full object-cover transition-opacity ${isUploading ? 'opacity-40' : 'opacity-100'} grayscale`} 
                              />
                              {isUploading && (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                      <i className="fa-solid fa-circle-notch fa-spin text-zinc-300 text-lg"></i>
                                  </div>
                              )}
                              {!isUploading && (
                                  <button 
                                      onClick={() => removeAttachment(i)}
                                      className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity text-white hover:text-red-400"
                                  >
                                      <i className="fa-solid fa-xmark"></i>
                                  </button>
                              )}
                          </div>
                      ))}
                  </div>
              )}

              {/* Bottom Section: Controls & Text */}
              <div className="flex items-end gap-2 p-3 relative">
                 
                 {/* --- LEFT: ATTACHMENT MENU --- */}
                 <div className="flex flex-col gap-1 pb-1 pl-1 relative">
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileSelect} 
                        className="hidden" 
                        multiple
                    />
                    <button 
                        onClick={() => {
                            setShowAttachMenu(!showAttachMenu);
                            setShowModeMenu(false);
                        }}
                        disabled={isThinking || isUploading}
                        className={`w-10 h-10 rounded-full transition-all flex items-center justify-center disabled:opacity-30 ${showAttachMenu ? 'bg-white/10 text-white rotate-45' : 'hover:bg-white/10 text-zinc-400 hover:text-white'}`}
                        title="Add Content"
                    >
                        <i className="fa-solid fa-plus text-lg"></i>
                    </button>

                    {/* Dropdown: Attachments (Metallic) */}
                    <AnimatePresence>
                        {showAttachMenu && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute bottom-14 left-0 w-48 bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-30 flex flex-col p-1"
                            >
                                <button onClick={handleDriveClick} className="flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:text-white hover:bg-white/10 rounded-2xl transition-colors">
                                    <i className="fa-brands fa-google-drive w-5 text-zinc-400 group-hover:text-white"></i>
                                    Google Drive
                                </button>
                                <button onClick={() => triggerFilePicker('image')} className="flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:text-white hover:bg-white/10 rounded-2xl transition-colors">
                                    <i className="fa-solid fa-image w-5 text-zinc-400 group-hover:text-white"></i>
                                    Image Media
                                </button>
                                <button onClick={() => triggerFilePicker('file')} className="flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:text-white hover:bg-white/10 rounded-2xl transition-colors">
                                    <i className="fa-solid fa-file w-5 text-zinc-400 group-hover:text-white"></i>
                                    Upload File
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                 </div>

                 {/* --- CENTER: INPUT TEXT --- */}
                 <div className="flex-1 py-2">
                     <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={isRecording ? "Listening..." : (isThinking ? "Processing..." : "Ask Lumina...")}
                        disabled={isThinking || isRecording}
                        className="w-full bg-transparent border-none outline-none text-white placeholder-zinc-500 text-base resize-none h-12 py-2 leading-relaxed scrollbar-hide"
                     />
                     
                     {/* --- MODE SELECTOR (Footer - Metallic) --- */}
                     <div className="flex items-center gap-4 mt-1 relative">
                         <button 
                            onClick={() => {
                                setShowModeMenu(!showModeMenu);
                                setShowAttachMenu(false);
                            }}
                            className={`text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-transparent hover:border-white/10 hover:bg-white/5 text-zinc-400 hover:text-white`}
                         >
                            <i className={`fa-solid ${activeModeObj.icon} ${selectedMode === 'learning' && isThinking ? 'animate-pulse' : ''}`}></i>
                            {activeModeObj.label}
                            <i className="fa-solid fa-chevron-down text-[8px] opacity-50 ml-1"></i>
                         </button>
                         
                         {/* Dropdown: Modes (Metallic) */}
                         <AnimatePresence>
                            {showModeMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute bottom-10 left-0 w-64 bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-30 p-1"
                                >
                                    {MODES.map(mode => (
                                        <button 
                                            key={mode.id}
                                            onClick={() => {
                                                setSelectedMode(mode.id as ModeType);
                                                setShowModeMenu(false);
                                            }}
                                            className={`w-full text-left px-4 py-3 rounded-2xl flex items-center gap-3 transition-colors ${selectedMode === mode.id ? 'bg-white/10' : 'hover:bg-white/5'}`}
                                        >
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-black/40 border border-white/5 text-zinc-300`}>
                                                <i className={`fa-solid ${mode.icon}`}></i>
                                            </div>
                                            <div>
                                                <div className={`text-xs font-bold uppercase tracking-wide text-zinc-300`}>{mode.label}</div>
                                                <div className="text-[10px] text-zinc-500">{mode.desc}</div>
                                            </div>
                                            {selectedMode === mode.id && <i className="fa-solid fa-check text-white text-xs ml-auto"></i>}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                         </AnimatePresence>

                         {driveConnecting && <span className="text-[10px] text-zinc-500 font-mono animate-pulse">Connecting...</span>}
                     </div>
                 </div>

                 {/* --- RIGHT: ACTIONS --- */}
                 <div className="flex items-center gap-2 pb-1 pr-1">
                     <button 
                        onClick={toggleRecording}
                        disabled={isThinking}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500/20 text-red-500 animate-pulse border border-red-500/50' : 'hover:bg-white/10 text-zinc-400 hover:text-white'}`}
                     >
                        <i className="fa-solid fa-microphone text-lg"></i>
                     </button>

                     {isThinking ? (
                        <button 
                            onClick={onStop}
                            className="w-12 h-12 rounded-[20px] bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white transition-all shadow-lg active:scale-95"
                        >
                            <i className="fa-solid fa-stop text-lg"></i>
                        </button>
                     ) : (
                        <button 
                            onClick={handleSend}
                            disabled={(!inputText.trim() && attachments.length === 0) || isUploading}
                            className={`w-12 h-12 rounded-[20px] flex items-center justify-center transition-all shadow-lg active:scale-95 border
                                ${(!inputText.trim() && attachments.length === 0) || isUploading
                                    ? 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed' 
                                    : 'bg-white text-black border-white hover:bg-zinc-200'
                                }`}
                        >
                            {isUploading ? (
                                 <i className="fa-solid fa-circle-notch fa-spin"></i>
                            ) : (
                                 <i className="fa-solid fa-arrow-up text-lg"></i>
                            )}
                        </button>
                     )}
                 </div>

              </div>
           </div>
         </BorderBeam>
       </div>
    </motion.div>
  );
};

export default InputBar;