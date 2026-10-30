import React, { useState } from 'react';
import { AlertOctagon, Zap } from 'lucide-react';

interface SOSButtonProps {
  onTrigger: () => void;
  isLoading?: boolean;
}

export const SOSButton: React.FC<SOSButtonProps> = ({ onTrigger, isLoading = false }) => {
  const [isPressing, setIsPressing] = useState(false);

  const handlePress = () => {
    // Mobile tactile feedback
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([150, 50, 150]);
      } catch {
        // ignore
      }
    }
    onTrigger();
  };

  return (
    <div className="relative flex flex-col items-center justify-center my-6">
      {/* Outer ambient glow rings */}
      <div className="absolute w-64 h-64 sm:w-72 sm:h-72 rounded-full bg-red-600/15 animate-ping-slow pointer-events-none" />
      <div className="absolute w-52 h-52 sm:w-60 sm:h-60 rounded-full bg-red-600/20 animate-sos-pulse pointer-events-none" />

      {/* Main SOS Touch Target */}
      <button
        onClick={handlePress}
        onMouseDown={() => setIsPressing(true)}
        onMouseUp={() => setIsPressing(false)}
        onTouchStart={() => setIsPressing(true)}
        onTouchEnd={() => setIsPressing(false)}
        disabled={isLoading}
        className={`relative z-10 w-44 h-44 sm:w-52 sm:h-52 rounded-full bg-gradient-to-br from-red-500 via-red-600 to-red-800 border-4 border-red-400/80 shadow-sos flex flex-col items-center justify-center text-white transition-all duration-150 transform select-none cursor-pointer focus:outline-none focus:ring-4 focus:ring-red-500/50 ${
          isPressing ? 'scale-95 shadow-inner brightness-90' : 'hover:scale-[1.02] active:scale-95'
        }`}
        aria-label="Activate Emergency SOS Assistance"
      >
        <AlertOctagon className="w-12 h-12 sm:w-14 sm:h-14 mb-1 drop-shadow-md" />
        <span className="text-3xl sm:text-4xl font-black tracking-widest drop-shadow-md">
          SOS
        </span>
        <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-red-100 mt-1 opacity-90">
          Emergency Assistance
        </span>
      </button>

      <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
        <Zap className="w-3.5 h-3.5 text-amber-400" />
        <span>Tap once to initiate instant responder dispatch</span>
      </div>
    </div>
  );
};
