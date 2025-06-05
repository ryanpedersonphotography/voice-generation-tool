import { VoiceProvider } from '../../core/provider.base.js';
import { VoiceProfile, GenerationRequest, VoiceCharacteristics } from '../../interfaces/voice.interface.js';
import OpenAI from 'openai';

export class OpenAIProvider extends VoiceProvider {
  name = 'openai';
  private openai: OpenAI;

  constructor(apiKey: string) {
    super();
    this.openai = new OpenAI({ apiKey });
  }

  async initialize(): Promise<void> {
    try {
      // Test the API key by making a simple request
      await this.openai.models.list();
    } catch (error) {
      throw new Error(`OpenAI initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async generateSpeech(request: GenerationRequest): Promise<Buffer> {
    const voice = this.mapVoiceProfileToOpenAI(request.voiceProfile);
    const speed = request.modulation?.speed || 1.0;

    try {
      const response = await this.openai.audio.speech.create({
        model: 'tts-1-hd',
        voice: voice as any,
        input: request.text,
        speed: Math.max(0.25, Math.min(4.0, speed))
      });

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      throw new Error(`OpenAI speech generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private mapVoiceProfileToOpenAI(voiceProfile?: VoiceProfile): string {
    if (!voiceProfile) return 'alloy';

    const characteristics = voiceProfile.characteristics;
    
    // OpenAI voices: alloy, echo, fable, onyx, nova, shimmer
    if (characteristics.gender === 'female') {
      if (characteristics.age === 'young') return 'nova';
      if (characteristics.personality.includes('calm')) return 'shimmer';
      return 'alloy';
    } else if (characteristics.gender === 'male') {
      if (characteristics.timbre === 'deep') return 'onyx';
      if (characteristics.personality.includes('wise')) return 'echo';
      return 'fable';
    }

    return 'alloy'; // Default
  }

  async listVoices(): Promise<VoiceProfile[]> {
    // OpenAI has predefined voices
    const voices = [
      { id: 'alloy', name: 'Alloy', gender: 'female', description: 'Neutral, balanced voice' },
      { id: 'echo', name: 'Echo', gender: 'male', description: 'Wise, contemplative voice' },
      { id: 'fable', name: 'Fable', gender: 'male', description: 'Storytelling voice' },
      { id: 'onyx', name: 'Onyx', gender: 'male', description: 'Deep, authoritative voice' },
      { id: 'nova', name: 'Nova', gender: 'female', description: 'Young, energetic voice' },
      { id: 'shimmer', name: 'Shimmer', gender: 'female', description: 'Calm, soothing voice' }
    ];

    return voices.map(voice => ({
      id: voice.id,
      name: voice.name,
      provider: 'openai' as const,
      baseVoiceId: voice.id,
      characteristics: this.createCharacteristics(voice),
      customSettings: {},
      created: new Date(),
      updated: new Date()
    }));
  }

  private createCharacteristics(voice: any): VoiceCharacteristics {
    const personality: string[] = [];
    
    switch (voice.id) {
      case 'alloy':
        personality.push('professional', 'neutral');
        break;
      case 'echo':
        personality.push('wise', 'contemplative');
        break;
      case 'fable':
        personality.push('dramatic', 'storytelling');
        break;
      case 'onyx':
        personality.push('confident', 'authoritative');
        break;
      case 'nova':
        personality.push('energetic', 'youthful');
        break;
      case 'shimmer':
        personality.push('calm', 'soothing');
        break;
    }

    return {
      gender: voice.gender as 'male' | 'female',
      age: voice.id === 'nova' ? 'young' : 'adult',
      accent: 'american',
      personality,
      defaultEmotion: {
        type: personality.includes('calm') ? 'calm' : 
              personality.includes('energetic') ? 'excited' : 'neutral',
        intensity: 0.5,
        variations: []
      },
      timbre: voice.id === 'onyx' ? 'deep' : 'medium',
      pace: 'normal'
    };
  }

  async createVoiceProfile(prompt: string): Promise<VoiceProfile> {
    // Parse the prompt to find best matching OpenAI voice
    const voices = await this.listVoices();
    const promptLower = prompt.toLowerCase();
    
    let bestMatch = voices[0]; // Default to alloy
    
    // Simple matching logic
    if (promptLower.includes('deep') || promptLower.includes('authoritative')) {
      bestMatch = voices.find(v => v.id === 'onyx') || bestMatch;
    } else if (promptLower.includes('young') || promptLower.includes('energetic')) {
      bestMatch = voices.find(v => v.id === 'nova') || bestMatch;
    } else if (promptLower.includes('calm') || promptLower.includes('soothing')) {
      bestMatch = voices.find(v => v.id === 'shimmer') || bestMatch;
    } else if (promptLower.includes('wise') || promptLower.includes('contemplative')) {
      bestMatch = voices.find(v => v.id === 'echo') || bestMatch;
    } else if (promptLower.includes('story') || promptLower.includes('dramatic')) {
      bestMatch = voices.find(v => v.id === 'fable') || bestMatch;
    }

    return {
      ...bestMatch,
      id: `openai-custom-${Date.now()}`,
      name: `Custom OpenAI Voice: ${bestMatch.name}`
    };
  }

  supportsEmotions(): boolean { 
    return false; // OpenAI TTS doesn't support emotion control
  }
  
  supportsVoiceCloning(): boolean { 
    return false; // OpenAI TTS doesn't support voice cloning
  }
}