import React, { useRef, useState } from 'react';
import { Send, Mic, Image as ImageIcon, Sparkles, BrainCircuit } from 'lucide-react';
import { AppState, ProcessingOptions } from '../types';

interface InputBarProps {
  appState: AppState;
  onSendMessage: (text: string, options: ProcessingOptions) => void;
  onAudioInput: (blob: Blob) => void;
}

const InputBar: React.FC<InputBarProps> = ({ appState, onSendMessage, onAudioInput }) => {
  const [inputText, setInputText] = useState('');
  const [useThinking, setUseThinking] = useState(false);
  const [useSearch, setUseSearch] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const handleSend = () => {
    if (!inputText.trim() && !selectedImage) return;
    onSendMessage(inputText, { useThinking, useSearch: !useThinking && useSearch, image: selectedImage || undefined }); // Disable search if thinking is on (usually mutually exclusive for best results, though tech supports both)
    setInputText('');
    setSelectedImage(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Keep the data URL prefix here for preview, strip it later
        setSelectedImage(result);
      };
      reader.readAsDataURL(file);
    }
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
          const blob = new Blob(chunks, { type: 'audio/wav' }); // or audio/webm
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

  const isDisabled = appState === AppState.THINKING || appState === AppState.SPEAKING;

  return (
    <div className="w-full max-w-2xl px-4 pb-6">
      {/* Image Preview */}
      {selectedImage && (
        <div className="mb-2 relative inline-block">
          <img src={selectedImage} alt="Preview" className="h-16 w-16 rounded-lg object-cover border border-white/20" />
          <button 
            onClick={() => setSelectedImage(null)}
            className="absolute -top-2 -right-2 bg-red-500 rounded-full w-5 h-5 flex items-center justify-center text-xs"
          >
            ×
          </button>
        </div>
      )}

      <div className="relative group">
        {/* Glow effect behind the bar */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-full opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
        
        <div className="relative flex items-center bg-black/40 backdrop-blur-xl border border-white/10 rounded-full p-2 pr-2 shadow-2xl">
          
          {/* Action Toggles */}
          <div className="flex items-center gap-1 pl-2 border-r border-white/10 pr-2 mr-2">
            <button 
                onClick={() => setUseThinking(!useThinking)}
                className={`p-2 rounded-full transition-colors ${useThinking ? 'bg-amber-500/20 text-amber-400' : 'text-gray-400 hover:text-white'}`}
                title="Deep Thinking Mode (Gemini Pro)"
            >
                <BrainCircuit size={18} />
            </button>
            <button 
                onClick={() => fileInputRef.current?.click()}
                className={`p-2 rounded-full transition-colors ${selectedImage ? 'text-cyan-400' : 'text-gray-400 hover:text-white'}`}
                title="Upload Image"
            >
                <ImageIcon size={18} />
            </button>
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept="image/*"
          />

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? "Listening..." : "Ask anything..."}
            disabled={isDisabled || isRecording}
            className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500 text-sm md:text-base min-w-0"
          />

          <div className="flex items-center gap-1">
            <button 
                onClick={toggleRecording}
                className={`p-2 rounded-full transition-all ${isRecording ? 'bg-red-500/80 text-white animate-pulse' : 'text-gray-400 hover:text-white'}`}
            >
                <Mic size={20} />
            </button>
            
            <button 
                onClick={handleSend}
                disabled={isDisabled || (!inputText && !selectedImage)}
                className={`p-2 rounded-full transition-all duration-300 
                  ${(inputText || selectedImage) && !isDisabled 
                    ? 'bg-white text-black hover:bg-cyan-50 transform hover:scale-105' 
                    : 'bg-white/5 text-gray-500 cursor-not-allowed'}`}
            >
                {useThinking ? <Sparkles size={20} /> : <Send size={20} />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Footer Hints */}
      <div className="flex justify-center gap-4 mt-3 text-[10px] text-gray-500 uppercase tracking-widest font-semibold">
        <span className={useThinking ? "text-amber-500/80" : ""}>{useThinking ? "Gemini 3 Pro (Deep Think)" : "Gemini 3 Flash"}</span>
        <span>•</span>
        <span className={useSearch ? "text-blue-400/80" : ""}>Search Grounding {useSearch ? "ON" : "OFF"}</span>
      </div>
    </div>
  );
};

export default InputBar;