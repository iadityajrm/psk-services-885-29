
import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';

interface UseVoiceRecordingReturn {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  audioLevel: number;
}

export const useVoiceRecording = (): UseVoiceRecordingReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();
  const chunksRef = useRef<Blob[]>([]);

  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i];
    }
    const average = sum / bufferLength;
    setAudioLevel(average / 255);

    if (isRecording) {
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    }
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      // Setup audio context for level monitoring
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      
      chunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      updateAudioLevel();
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Could not access microphone. Please check permissions.');
    }
  }, [updateAudioLevel]);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || !isRecording) {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        
        // Cleanup
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        
        // Stop all tracks
        if (mediaRecorderRef.current?.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
        
        setIsRecording(false);
        setAudioLevel(0);
        resolve(audioBlob);
      };

      mediaRecorderRef.current.stop();
    });
  }, [isRecording]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    audioLevel
  };
};
</tml-write>

Now I'll create a token processor service:

<lov-write file_path="src/services/tokenProcessor.ts">
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { VoiceToken } from '../types/voice-tokens';

export class TokenProcessor {
  private navigate: (path: string) => void;

  constructor(navigate: (path: string) => void) {
    this.navigate = navigate;
  }

  async processToken(token: VoiceToken): Promise<void> {
    console.log('Processing voice token:', token);

    switch (token.type) {
      case 'openpage':
        await this.handlePageNavigation(token);
        break;
      
      case 'openapp':
        await this.handleAppLaunch(token);
        break;
      
      case 'service_request':
        await this.handleServiceRequest(token);
        break;
      
      case 'timer':
        await this.handleTimer(token);
        break;
      
      case 'environment_control':
        await this.handleEnvironmentControl(token);
        break;
      
      default:
        console.log('No action needed for token type:', token.type);
    }

    if (token.message) {
      toast.success(token.message);
    }
  }

  private async handlePageNavigation(token: VoiceToken): Promise<void> {
    const { page } = token.payload;
    
    switch (page?.toLowerCase()) {
      case 'home':
        this.navigate('/');
        break;
      case 'restaurant':
      case 'menu':
        this.navigate('/restaurant');
        break;
      case 'apps':
        this.navigate('/apps');
        break;
      default:
        this.navigate('/');
    }
  }

  private async handleAppLaunch(token: VoiceToken): Promise<void> {
    const { url, app } = token.payload;
    
    if (url) {
      window.open(url, '_blank');
      console.log(`Launched ${app} at ${url}`);
    }
  }

  private async handleServiceRequest(token: VoiceToken): Promise<void> {
    const { request } = token.payload;
    
    switch (request) {
      case 'view_menu':
        this.navigate('/restaurant');
        break;
      case 'food_order':
        this.navigate('/restaurant');
        // Here you could also scroll to a specific item or highlight it
        break;
      default:
        console.log('Service request:', request);
    }
  }

  private async handleTimer(token: VoiceToken): Promise<void> {
    const { duration } = token.payload;
    console.log(`Setting timer for: ${duration}`);
    // Timer implementation could go here
  }

  private async handleEnvironmentControl(token: VoiceToken): Promise<void> {
    const { device, action } = token.payload;
    console.log(`Environment control: ${action} ${device}`);
    // Environment control implementation could go here
  }
}

export const useTokenProcessor = () => {
  const navigate = useNavigate();
  
  const processToken = async (token: VoiceToken) => {
    const processor = new TokenProcessor(navigate);
    await processor.processToken(token);
  };

  return { processToken };
};
