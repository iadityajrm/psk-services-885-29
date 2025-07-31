import React, { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface AIOrbProps {
  focused?: boolean;
  onClick?: () => void;
}

const AIOrb: React.FC<AIOrbProps> = ({ focused = false, onClick }) => {
  const [isActive, setIsActive] = useState(false);

  const handleClick = () => {
    setIsActive(!isActive);
    onClick?.();
  };

  return (
    <button
      id="ai-orb-button"
      onClick={handleClick}
      className={`relative w-12 h-12 rounded-full transition-all duration-300 cursor-pointer group ${
        focused ? 'ring-2 ring-white' : ''
      } ${
        isActive 
          ? 'bg-gradient-to-r from-psyco-green-DEFAULT to-blue-500 scale-110 shadow-lg shadow-psyco-green-DEFAULT/50' 
          : 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-psyco-green-DEFAULT/80 hover:to-blue-500/80'
      }`}
    >
      {/* Pulsing rings when active */}
      {isActive && (
        <>
          <div className="absolute inset-0 rounded-full bg-psyco-green-DEFAULT/30 animate-ping" />
          <div className="absolute inset-0 rounded-full bg-psyco-green-DEFAULT/20 animate-ping animation-delay-200" />
        </>
      )}
      
      {/* Waveform indicator */}
      <div className="absolute inset-0 flex items-center justify-center">
        {isActive ? (
          <div className="flex items-center space-x-0.5">
            <div className="w-0.5 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
            <div className="w-0.5 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: '100ms' }} />
            <div className="w-0.5 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
            <div className="w-0.5 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
            <div className="w-0.5 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
          </div>
        ) : (
          <Mic size={20} className="text-white" />
        )}
      </div>
      
      {/* Glow effect when focused */}
      {focused && (
        <div className="absolute inset-0 rounded-full bg-white/20 animate-pulse" />
      )}
    </button>
  );
};

export default AIOrb;