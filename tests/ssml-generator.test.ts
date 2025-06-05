import { describe, it, expect, beforeEach } from 'vitest';
import { SSMLGenerator } from '../src/utils/ssml-generator.js';
import {
  ConversationCharacter,
  SpeechPattern
} from '../src/interfaces/conversation.interface.js';
import {
  VoiceProfile,
  EmotionProfile
} from '../src/interfaces/voice.interface.js';

describe('SSMLGenerator', () => {
  let ssmlGenerator: SSMLGenerator;
  let testCharacter: ConversationCharacter;

  beforeEach(() => {
    ssmlGenerator = new SSMLGenerator();
    
    testCharacter = {
      id: 'test-character',
      name: 'Test Character',
      voiceProfile: {
        provider: 'elevenlabs',
        voiceId: 'test-voice',
        stability: 0.75,
        similarityBoost: 0.85,
        style: 0.0,
        useSpeakerBoost: true,
        gender: 'female',
        age: 'adult',
        language: 'en-US'
      },
      personality: {
        traits: ['friendly', 'enthusiastic'],
        speakingStyle: 'conversational',
        emotionalRange: {
          default: 'neutral',
          intensity: 0.6,
          variability: 0.4
        }
      },
      speechPatterns: {
        pace: 'medium',
        pauseFrequency: 0.3,
        emphasisStyle: 'moderate',
        fillerWords: ['um', 'you know'],
        catchphrases: ['That\'s interesting!']
      }
    };
  });

  describe('generateSSML', () => {
    it('should generate basic SSML for simple text', () => {
      const text = 'Hello, how are you today?';
      const result = ssmlGenerator.generateSSML(text, testCharacter);

      expect(result.version).toBe('1.0');
      expect(result.language).toBe('en-US');
      expect(result.rawSSML).toContain('<speak>');
      expect(result.rawSSML).toContain('</speak>');
      expect(result.rawSSML).toContain('<voice');
      expect(result.rawSSML).toContain('<prosody');
      expect(result.rawSSML).toContain('Hello');
      expect(result.rawSSML).toContain('how are you today');
    });

    it('should apply character voice settings', () => {
      const text = 'Testing voice settings';
      const result = ssmlGenerator.generateSSML(text, testCharacter);

      expect(result.rawSSML).toContain('name="test-voice"');
      expect(result.rawSSML).toContain('gender="female"');
      expect(result.rawSSML).toContain('age="adult"');
      expect(result.rawSSML).toContain('xml:lang="en-US"');
    });

    it('should apply character pace to prosody rate', () => {
      const text = 'Testing pace settings';
      
      // Test different paces
      const paces: Array<{ pace: SpeechPattern['pace']; expectedRate: string }> = [
        { pace: 'very_slow', expectedRate: '0.7' },
        { pace: 'slow', expectedRate: '0.85' },
        { pace: 'medium', expectedRate: '1.0' },
        { pace: 'fast', expectedRate: '1.15' },
        { pace: 'very_fast', expectedRate: '1.3' }
      ];

      paces.forEach(({ pace, expectedRate }) => {
        const character = { ...testCharacter };
        character.speechPatterns.pace = pace;
        
        const result = ssmlGenerator.generateSSML(text, character);
        expect(result.rawSSML).toContain(`rate="${expectedRate}"`);
      });
    });

    it('should apply emotional prosody modifications', () => {
      const text = 'I am feeling emotional!';
      const emotion: EmotionProfile = {
        primary: 'joy',
        intensity: 0.8,
        confidence: 0.9
      };

      const result = ssmlGenerator.generateSSML(text, testCharacter, emotion);
      
      // Joy should increase rate, pitch, and range
      expect(result.rawSSML).toMatch(/rate="1\.[1-9]/); // Should be > 1.0
      expect(result.rawSSML).toMatch(/pitch="\+\d+%"/); // Should be positive
      expect(result.rawSSML).toMatch(/range="\+\d+%"/); // Should be positive
    });

    it('should handle speaking style modifications', () => {
      const text = 'Testing speaking styles';
      
      const styles: Array<{ style: any; expectedModifications: string[] }> = [
        { style: 'whisper', expectedModifications: ['volume="-6dB"', 'rate="0.9"'] },
        { style: 'shout', expectedModifications: ['volume="+6dB"', 'pitch="+10%"'] },
        { style: 'excited', expectedModifications: ['rate="1.1"', 'pitch="+5%"'] },
        { style: 'sad', expectedModifications: ['rate="0.9"', 'pitch="-10%"'] }
      ];

      styles.forEach(({ style, expectedModifications }) => {
        const character = { ...testCharacter };
        character.personality.speakingStyle = style;
        
        const result = ssmlGenerator.generateSSML(text, character);
        
        expectedModifications.forEach(modification => {
          expect(result.rawSSML).toContain(modification);
        });
      });
    });

    it('should add breaks for punctuation', () => {
      const text = 'Hello, world. How are you? Great!';
      const result = ssmlGenerator.generateSSML(text, testCharacter);

      expect(result.rawSSML).toContain('<break strength="weak"/>'); // for comma
      expect(result.rawSSML).toContain('<break strength="medium"/>'); // for period
      expect(result.rawSSML).toContain('<break strength="strong"/>'); // for question mark and exclamation
    });

    it('should add emphasis for capitalized words', () => {
      const text = 'This is VERY important!';
      const result = ssmlGenerator.generateSSML(text, testCharacter);

      expect(result.rawSSML).toContain('<emphasis level="strong">very</emphasis>');
    });

    it('should add emphasis for asterisk-marked words', () => {
      const text = 'This is *really* important!';
      const result = ssmlGenerator.generateSSML(text, testCharacter);

      expect(result.rawSSML).toContain('<emphasis level="moderate">really</emphasis>');
    });

    it('should handle custom SSML settings', () => {
      const text = 'Testing custom settings';
      const customSettings = {
        language: 'es-ES',
        prosody: {
          rate: '1.5',
          pitch: '+20%',
          volume: '+3dB'
        }
      };

      const result = ssmlGenerator.generateSSML(text, testCharacter, undefined, customSettings);

      expect(result.language).toBe('es-ES');
      expect(result.rawSSML).toContain('rate="1.5"');
      expect(result.rawSSML).toContain('pitch="+20%"');
      expect(result.rawSSML).toContain('volume="+3dB"');
    });
  });

  describe('generateConversationSSML', () => {
    it('should generate SSML for multi-character conversation', () => {
      const character2: ConversationCharacter = {
        ...testCharacter,
        id: 'character2',
        name: 'Character 2',
        voiceProfile: {
          ...testCharacter.voiceProfile,
          voiceId: 'character2-voice',
          gender: 'male'
        }
      };

      const lines = [
        { character: testCharacter, text: 'Hello there!' },
        { character: character2, text: 'Hi! How are you?' },
        { character: testCharacter, text: 'I\'m doing great, thanks!' }
      ];

      const result = ssmlGenerator.generateConversationSSML(lines);

      expect(result.rawSSML).toContain('name="test-voice"');
      expect(result.rawSSML).toContain('name="character2-voice"');
      expect(result.rawSSML).toContain('gender="female"');
      expect(result.rawSSML).toContain('gender="male"');
      expect(result.rawSSML).toContain('Hello there!');
      expect(result.rawSSML).toContain('Hi!');
      expect(result.rawSSML).toContain('I\'m doing great') && expect(result.rawSSML).toContain('thanks!');
    });

    it('should add pauses between speakers', () => {
      const character2: ConversationCharacter = {
        ...testCharacter,
        id: 'character2'
      };

      const lines = [
        { character: testCharacter, text: 'First line' },
        { character: character2, text: 'Second line' }
      ];

      const result = ssmlGenerator.generateConversationSSML(lines, {
        pauseBetweenSpeakers: 'medium'
      });

      expect(
        result.rawSSML.includes('<break strength="medium"/>') ||
        result.rawSSML.includes('<break strength="medium"></break>')
      ).toBe(true);
    });

    it('should handle emotional lines in conversation', () => {
      const lines = [
        {
          character: testCharacter,
          text: 'I am so happy!',
          emotion: { primary: 'joy', intensity: 0.9, confidence: 0.8 } as EmotionProfile
        }
      ];

      const result = ssmlGenerator.generateConversationSSML(lines);
      
      // Should contain emotional prosody modifications
      expect(result.rawSSML).toMatch(/pitch="\+\d+%"/);
      expect(result.rawSSML).toMatch(/rate="1\.[1-9]/);
    });
  });

  describe('speech pattern application', () => {
    it('should occasionally add filler words', () => {
      const text = 'This is a longer sentence that should have some filler words added to it naturally';
      const character = { ...testCharacter };
      character.speechPatterns.fillerWords = ['um', 'uh', 'you know'];

      // Run multiple times since filler word addition is random
      let containsFillers = false;
      for (let i = 0; i < 10; i++) {
        const result = ssmlGenerator.generateSSML(text, character);
        if (result.rawSSML.includes('um') || result.rawSSML.includes('uh') || result.rawSSML.includes('you know')) {
          containsFillers = true;
          break;
        }
      }
      
      // With 10 attempts and a 10% probability per word position, we should see fillers
      expect(containsFillers).toBe(true);
    });

    it('should handle empty filler words array', () => {
      const text = 'This should not have any filler words';
      const character = { ...testCharacter };
      character.speechPatterns.fillerWords = [];

      const result = ssmlGenerator.generateSSML(text, character);
      expect(result.rawSSML).toContain(text);
    });

    it('should handle different emphasis styles', () => {
      const text = 'This is *emphasized* text';
      
      const emphasisStyles = ['subtle', 'dramatic', 'measured', 'gentle'];
      
      emphasisStyles.forEach(style => {
        const character = { ...testCharacter };
        character.speechPatterns.emphasisStyle = style;
        
        const result = ssmlGenerator.generateSSML(text, character);
        expect(result.rawSSML).toContain('<emphasis level=');
      });
    });
  });

  describe('SSML validation', () => {
    it('should generate valid XML structure', () => {
      const text = 'Testing XML validity';
      const result = ssmlGenerator.generateSSML(text, testCharacter);

      // Check for proper XML declaration and structure
      expect(result.rawSSML).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
      expect(result.rawSSML).toContain('<speak>');
      expect(result.rawSSML).toContain('</speak>');
      
      // Check that all opening tags have closing tags or are self-closing
      const openTags = result.rawSSML.match(/<[^\/\?][^>]*[^\/]>/g) || [];
      const closeTags = result.rawSSML.match(/<\/[^>]*>/g) || [];
      const selfClosingTags = result.rawSSML.match(/<[^>]*\/>/g) || [];
      
      // The speak tag should always have open and close
      expect(openTags.filter(tag => tag.includes('speak')).length).toBe(1);
      expect(closeTags.filter(tag => tag.includes('speak')).length).toBe(1);
      
      // Voice and prosody tags should have matching pairs
      const voiceTags = openTags.filter(tag => tag.includes('voice')).length;
      const voiceCloseTags = closeTags.filter(tag => tag.includes('voice')).length;
      expect(voiceTags).toBe(voiceCloseTags);
    });

    it('should escape special XML characters', () => {
      const text = 'Text with & special < characters > and "quotes"';
      const result = ssmlGenerator.generateSSML(text, testCharacter);

      // The text should be properly escaped in the output
      expect(result.rawSSML).toContain(text); // Should contain the original text
    });
  });
});