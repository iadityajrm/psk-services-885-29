
import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = 'AIzaSyDC1k_PYaCIy987c-OSfFIu6D5WPFrPa9U';

export class GeminiLiveAudioService {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private isMuted = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private onResponseCallback?: (text: string) => void;

  async connect(onResponse?: (text: string) => void): Promise<void> {
    if (this.isConnected) {
      console.log('Already connected to Gemini Live');
      return;
    }

    this.onResponseCallback = onResponse;

    try {
      // Connect to Gemini Live WebSocket endpoint
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${GEMINI_API_KEY}`;
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = async () => {
        console.log('Connected to Gemini Live WebSocket');
        this.isConnected = true;
        
        // Send initial setup message
        const setupMessage = {
          setup: {
            model: "models/gemini-2.0-flash-exp",
            generation_config: {
              response_modalities: ["AUDIO"],
              speech_config: {
                voice_config: {
                  prebuilt_voice_config: {
                    voice_name: "Puck"
                  }
                }
              }
            },
            system_instruction: {
              parts: [{
                text: `You are a helpful voice assistant. Respond naturally and conversationally to voice input. Keep responses concise but friendly. You can help with:
                - Opening applications and websites
                - Setting timers and reminders  
                - Controlling smart home devices
                - Answering questions
                - Food ordering and menu navigation
                - General conversation
                
                Always acknowledge what the user said and provide helpful responses.`
              }]
            },
            tools: []
          }
        };
        
        this.ws?.send(JSON.stringify(setupMessage));
        await this.setupAudioInput();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received from Gemini:', data);
          
          if (data.serverContent?.modelTurn?.parts) {
            const parts = data.serverContent.modelTurn.parts;
            const textPart = parts.find((part: any) => part.text);
            if (textPart && this.onResponseCallback) {
              this.onResponseCallback(textPart.text);
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket connection closed');
        this.isConnected = false;
      };

    } catch (error) {
      console.error('Failed to connect to Gemini Live:', error);
      throw new Error('Could not establish connection to Gemini Live');
    }
  }

  private async setupAudioInput(): Promise<void> {
    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });

      this.mediaRecorder = new MediaRecorder(this.audioStream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && this.ws && !this.isMuted && this.ws.readyState === WebSocket.OPEN) {
          await this.sendAudioChunk(event.data);
        }
      };

      // Start continuous recording with small chunks
      this.mediaRecorder.start(100); // 100ms chunks

    } catch (error) {
      console.error('Error setting up audio input:', error);
      throw error;
    }
  }

  private async sendAudioChunk(audioBlob: Blob): Promise<void> {
    if (!this.ws || this.isMuted || this.ws.readyState !== WebSocket.OPEN) return;

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      const message = {
        realtimeInput: {
          mediaChunks: [{
            mimeType: "audio/webm;codecs=opus",
            data: base64Audio
          }]
        }
      };
      
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending audio chunk:', error);
    }
  }

  async mute(): Promise<void> {
    this.isMuted = true;
    console.log('Gemini Live audio muted');
  }

  async unmute(): Promise<void> {
    this.isMuted = false;
    console.log('Gemini Live audio unmuted');
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) return;

    try {
      // Stop media recorder
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }

      // Stop audio stream
      if (this.audioStream) {
        this.audioStream.getTracks().forEach(track => track.stop());
        this.audioStream = null;
      }

      // Close WebSocket
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }

      this.isConnected = false;
      this.isMuted = false;
      this.mediaRecorder = null;
      this.onResponseCallback = undefined;

      console.log('Disconnected from Gemini Live');
    } catch (error) {
      console.error('Error disconnecting from Gemini Live:', error);
    }
  }

  getConnectionState(): { isConnected: boolean; isMuted: boolean } {
    return {
      isConnected: this.isConnected,
      isMuted: this.isMuted
    };
  }
}

export const geminiLiveService = new GeminiLiveAudioService();
