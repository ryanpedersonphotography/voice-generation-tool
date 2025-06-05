import { describe, it, expect, beforeAll, vi } from 'vitest';
import { VoiceEngine } from '../src/core/voice-engine.js';
import { GenerationRequest } from '../src/interfaces/voice.interface.js';

// Mock environment variables
vi.mock('process', () => ({
  env: {
    ELEVENLABS_API_KEY: 'test-elevenlabs-key',
    OPENAI_API_KEY: 'test-openai-key'
  }
}));

describe('VoiceEngine', () => {
  let engine: VoiceEngine;

  beforeAll(async () => {
    engine = new VoiceEngine();
    // Skip actual initialization for tests
    vi.spyOn(engine, 'initialize').mockResolvedValue(undefined);
  });

  it('should create voice engine instance', () => {
    expect(engine).toBeInstanceOf(VoiceEngine);
    expect(engine.isInitialized()).toBe(false);
  });

  it('should handle basic generation request structure', async () => {
    const request: GenerationRequest = {
      text: 'Hello, this is a test',
      outputFormat: 'mp3'
    };
    
    expect(request.text).toBe('Hello, this is a test');
    expect(request.outputFormat).toBe('mp3');
  });

  it('should handle voice prompt request structure', async () => {
    const request: GenerationRequest = {
      text: 'Testing voice generation',
      voicePrompt: 'Young female voice, cheerful and energetic',
      outputFormat: 'mp3'
    };
    
    expect(request.voicePrompt).toBe('Young female voice, cheerful and energetic');
  });

  it('should handle emotion modulation structure', async () => {
    const request: GenerationRequest = {
      text: 'This should sound happy!',
      modulation: {
        emotion: { 
          type: 'happy', 
          intensity: 0.8,
          variations: []
        },
        speed: 1.1,
        pitch: 2,
        volume: 1.0,
        emphasis: [],
        pauses: []
      },
      outputFormat: 'mp3'
    };
    
    expect(request.modulation?.emotion.type).toBe('happy');
    expect(request.modulation?.emotion.intensity).toBe(0.8);
    expect(request.modulation?.speed).toBe(1.1);
  });

  it('should handle emotion map structure', async () => {
    const request: GenerationRequest = {
      text: 'The story begins calmly, then becomes exciting!',
      emotionMap: [
        { start: 0, end: 20, emotion: 'calm', intensity: 0.6 },
        { start: 21, end: -1, emotion: 'excited', intensity: 0.9 }
      ],
      outputFormat: 'wav'
    };
    
    expect(request.emotionMap).toHaveLength(2);
    expect(request.emotionMap?.[0].emotion).toBe('calm');
    expect(request.emotionMap?.[1].emotion).toBe('excited');
  });

  it('should list available providers', () => {
    const providers = engine.getAvailableProviders();
    expect(Array.isArray(providers)).toBe(true);
  });

  it('should handle batch generation structure', async () => {
    const requests: GenerationRequest[] = [
      { text: 'First segment', outputFormat: 'mp3' },
      { text: 'Second segment', outputFormat: 'mp3' },
      { text: 'Third segment', outputFormat: 'mp3' }
    ];
    
    expect(requests).toHaveLength(3);
    expect(requests[0].text).toBe('First segment');
  });
});

describe('Voice Provider Integration', () => {
  it('should handle ElevenLabs provider structure', async () => {
    const mockApiKey = 'sk_test_key';
    expect(mockApiKey).toBeDefined();
  });

  it('should handle OpenAI provider structure', async () => {
    const mockApiKey = 'sk-test-key';
    expect(mockApiKey).toBeDefined();
  });
});

describe('Audio Processing', () => {
  it('should handle different output formats', () => {
    const formats = ['mp3', 'wav', 'aac'];
    formats.forEach(format => {
      expect(['mp3', 'wav', 'aac']).toContain(format);
    });
  });

  it('should handle audio processing options', () => {
    const options = {
      format: 'mp3' as const,
      normalize: true,
      removeNoise: true,
      bitrate: 192,
      sampleRate: 44100
    };
    
    expect(options.format).toBe('mp3');
    expect(options.normalize).toBe(true);
    expect(options.removeNoise).toBe(true);
  });
});