
import React, { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { transcribeAndIdentifyTask, processVoiceToken } from '@/services/geminiVoiceService';
import { useTokenProcessor } from '@/services/tokenProcessor';
import { toast } from 'sonner';

interface AIOrbProps {
  focused?: boolean;
  onClick?: () => void;
}

const AIOrb: React.FC<AIOrbProps> = ({ focused = false, onClick }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { isRecording, startRecording, stopRecording, audioLevel } = useVoiceRecording();
  const { processToken } = useTokenProcessor();

  const handleClick = async () => {
    onClick?.();

    if (isRecording) {
      // Stop recording and process
      setIsProcessing(true);
      try {
        const audioBlob = await stopRecording();
        if (audioBlob) {
          toast.info('Processing your command...');
          
          const transcriptionResult = await transcribeAndIdentifyTask(audioBlob);
          console.log('Transcription result:', transcriptionResult);
          
          if (transcriptionResult.transcription) {
            toast.info(`You said: "${transcriptionResult.transcription}"`);
          }
          
          const token = processVoiceToken(transcriptionResult);
          await processToken(token);
        }
      } catch (error) {
        console.error('Error processing voice command:', error);
        toast.error('Failed to process voice command. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    } else {
      // Start recording
      try {
        await startRecording();
        toast.info('Listening... Click again to stop.');
      } catch (error) {
        console.error('Error starting recording:', error);
        toast.error('Could not start voice recording.');
      }
    }
  };

  const getOrbState = () => {
    if (isProcessing) return 'processing';
    if (isRecording) return 'recording';
    return 'idle';
  };

  const orbState = getOrbState();

  return (
    <button
      id="ai-orb-button"
      onClick={handleClick}
      disabled={isProcessing}
      className={`relative w-12 h-12 rounded-full transition-all duration-300 cursor-pointer group ${
        focused ? 'ring-2 ring-white' : ''
      } ${
        orbState === 'recording'
          ? 'bg-gradient-to-r from-red-500 to-red-600 scale-110 shadow-lg shadow-red-500/50' 
          : orbState === 'processing'
          ? 'bg-gradient-to-r from-blue-500 to-purple-600 scale-110 shadow-lg shadow-blue-500/50'
          : 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-psyco-green-DEFAULT/80 hover:to-blue-500/80'
      }`}
    >
      {/* Pulsing rings when active */}
      {(orbState === 'recording' || orbState === 'processing') && (
        <>
          <div className={`absolute inset-0 rounded-full animate-ping ${
            orbState === 'recording' ? 'bg-red-500/30' : 'bg-blue-500/30'
          }`} />
          <div className={`absolute inset-0 rounded-full animate-ping animation-delay-200 ${
            orbState === 'recording' ? 'bg-red-500/20' : 'bg-blue-500/20'
          }`} />
        </>
      )}
      
      {/* Content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {orbState === 'recording' ? (
          <div className="flex items-center space-x-0.5">
            {[...Array(5)].map((_, i) => (
              <div 
                key={i}
                className="w-0.5 bg-white rounded-full animate-pulse transition-all duration-75"
                style={{ 
                  height: `${8 + (audioLevel * 20)}px`,
                  animationDelay: `${i * 100}ms` 
                }}
              />
            ))}
          </div>
        ) : orbState === 'processing' ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
