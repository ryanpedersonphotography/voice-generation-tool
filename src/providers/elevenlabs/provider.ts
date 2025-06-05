import { VoiceProvider } from '../../core/provider.base.js';
import { VoiceProfile, GenerationRequest, VoiceModulation, VoiceCharacteristics } from '../../interfaces/voice.interface.js';
import axios from 'axios';

export class ElevenLabsProvider extends VoiceProvider {
  name = 'elevenlabs';
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

  async initialize(): Promise<void> {
    try {
      const response = await axios.get(`${this.baseUrl}/user`, {
        headers: { 'xi-api-key': this.apiKey }
      });
      if (response.status !== 200) {
        throw new Error('Invalid ElevenLabs API key');
      }
    } catch (error) {
      throw new Error(`ElevenLabs initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async generateSpeech(request: GenerationRequest): Promise<Buffer> {
    const voiceId = request.voiceProfile?.baseVoiceId || '9BWtsMINqrJLrRacOk9x'; // Default Aria voice
    
    const payload = {
      text: request.text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: this.mapEmotionToVoiceSettings(request.modulation)
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/text-to-speech/${voiceId}`,
        payload,
        {
          headers: {
            'Accept': 'audio/mpeg',
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer'
        }
      );

      return Buffer.from(response.data);
    } catch (error) {
      throw new Error(`ElevenLabs speech generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private mapEmotionToVoiceSettings(modulation?: VoiceModulation) {
    if (!modulation) return { stability: 0.5, similarity_boost: 0.5 };
    
    // Map emotions to ElevenLabs parameters
    const emotionMappings = {
      happy: { stability: 0.3, similarity_boost: 0.7, style: 0.8 },
      sad: { stability: 0.7, similarity_boost: 0.5, style: 0.2 },
      angry: { stability: 0.2, similarity_boost: 0.8, style: 0.9 },
      excited: { stability: 0.1, similarity_boost: 0.9, style: 0.9 },
      calm: { stability: 0.8, similarity_boost: 0.6, style: 0.4 },
      fearful: { stability: 0.4, similarity_boost: 0.7, style: 0.6 },
      surprised: { stability: 0.2, similarity_boost: 0.8, style: 0.7 },
      neutral: { stability: 0.5, similarity_boost: 0.5, style: 0.5 }
    };

    const baseSettings = emotionMappings[modulation.emotion.type] || { stability: 0.5, similarity_boost: 0.5, style: 0.5 };
    
    // Adjust based on intensity
    const intensity = modulation.emotion.intensity;
    baseSettings.stability = Math.max(0, Math.min(1, baseSettings.stability + (intensity - 0.5) * 0.2));
    baseSettings.similarity_boost = Math.max(0, Math.min(1, baseSettings.similarity_boost + (intensity - 0.5) * 0.2));
    
    return baseSettings;
  }

  async listVoices(): Promise<VoiceProfile[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/voices`, {
        headers: { 'xi-api-key': this.apiKey }
      });

      return response.data.voices.map(voice => ({
        id: voice.voice_id,
        name: voice.name,
        provider: 'elevenlabs' as const,
        baseVoiceId: voice.voice_id,
        characteristics: this.extractCharacteristics(voice),
        customSettings: voice.settings || {},
        created: new Date(),
        updated: new Date()
      }));
    } catch (error) {
      throw new Error(`Failed to list ElevenLabs voices: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async createVoiceProfile(prompt: string): Promise<VoiceProfile> {
    // For now, create a profile based on available voices and prompt analysis
    const voices = await this.listVoices();
    const characteristics = this.parseVoicePrompt(prompt);
    
    // Find best matching voice
    const bestMatch = this.findBestVoiceMatch(voices, characteristics);
    
    return {
      id: `custom-${Date.now()}`,
      name: `Custom Voice from: ${prompt.substring(0, 50)}...`,
      provider: 'elevenlabs',
      baseVoiceId: bestMatch.baseVoiceId,
      characteristics,
      customSettings: {},
      created: new Date(),
      updated: new Date()
    };
  }

  private parseVoicePrompt(prompt: string): VoiceCharacteristics {
    const lowerPrompt = prompt.toLowerCase();
    
    // Extract gender
    let gender: 'male' | 'female' | 'neutral' = 'neutral';
    if (lowerPrompt.includes('male') && !lowerPrompt.includes('female')) gender = 'male';
    if (lowerPrompt.includes('female')) gender = 'female';
    if (lowerPrompt.includes('woman')) gender = 'female';
    if (lowerPrompt.includes('man')) gender = 'male';
    
    // Extract age
    let age: 'child' | 'young' | 'adult' | 'senior' = 'adult';
    if (lowerPrompt.includes('child') || lowerPrompt.includes('kid')) age = 'child';
    if (lowerPrompt.includes('young') || lowerPrompt.includes('teen')) age = 'young';
    if (lowerPrompt.includes('old') || lowerPrompt.includes('senior') || lowerPrompt.includes('elderly')) age = 'senior';
    
    // Extract accent
    let accent = 'neutral';
    if (lowerPrompt.includes('british') || lowerPrompt.includes('uk')) accent = 'british';
    if (lowerPrompt.includes('american') || lowerPrompt.includes('us')) accent = 'american';
    if (lowerPrompt.includes('australian')) accent = 'australian';
    
    // Extract personality traits
    const personality: string[] = [];
    if (lowerPrompt.includes('cheerful') || lowerPrompt.includes('happy')) personality.push('cheerful');
    if (lowerPrompt.includes('calm') || lowerPrompt.includes('peaceful')) personality.push('calm');
    if (lowerPrompt.includes('energetic') || lowerPrompt.includes('excited')) personality.push('energetic');
    if (lowerPrompt.includes('wise') || lowerPrompt.includes('contemplative')) personality.push('wise');
    if (lowerPrompt.includes('friendly')) personality.push('friendly');
    if (lowerPrompt.includes('professional')) personality.push('professional');
    
    // Extract timbre
    let timbre: 'deep' | 'medium' | 'high' = 'medium';
    if (lowerPrompt.includes('deep') || lowerPrompt.includes('low')) timbre = 'deep';
    if (lowerPrompt.includes('high') || lowerPrompt.includes('light')) timbre = 'high';
    
    // Extract pace
    let pace: 'slow' | 'normal' | 'fast' = 'normal';
    if (lowerPrompt.includes('slow') || lowerPrompt.includes('relaxed')) pace = 'slow';
    if (lowerPrompt.includes('fast') || lowerPrompt.includes('quick')) pace = 'fast';
    
    return {
      gender,
      age,
      accent,
      personality,
      defaultEmotion: {
        type: personality.includes('cheerful') ? 'happy' : 
              personality.includes('calm') ? 'calm' : 'neutral',
        intensity: 0.5,
        variations: []
      },
      timbre,
      pace
    };
  }

  private findBestVoiceMatch(voices: VoiceProfile[], characteristics: VoiceCharacteristics): VoiceProfile {
    // Simple matching based on name patterns for now
    // In a real implementation, this would use voice analysis
    
    const genderMatches = voices.filter(v => {
      const name = v.name.toLowerCase();
      if (characteristics.gender === 'male') return !name.includes('female') && (name.includes('male') || name.includes('man') || name.includes('adam') || name.includes('arnold'));
      if (characteristics.gender === 'female') return name.includes('female') || name.includes('woman') || name.includes('aria') || name.includes('bella');
      return true;
    });
    
    return genderMatches.length > 0 ? genderMatches[0] : voices[0];
  }

  protected extractCharacteristics(voice: any): VoiceCharacteristics {
    const name = voice.name.toLowerCase();
    
    return {
      gender: name.includes('female') || name.includes('aria') || name.includes('bella') ? 'female' : 
              name.includes('male') || name.includes('adam') || name.includes('arnold') ? 'male' : 'neutral',
      age: name.includes('young') ? 'young' : 'adult',
      accent: 'neutral', // ElevenLabs doesn't provide accent info in API
      personality: [],
      defaultEmotion: {
        type: 'neutral',
        intensity: 0.5,
        variations: []
      },
      timbre: 'medium',
      pace: 'normal'
    };
  }

  supportsEmotions(): boolean { 
    return true; 
  }
  
  supportsVoiceCloning(): boolean { 
    return true; 
  }
}