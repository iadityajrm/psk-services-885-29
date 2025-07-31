
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { TranscriptionResult, VoiceToken } from '../types/voice-tokens';

// Using the provided API key (note: in production, this should be in Supabase secrets)
const GEMINI_API_KEY = 'AIzaSyBOss0EVWeo49x_RKGOcgHGRILnhtZqR4o';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const createSystemInstruction = (context: string = '') => `You are a voice assistant for a smart TV interface that transcribes English audio and identifies user commands. 

${context ? `CONVERSATION CONTEXT: ${context}` : ''}

TRANSCRIPTION RULES:
- Transcribe exactly what you hear in English
- If you hear non-English, translate it to English 
- Only transcribe clear, intelligible speech with actual words
- Do not transcribe background noise, music, unclear sounds, or ambient sounds
- If the audio is unclear, just noise, or contains no clear speech, respond with an empty transcription

COMMAND IDENTIFICATION:
Look for these command types in the transcription:

1. OPENPAGE: Navigation to different UI pages
   - Keywords: "go to", "open", "show", "navigate to", "switch to"
   - Pages: "home", "restaurant", "apps", "menu"
   - Examples: "go to restaurant", "open the menu", "show me apps", "I'm hungry" (implies restaurant)
   - JSON: {"type": "openpage", "payload": {"page": "restaurant", "message": "Opening restaurant menu"}}

2. OPENAPP: Opening applications/websites in new tab
   - Keywords: "open", "launch", "start", "show me"
   - Apps: "Netflix", "YouTube", "Pluto TV", "YouTube Music", "Plex", "Disney+", "Hulu", "Prime Video", "HBO Max"
   - Examples: "open YouTube", "launch Netflix", "start Spotify"
   - JSON: {"type": "openapp", "payload": {"app": "YouTube", "url": "https://www.youtube.com", "message": "Opening YouTube"}}

3. SERVICE_REQUEST: Food ordering and menu navigation
   - Keywords: "order", "I want", "get me", "show menu", "what food", "I'm hungry"
   - Examples: "show me the menu", "I want pasta", "order pizza", "I'm feeling hungry"
   - JSON for menu: {"type": "service_request", "payload": {"request": "view_menu", "message": "Opening restaurant menu"}}
   - JSON for food order: {"type": "service_request", "payload": {"request": "food_order", "name": "pasta", "quantity": "1"}}

4. TIMER: Setting timers
   - Keywords: "set timer", "timer for", "remind me"
   - Examples: "set timer for 5 minutes", "timer for 30 seconds"
   - JSON: {"type": "timer", "payload": {"duration": "5 minutes", "message": "Timer set for 5 minutes"}}

5. ENVIRONMENT_CONTROL: Device control commands
   - Keywords: "turn on/off", "set temperature", "dim lights"
   - Examples: "turn on the lights", "set temperature to 72"
   - JSON: {"type": "environment_control", "payload": {"device": "lights", "action": "turn on", "message": "Turning on lights"}}

6. NONE: No clear command detected
   - For general conversation, unclear audio, or non-commands
   - JSON: {"type": "none"}

OUTPUT FORMAT (JSON only):
{
  "transcription": "exact words heard",
  "task": {
    "type": "openpage",
    "payload": {
      "page": "restaurant",
      "message": "Opening restaurant menu"
    }
  }
}

Your entire response must be ONLY the JSON object and nothing else.`;

export const transcribeAndIdentifyTask = async (audioBlob: Blob, context: string = ''): Promise<TranscriptionResult> => {
  try {
    // Convert blob to array buffer
    const arrayBuffer = await audioBlob.arrayBuffer();
    
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      systemInstruction: createSystemInstruction(context)
    });

    const result = await model.generateContent([
      {
        inlineData: {
          data: Buffer.from(arrayBuffer).toString('base64'),
          mimeType: 'audio/webm'
        }
      }
    ]);

    const response = await result.response;
    const jsonText = response.text().trim();
    const parsedResult = JSON.parse(jsonText) as TranscriptionResult;
    
    if (!parsedResult || typeof parsedResult.transcription !== 'string' || typeof parsedResult.task?.type !== 'string') {
      throw new Error('Invalid JSON response format from API.');
    }
    
    return parsedResult;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
      throw new Error(`Gemini API Error: ${error.message}`);
    }
    throw new Error("An unexpected error occurred while communicating with the Gemini API.");
  }
};

export const processVoiceToken = (transcriptionResult: TranscriptionResult): VoiceToken => {
  const { task } = transcriptionResult;
  
  switch (task.type) {
    case 'openpage':
      return {
        type: 'openpage',
        payload: {
          page: task.payload?.page || 'home'
        },
        message: task.payload?.message || `Opening ${task.payload?.page} page`
      };
    
    case 'openapp':
      return {
        type: 'openapp',
        payload: {
          app: task.payload?.app || task.payload?.name,
          url: getAppUrl(task.payload?.app || task.payload?.name)
        },
        message: task.payload?.message || `Opening ${task.payload?.app || task.payload?.name}`
      };
    
    case 'service_request':
      return {
        type: 'service_request',
        payload: task.payload,
        message: task.payload?.message || 'Processing your request'
      };
    
    case 'timer':
      return {
        type: 'timer',
        payload: task.payload,
        message: task.payload?.message || `Setting timer for ${task.payload?.duration}`
      };
    
    case 'environment_control':
      return {
        type: 'environment_control',
        payload: task.payload,
        message: task.payload?.message || 'Controlling environment'
      };
    
    default:
      return {
        type: 'none',
        payload: {},
        message: 'No command recognized'
      };
  }
};

const getAppUrl = (appName: string): string => {
  const appUrls: Record<string, string> = {
    'Netflix': 'https://www.netflix.com',
    'YouTube': 'https://www.youtube.com',
    'Pluto TV': 'https://pluto.tv',
    'YouTube Music': 'https://music.youtube.com',
    'Plex TV': 'https://www.plex.tv',
    'Disney+': 'https://www.disneyplus.com',
    'Hulu': 'https://www.hulu.com',
    'Prime Video': 'https://www.primevideo.com',
    'HBO Max': 'https://www.hbomax.com'
  };
  
  return appUrls[appName] || `https://www.google.com/search?q=${encodeURIComponent(appName)}`;
};
