
export interface VoiceToken {
  type: 'openpage' | 'openapp' | 'service_request' | 'timer' | 'environment_control' | 'none';
  payload: {
    page?: string;
    app?: string;
    name?: string;
    url?: string;
    duration?: string;
    device?: string;
    action?: string;
    request?: string;
    quantity?: string;
    special_instructions?: string;
    category?: string;
    items?: Array<{
      name: string;
      quantity: string;
      special_instructions?: string;
    }>;
  };
  message?: string;
}

export interface TranscriptionResult {
  transcription: string;
  task: {
    type: string;
    payload?: any;
  };
}
