import { describe, it, expect, beforeEach } from 'vitest';
import { ConversationManager } from '../src/core/conversation-manager.js';
import { CharacterManager } from '../src/core/character-manager.js';
import { DialogueParser } from '../src/utils/dialogue-parser.js';
import { AudioMixer } from '../src/utils/audio-mixer.js';
import { VoiceEngine } from '../src/core/voice-engine.js';
import {
  ConversationConfig,
  ConversationCharacter,
  DialogueLine,
  ConversationGenerationRequest
} from '../src/interfaces/conversation.interface.js';

describe('ConversationManager', () => {
  let conversationManager: ConversationManager;
  let voiceEngine: VoiceEngine;
  let mockCharacters: ConversationCharacter[];
  let mockDialogue: DialogueLine[];

  beforeEach(() => {
    voiceEngine = new VoiceEngine();
    conversationManager = new ConversationManager(voiceEngine);

    // Create mock characters
    mockCharacters = [
      {
        id: 'alice',
        name: 'Alice',
        voiceProfile: {
          id: 'alice_voice',
          name: 'Alice Voice',
          provider: 'elevenlabs',
          voiceId: 'alice-voice-id',
          characteristics: {
            gender: 'female',
            age: 'young_adult',
            accent: 'american',
            style: 'friendly',
            pace: 'normal',
            pitch: 'medium',
            energy: 'moderate',
            defaultEmotion: { type: 'happy', intensity: 0.7, variations: [] },
            languages: ['en']
          },
          customization: {
            stability: 0.8,
            similarity: 0.7,
            style_exaggeration: 0.5
          }
        },
        personality: {
          traits: [
            {
              name: 'friendliness',
              intensity: 0.8,
              manifestation: ['upward inflection', 'enthusiastic tone']
            }
          ],
          speakingStyle: {
            pace: 'normal',
            formality: 'casual',
            confidence: 0.7,
            enthusiasm: 0.8,
            interruption_tendency: 0.3
          },
          emotionalRange: {
            baseline: { type: 'happy', intensity: 0.7, variations: [] },
            volatility: 0.5,
            maxIntensity: 0.9,
            dominantEmotions: ['happy', 'excited']
          },
          verbosity: 'moderate'
        },
        speechPatterns: [],
        defaultEmotion: { type: 'happy', intensity: 0.7, variations: [] }
      },
      {
        id: 'bob',
        name: 'Bob',
        voiceProfile: {
          id: 'bob_voice',
          name: 'Bob Voice',
          provider: 'elevenlabs',
          voiceId: 'bob-voice-id',
          characteristics: {
            gender: 'male',
            age: 'adult',
            accent: 'american',
            style: 'professional',
            pace: 'slow',
            pitch: 'low',
            energy: 'low',
            defaultEmotion: { type: 'calm', intensity: 0.6, variations: [] },
            languages: ['en']
          },
          customization: {
            stability: 0.9,
            similarity: 0.8,
            style_exaggeration: 0.3
          }
        },
        personality: {
          traits: [
            {
              name: 'professionalism',
              intensity: 0.9,
              manifestation: ['formal language', 'measured pace']
            }
          ],
          speakingStyle: {
            pace: 'slow',
            formality: 'formal',
            confidence: 0.8,
            enthusiasm: 0.4,
            interruption_tendency: 0.1
          },
          emotionalRange: {
            baseline: { type: 'calm', intensity: 0.6, variations: [] },
            volatility: 0.2,
            maxIntensity: 0.7,
            dominantEmotions: ['calm', 'neutral']
          },
          verbosity: 'verbose'
        },
        speechPatterns: [],
        defaultEmotion: { type: 'calm', intensity: 0.6, variations: [] }
      }
    ];

    // Create mock dialogue
    mockDialogue = [
      {
        id: 'line_1',
        characterId: 'alice',
        text: 'Hello Bob! How are you doing today?',
        emotion: { type: 'happy', intensity: 0.8, variations: [] },
        timing: {
          startTime: 0,
          pauseBefore: 0,
          pauseAfter: 500
        }
      },
      {
        id: 'line_2',
        characterId: 'bob',
        text: 'Good morning, Alice. I am doing quite well, thank you for asking.',
        emotion: { type: 'calm', intensity: 0.6, variations: [] },
        timing: {
          startTime: 3000,
          pauseBefore: 500,
          pauseAfter: 300
        }
      },
      {
        id: 'line_3',
        characterId: 'alice',
        text: 'That\'s wonderful to hear! I have some exciting news to share.',
        emotion: { type: 'excited', intensity: 0.9, variations: [] },
        timing: {
          startTime: 7000,
          pauseBefore: 300,
          pauseAfter: 500
        }
      }
    ];
  });

  it('should create conversation manager', () => {
    expect(conversationManager).toBeInstanceOf(ConversationManager);
  });

  it('should validate conversation configuration', () => {
    const validConfig: ConversationConfig = {
      id: 'test_conversation',
      title: 'Test Conversation',
      characters: mockCharacters,
      dialogue: mockDialogue,
      globalSettings: {
        pauseBetweenLines: 500,
        crossfadeDuration: 200,
        masterVolume: 1.0,
        naturalTiming: true
      }
    };

    // This should not throw an error
    expect(() => {
      (conversationManager as any).validateConversationConfig(validConfig);
    }).not.toThrow();
  });

  it('should reject invalid conversation configuration', () => {
    const invalidConfig: ConversationConfig = {
      id: 'test_conversation',
      title: 'Test Conversation',
      characters: [], // Empty characters array
      dialogue: mockDialogue,
      globalSettings: {
        pauseBetweenLines: 500,
        crossfadeDuration: 200,
        masterVolume: 1.0,
        naturalTiming: true
      }
    };

    expect(() => {
      (conversationManager as any).validateConversationConfig(invalidConfig);
    }).toThrow('Conversation must have at least one character');
  });

  it('should process dialogue timing correctly', async () => {
    const globalSettings = {
      pauseBetweenLines: 500,
      crossfadeDuration: 200,
      masterVolume: 1.0,
      naturalTiming: true
    };

    const processedDialogue = await (conversationManager as any).processDialogueTiming(
      mockDialogue,
      globalSettings
    );

    expect(processedDialogue).toHaveLength(3);
    expect(processedDialogue[0].timing.startTime).toBe(0);
    expect(processedDialogue[1].timing.startTime).toBeGreaterThan(0);
    expect(processedDialogue[2].timing.startTime).toBeGreaterThan(processedDialogue[1].timing.startTime);
  });

  it('should create conversation timeline', () => {
    const mockAudioTracks = [
      {
        characterId: 'alice',
        characterName: 'Alice',
        audioBuffer: Buffer.alloc(1000),
        segments: [
          {
            lineId: 'line_1',
            startTime: 0,
            endTime: 3000,
            text: 'Hello Bob!',
            emotion: { type: 'happy', intensity: 0.8, variations: [] },
            audioBuffer: Buffer.alloc(500)
          }
        ],
        totalDuration: 3000
      }
    ];

    const timeline = (conversationManager as any).createConversationTimeline(
      mockDialogue,
      mockAudioTracks
    );

    expect(timeline).toBeDefined();
    expect(timeline.events).toBeDefined();
    expect(timeline.totalDuration).toBeGreaterThan(0);
    expect(timeline.characterUsage).toBeDefined();
  });

  it('should calculate conversation statistics', () => {
    const mockAudioTracks = [
      {
        characterId: 'alice',
        characterName: 'Alice',
        audioBuffer: Buffer.alloc(1000),
        segments: [],
        totalDuration: 5000
      },
      {
        characterId: 'bob',
        characterName: 'Bob',
        audioBuffer: Buffer.alloc(1000),
        segments: [],
        totalDuration: 4000
      }
    ];

    const mockTimeline = {
      totalDuration: 10000,
      events: [],
      characterUsage: {
        alice: 5000,
        bob: 4000
      }
    };

    const stats = (conversationManager as any).calculateConversationStatistics(
      mockDialogue,
      mockAudioTracks,
      mockTimeline
    );

    expect(stats.totalLines).toBe(3);
    expect(stats.totalWords).toBeGreaterThan(0);
    expect(stats.characterStats).toBeDefined();
    expect(stats.characterStats.alice).toBeDefined();
    expect(stats.characterStats.bob).toBeDefined();
  });

  it('should get manager statistics', () => {
    const stats = conversationManager.getManagerStatistics();
    
    expect(stats).toBeDefined();
    expect(stats.charactersManaged).toBeDefined();
    expect(stats.conversationsGenerated).toBeDefined();
    expect(stats.totalAudioGenerated).toBeDefined();
  });
});

describe('CharacterManager', () => {
  let characterManager: CharacterManager;

  beforeEach(() => {
    characterManager = new CharacterManager();
  });

  it('should create character manager', () => {
    expect(characterManager).toBeInstanceOf(CharacterManager);
  });

  it('should add character successfully', async () => {
    const character: ConversationCharacter = {
      id: 'test_character',
      name: 'Test Character',
      voiceProfile: {
        id: 'test_voice',
        name: 'Test Voice',
        provider: 'elevenlabs',
        voiceId: 'test-voice-id',
        characteristics: {
          gender: 'neutral',
          age: 'adult',
          accent: 'american',
          style: 'neutral',
          pace: 'normal',
          pitch: 'medium',
          energy: 'moderate',
          defaultEmotion: { type: 'neutral', intensity: 0.5, variations: [] },
          languages: ['en']
        },
        customization: {
          stability: 0.8,
          similarity: 0.7,
          style_exaggeration: 0.4
        }
      },
      personality: {
        traits: [],
        speakingStyle: {
          pace: 'normal',
          formality: 'professional',
          confidence: 0.6,
          enthusiasm: 0.5,
          interruption_tendency: 0.3
        },
        emotionalRange: {
          baseline: { type: 'neutral', intensity: 0.5, variations: [] },
          volatility: 0.4,
          maxIntensity: 0.7,
          dominantEmotions: ['neutral']
        },
        verbosity: 'moderate'
      },
      speechPatterns: [],
      defaultEmotion: { type: 'neutral', intensity: 0.5, variations: [] }
    };

    await characterManager.addCharacter(character);
    const retrieved = characterManager.getCharacter('test_character');
    
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe('Test Character');
  });

  it('should create character from description', async () => {
    const character = await characterManager.createCharacterFromDescription(
      'Friendly Assistant',
      'A warm, friendly female voice with enthusiasm and confidence'
    );

    expect(character.name).toBe('Friendly Assistant');
    expect(character.id).toBe('friendly_assistant');
    expect(character.voiceProfile).toBeDefined();
    expect(character.personality).toBeDefined();
  });

  it('should clone character with modifications', async () => {
    const originalCharacter: ConversationCharacter = {
      id: 'original',
      name: 'Original Character',
      voiceProfile: {
        id: 'original_voice',
        name: 'Original Voice',
        provider: 'elevenlabs',
        voiceId: 'original-voice-id',
        characteristics: {
          gender: 'female',
          age: 'adult',
          accent: 'american',
          style: 'friendly',
          pace: 'normal',
          pitch: 'medium',
          energy: 'moderate',
          defaultEmotion: { type: 'happy', intensity: 0.7, variations: [] },
          languages: ['en']
        },
        customization: {
          stability: 0.8,
          similarity: 0.7,
          style_exaggeration: 0.5
        }
      },
      personality: {
        traits: [],
        speakingStyle: {
          pace: 'normal',
          formality: 'casual',
          confidence: 0.7,
          enthusiasm: 0.8,
          interruption_tendency: 0.3
        },
        emotionalRange: {
          baseline: { type: 'happy', intensity: 0.7, variations: [] },
          volatility: 0.5,
          maxIntensity: 0.9,
          dominantEmotions: ['happy']
        },
        verbosity: 'moderate'
      },
      speechPatterns: [],
      defaultEmotion: { type: 'happy', intensity: 0.7, variations: [] }
    };

    await characterManager.addCharacter(originalCharacter);
    
    const cloned = characterManager.cloneCharacter('original', 'cloned', 'Cloned Character');
    
    expect(cloned.id).toBe('cloned');
    expect(cloned.name).toBe('Cloned Character');
    expect(cloned.voiceProfile.characteristics.gender).toBe('female');
  });

  it('should get available voice templates', () => {
    const templates = characterManager.getVoiceTemplates();
    
    expect(templates).toContain('narrator');
    expect(templates).toContain('friendly');
    expect(templates).toContain('serious');
  });

  it('should create character from template', async () => {
    const character = await characterManager.createCharacterFromTemplate(
      'Test Narrator',
      'narrator'
    );

    expect(character.name).toBe('Test Narrator');
    expect(character.voiceProfile.characteristics.style).toBe('professional');
  });

  it('should export and import character', async () => {
    const character: ConversationCharacter = {
      id: 'export_test',
      name: 'Export Test',
      voiceProfile: {
        id: 'export_voice',
        name: 'Export Voice',
        provider: 'elevenlabs',
        voiceId: 'export-voice-id',
        characteristics: {
          gender: 'neutral',
          age: 'adult',
          accent: 'american',
          style: 'neutral',
          pace: 'normal',
          pitch: 'medium',
          energy: 'moderate',
          defaultEmotion: { type: 'neutral', intensity: 0.5, variations: [] },
          languages: ['en']
        },
        customization: {
          stability: 0.8,
          similarity: 0.7,
          style_exaggeration: 0.4
        }
      },
      personality: {
        traits: [],
        speakingStyle: {
          pace: 'normal',
          formality: 'professional',
          confidence: 0.6,
          enthusiasm: 0.5,
          interruption_tendency: 0.3
        },
        emotionalRange: {
          baseline: { type: 'neutral', intensity: 0.5, variations: [] },
          volatility: 0.4,
          maxIntensity: 0.7,
          dominantEmotions: ['neutral']
        },
        verbosity: 'moderate'
      },
      speechPatterns: [],
      defaultEmotion: { type: 'neutral', intensity: 0.5, variations: [] }
    };

    await characterManager.addCharacter(character);
    
    const exported = characterManager.exportCharacter('export_test');
    expect(exported).toBeDefined();
    expect(exported?.name).toBe('Export Test');

    // Clear and import
    characterManager.clear();
    expect(characterManager.getCharacterCount()).toBe(0);

    await characterManager.importCharacter(exported!);
    expect(characterManager.getCharacterCount()).toBe(1);
    
    const imported = characterManager.getCharacter('export_test');
    expect(imported?.name).toBe('Export Test');
  });
});

describe('DialogueParser', () => {
  let parser: DialogueParser;

  beforeEach(() => {
    parser = new DialogueParser();
  });

  it('should create dialogue parser', () => {
    expect(parser).toBeInstanceOf(DialogueParser);
  });

  it('should parse chat format correctly', () => {
    const chatScript = `Alice: Hello there!
Bob: Hi Alice, how are you?
Alice: I'm doing great, thanks for asking!`;

    const result = parser.parseScript(chatScript);

    expect(result.formatType).toBe('chat');
    expect(result.characters.size).toBe(2);
    expect(result.characters.has('ALICE')).toBe(true);
    expect(result.characters.has('BOB')).toBe(true);
    expect(result.lines).toHaveLength(3);
  });

  it('should parse screenplay format', () => {
    const screenplay = `JOHN
    (excited)
Hello everyone!

MARY
Nice to see you, John.`;

    const result = parser.parseScript(screenplay);

    expect(result.characters.size).toBeGreaterThan(0);
    expect(result.lines.length).toBeGreaterThan(0);
  });

  it('should extract characters from script', () => {
    const script = `Alice: Hello!
Bob: Hi there!
Charlie: Good morning!`;

    const characters = parser.extractCharacters(script);

    expect(characters).toContain('ALICE');
    expect(characters).toContain('BOB');
    expect(characters).toContain('CHARLIE');
  });

  it('should validate parsed dialogue', () => {
    const validResult = {
      characters: new Set(['ALICE', 'BOB']),
      lines: [
        {
          character: 'ALICE',
          text: 'Hello Bob!',
          line_number: 1
        },
        {
          character: 'BOB',
          text: 'Hi Alice!',
          line_number: 2
        }
      ],
      formatType: 'chat' as const
    };

    const validation = parser.validateParsedDialogue(validResult);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should get dialogue statistics', () => {
    const result = {
      characters: new Set(['ALICE', 'BOB']),
      lines: [
        {
          character: 'ALICE',
          text: 'Hello Bob, how are you doing today?',
          line_number: 1
        },
        {
          character: 'BOB',
          text: 'Hi Alice!',
          line_number: 2
        }
      ],
      formatType: 'chat' as const
    };

    const stats = parser.getDialogueStatistics(result);

    expect(stats.characterCount).toBe(2);
    expect(stats.lineCount).toBe(2);
    expect(stats.wordCount).toBeGreaterThan(0);
    expect(stats.mostActiveCharacter).toBe('ALICE');
  });
});

describe('AudioMixer', () => {
  let audioMixer: AudioMixer;

  beforeEach(() => {
    audioMixer = new AudioMixer();
  });

  it('should create audio mixer', () => {
    expect(audioMixer).toBeInstanceOf(AudioMixer);
  });

  it('should create silence buffer', () => {
    const silence = audioMixer.createSilence(1000, {
      sampleRate: 44100,
      bitDepth: 16,
      channels: 2
    });

    expect(silence).toBeInstanceOf(Buffer);
    expect(silence.length).toBeGreaterThan(0);
    
    // Check that it's actually silent (all zeros)
    const isAllZeros = silence.every(byte => byte === 0);
    expect(isAllZeros).toBe(true);
  });

  it('should get mixer capabilities', () => {
    const capabilities = audioMixer.getCapabilities();

    expect(capabilities.maxTracks).toBeGreaterThan(0);
    expect(capabilities.supportedFormats).toContain('wav');
    expect(capabilities.supportedFormats).toContain('mp3');
    expect(capabilities.supportedSampleRates).toContain(44100);
    expect(capabilities.supportsSpatialAudio).toBe(true);
    expect(capabilities.supportsCompression).toBe(true);
  });
});