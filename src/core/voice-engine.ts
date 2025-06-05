import { VoiceProvider } from './provider.base.js';
import { GenerationRequest, VoiceProfile, VoiceCharacteristics } from '../interfaces/voice.interface.js';
import { ElevenLabsProvider } from '../providers/elevenlabs/provider.js';
import { OpenAIProvider } from '../providers/openai/provider.js';
import { parseVoicePrompt } from '../utils/prompt-parser.js';
import { AudioProcessor } from '../utils/audio-processor.js';

export class VoiceEngine {
  private providers: Map<string, VoiceProvider> = new Map();
  private audioProcessor: AudioProcessor;
  private initialized = false;

  constructor() {
    this.audioProcessor = new AudioProcessor();
  }

  async initialize() {
    if (this.initialized) return;

    // Initialize all configured providers
    if (process.env.ELEVENLABS_API_KEY) {
      try {
        const elevenlabs = new ElevenLabsProvider(process.env.ELEVENLABS_API_KEY);
        await elevenlabs.initialize();
        this.providers.set('elevenlabs', elevenlabs);
        console.log('✅ ElevenLabs provider initialized');
      } catch (error) {
        console.warn('⚠️ ElevenLabs provider failed to initialize:', error instanceof Error ? error.message : String(error));
      }
    }

    if (process.env.OPENAI_API_KEY) {
      try {
        const openai = new OpenAIProvider(process.env.OPENAI_API_KEY);
        await openai.initialize();
        this.providers.set('openai', openai);
        console.log('✅ OpenAI provider initialized');
      } catch (error) {
        console.warn('⚠️ OpenAI provider failed to initialize:', error instanceof Error ? error.message : String(error));
      }
    }

    if (this.providers.size === 0) {
      throw new Error('No voice providers are available. Please configure API keys.');
    }

    this.initialized = true;
    console.log(`🎵 Voice Engine initialized with ${this.providers.size} provider(s)`);
  }

  async generateVoice(request: GenerationRequest): Promise<Buffer> {
    await this.initialize();

    // Parse voice prompt if provided
    if (request.voicePrompt && !request.voiceProfile) {
      request.voiceProfile = await this.createVoiceFromPrompt(request.voicePrompt);
    }

    // Select appropriate provider
    const provider = this.selectProvider(request);
    
    if (!provider) {
      throw new Error('No suitable voice provider available for this request');
    }
    
    if (!provider) {
      throw new Error('No suitable voice provider available for this request');
    }

    console.log(`🎤 Generating voice using ${provider.name} provider`);
    
    // Generate raw audio
    const audioBuffer = await provider.generateSpeech(request);
    
    // Post-process audio
    const processedAudio = await this.audioProcessor.process(audioBuffer, {
      format: request.outputFormat,
      normalize: true,
      removeNoise: true
    });

    console.log(`✅ Voice generated successfully (${processedAudio.length} bytes)`);
    return processedAudio;
  }

  private async createVoiceFromPrompt(prompt: string): Promise<VoiceProfile> {
    const characteristics = parseVoicePrompt(prompt);
    
    // Find best matching provider and voice
    const provider = this.getBestProvider(characteristics);
    return provider.createVoiceProfile(prompt);
  }

  private selectProvider(request: GenerationRequest): VoiceProvider {
    if (request.voiceProfile) {
      const provider = this.providers.get(request.voiceProfile.provider);
      if (provider) return provider;
    }
    
    // Default to most capable provider
    // Prefer ElevenLabs for emotion control, OpenAI for general use
    if (request.modulation?.emotion && this.providers.has('elevenlabs')) {
      const provider = this.providers.get('elevenlabs');
      if (provider) return provider;
    }
    
    const defaultProvider = this.providers.get('elevenlabs') || 
                           this.providers.get('openai') || 
                           this.providers.values().next().value;
    
    if (!defaultProvider) {
      throw new Error('No voice providers available');
    }
    
    return defaultProvider;
  }

  private getBestProvider(characteristics: VoiceCharacteristics): VoiceProvider {
    // If we need emotion control, prefer ElevenLabs
    if (characteristics.defaultEmotion.type !== 'neutral' && this.providers.has('elevenlabs')) {
      const provider = this.providers.get('elevenlabs');
      if (provider) return provider;
    }
    
    // Otherwise, use any available provider
    const defaultProvider = this.providers.get('elevenlabs') || 
                           this.providers.get('openai') || 
                           this.providers.values().next().value;
    
    if (!defaultProvider) {
      throw new Error('No voice providers available');
    }
    
    return defaultProvider;
  }

  async listAvailableVoices(): Promise<VoiceProfile[]> {
    await this.initialize();
    
    const allVoices: VoiceProfile[] = [];
    
    for (const provider of this.providers.values()) {
      try {
        const voices = await provider.listVoices();
        allVoices.push(...voices);
      } catch (error) {
        console.warn(`Failed to list voices for ${provider.name}:`, error instanceof Error ? error.message : String(error));
      }
    }
    
    return allVoices;
  }

  async getProviderCapabilities(): Promise<Record<string, any>> {
    await this.initialize();
    
    const capabilities: Record<string, any> = {};
    
    for (const [name, provider] of this.providers) {
      capabilities[name] = {
        supportsEmotions: provider.supportsEmotions(),
        supportsVoiceCloning: provider.supportsVoiceCloning(),
        available: true
      };
    }
    
    return capabilities;
  }

  async generateBatch(requests: GenerationRequest[]): Promise<Buffer[]> {
    const results: Buffer[] = [];
    
    for (const request of requests) {
      try {
        const audio = await this.generateVoice(request);
        results.push(audio);
      } catch (error) {
        console.error(`Batch generation failed for request:`, error instanceof Error ? error.message : String(error));
        // Continue with other requests
        results.push(Buffer.alloc(0)); // Empty buffer for failed request
      }
    }
    
    return results;
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}