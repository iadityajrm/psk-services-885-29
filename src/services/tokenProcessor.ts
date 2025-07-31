
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
