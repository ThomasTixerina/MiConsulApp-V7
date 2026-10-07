import React from 'react';
import { Mic } from 'lucide-react';

export const VoiceVisualizer: React.FC<{ isListening: boolean }> = ({ isListening }) => {
  return (
    <div className="relative w-48 h-48 flex items-center justify-center">
      {isListening && (
        <>
          <div className="absolute w-full h-full rounded-full bg-medical-500/20 animate-pulse"></div>
          <div className="absolute w-3/4 h-3/4 rounded-full bg-medical-500/30 animate-pulse [animation-delay:0.2s]"></div>
        </>
      )}
      <div className="w-1/2 h-1/2 bg-medical-500 rounded-full flex items-center justify-center shadow-lg">
        <Mic className="w-1/2 h-1/2 text-white" />
      </div>
    </div>
  );
};
