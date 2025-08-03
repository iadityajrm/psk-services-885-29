
import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = 'AIzaSyDC1k_PYaCIy987c-OSfFIu6D5WPFrPa9U';
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export class GeminiLiveAudioService {
  private session: any = null;
  private isConnected = false;
  private isMuted = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;

  async connect(onResponse?: (text: string) => void): Promise<void> {
    if (this.isConnected) {
      console.log('Already connected to Gemini Live');
      return;
    }

    try {
      // Create a live session with the Gemini model
      this.session = await ai.models.startChat({
        model: "gemini-2.0-flash-exp",
        systemInstruction: `You are a helpful voice assistant. Respond naturally and conversationally to voice input. Keep responses concise but friendly. You can help with:
        - Opening applications and websites
        - Setting timers and reminders  
        - Controlling smart home devices
        - Answering questions
        - Food ordering and menu navigation
        - General conversation
        
        Always acknowledge what the user said and provide helpful responses.`,
        config: {
          enableAudioInput: true,
          enableAudioOutput: true
        }
      });

      this.isConnected = true;
      console.log('Connected to Gemini Live audio');

      // Set up audio input stream
      await this.setupAudioInput();

      // Handle responses if callback provided
      if (onResponse) {
        this.session.onMessage((message: any) => {
          if (message.text) {
            onResponse(message.text);
          }
        });
      }

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
        if (event.data.size > 0 && this.session && !this.isMuted) {
          // Send audio chunk to Gemini Live
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
    if (!this.session || this.isMuted) return;

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Send audio data to Gemini Live session
      await this.session.sendAudio(uint8Array);
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

      // End Gemini session
      if (this.session) {
        await this.session.end();
        this.session = null;
      }

      this.isConnected = false;
      this.isMuted = false;
      this.mediaRecorder = null;

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
