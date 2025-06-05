import { ConversationManager } from '../src/core/conversation-manager.js';
import { CharacterManager } from '../src/core/character-manager.js';
import { VoiceEngine } from '../src/core/voice-engine.js';
import { DialogueParser } from '../src/utils/dialogue-parser.js';
import { AudioMixer } from '../src/utils/audio-mixer.js';
import {
  ConversationConfig,
  ConversationCharacter,
  DialogueLine,
  AudioTrackResult
} from '../src/interfaces/conversation.interface.js';
import {
  VoiceProfile,
  EmotionProfile,
  SpeakingStyle
} from '../src/interfaces/voice.interface.js';

/**
 * Example 1: Simple Two-Character Dialogue
 */
async function simpleDialogueExample() {
  console.log('=== Simple Two-Character Dialogue Example ===');

  const conversationManager = new ConversationManager();
  const characterManager = new CharacterManager();

  // Define characters
  const alice: ConversationCharacter = {
    id: 'alice',
    name: 'Alice',
    voiceProfile: {
      provider: 'elevenlabs',
      voiceId: 'alice-voice',
      stability: 0.75,
      similarityBoost: 0.85,
      style: 0.0,
      useSpeakerBoost: true
    },
    personality: {
      traits: ['friendly', 'optimistic', 'curious'],
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
      emphasisStyle: 'subtle',
      fillerWords: ['um', 'you know'],
      catchphrases: ['That\'s interesting!']
    }
  };

  const bob: ConversationCharacter = {
    id: 'bob',
    name: 'Bob',
    voiceProfile: {
      provider: 'elevenlabs',
      voiceId: 'bob-voice',
      stability: 0.8,
      similarityBoost: 0.75,
      style: 0.2,
      useSpeakerBoost: true
    },
    personality: {
      traits: ['analytical', 'thoughtful', 'precise'],
      speakingStyle: 'formal',
      emotionalRange: {
        default: 'neutral',
        intensity: 0.4,
        variability: 0.2
      }
    },
    speechPatterns: {
      pace: 'slow',
      pauseFrequency: 0.5,
      emphasisStyle: 'measured',
      fillerWords: ['well', 'actually'],
      catchphrases: ['Let me think about that...']
    }
  };

  // Register characters
  characterManager.addCharacter(alice);
  characterManager.addCharacter(bob);

  // Define dialogue script
  const script = `
    Alice: Hey Bob! Have you heard about the new AI developments?
    Bob: Well, actually, I've been following them quite closely. What specifically interests you?
    Alice: The voice generation technology is amazing! It's like we're living in the future.
    Bob: Let me think about that... The technology is impressive, but we should consider the implications.
    Alice: That's interesting! What kind of implications are you thinking about?
    Bob: Privacy, authenticity, and the potential for misuse. We need to be thoughtful about adoption.
  `;

  // Configure conversation
  const config: ConversationConfig = {
    characters: [alice, bob],
    globalSettings: {
      backgroundMusic: false,
      ambientSounds: false,
      crossfadeDuration: 0.2,
      overallPace: 'natural'
    },
    outputFormat: {
      sampleRate: 44100,
      bitDepth: 16,
      channels: 2,
      format: 'mp3'
    }
  };

  try {
    // Generate conversation
    const result = await conversationManager.generateConversation(script, config);
    
    console.log(`Generated conversation with ${result.segments.length} segments`);
    console.log(`Total duration: ${result.totalDuration} seconds`);
    console.log(`Output saved to: ${result.outputPath}`);
    
    return result;
  } catch (error) {
    console.error('Failed to generate simple dialogue:', error);
    throw error;
  }
}

/**
 * Example 2: Emotional Drama Scene
 */
async function emotionalDramaExample() {
  console.log('=== Emotional Drama Scene Example ===');

  const conversationManager = new ConversationManager();
  const characterManager = new CharacterManager();

  // Define characters with emotional depth
  const sarah: ConversationCharacter = {
    id: 'sarah',
    name: 'Sarah',
    voiceProfile: {
      provider: 'elevenlabs',
      voiceId: 'sarah-emotional',
      stability: 0.6,
      similarityBoost: 0.9,
      style: 0.3,
      useSpeakerBoost: true
    },
    personality: {
      traits: ['passionate', 'emotional', 'expressive'],
      speakingStyle: 'emotional',
      emotionalRange: {
        default: 'neutral',
        intensity: 0.8,
        variability: 0.7
      }
    },
    speechPatterns: {
      pace: 'variable',
      pauseFrequency: 0.4,
      emphasisStyle: 'dramatic',
      fillerWords: ['oh', 'I mean'],
      catchphrases: ['You don\'t understand!']
    }
  };

  const david: ConversationCharacter = {
    id: 'david',
    name: 'David',
    voiceProfile: {
      provider: 'elevenlabs',
      voiceId: 'david-calm',
      stability: 0.85,
      similarityBoost: 0.8,
      style: 0.1,
      useSpeakerBoost: true
    },
    personality: {
      traits: ['calm', 'supportive', 'patient'],
      speakingStyle: 'soothing',
      emotionalRange: {
        default: 'calm',
        intensity: 0.5,
        variability: 0.3
      }
    },
    speechPatterns: {
      pace: 'slow',
      pauseFrequency: 0.6,
      emphasisStyle: 'gentle',
      fillerWords: ['listen', 'okay'],
      catchphrases: ['I\'m here for you']
    }
  };

  characterManager.addCharacter(sarah);
  characterManager.addCharacter(david);

  // Emotional dialogue with stage directions
  const script = `
    Sarah [frustrated]: I can't believe this is happening again!
    David [calm, supportive]: Take a deep breath. Tell me what's wrong.
    Sarah [building anger]: It's the same thing every time! Nobody listens to me!
    David [gently]: I'm listening now. What happened?
    Sarah [breaking down]: I... I just feel so alone sometimes.
    David [warmly]: You're not alone. I'm here for you, and I always will be.
    Sarah [softly, vulnerable]: Really? Even when I'm like this?
    David [reassuring]: Especially when you're like this. That's what love means.
  `;

  const config: ConversationConfig = {
    characters: [sarah, david],
    globalSettings: {
      backgroundMusic: false,
      ambientSounds: true,
      crossfadeDuration: 0.3,
      overallPace: 'emotional'
    },
    outputFormat: {
      sampleRate: 44100,
      bitDepth: 16,
      channels: 2,
      format: 'mp3'
    },
    emotionTransitions: {
      enabled: true,
      smoothingFactor: 0.7,
      adaptationRate: 0.3
    }
  };

  try {
    const result = await conversationManager.generateConversation(script, config);
    
    console.log(`Generated emotional drama with ${result.segments.length} segments`);
    console.log(`Emotion transitions: ${result.emotionTransitions?.length || 0}`);
    console.log(`Output saved to: ${result.outputPath}`);
    
    return result;
  } catch (error) {
    console.error('Failed to generate emotional drama:', error);
    throw error;
  }
}

/**
 * Example 3: Multi-Character Business Meeting
 */
async function businessMeetingExample() {
  console.log('=== Multi-Character Business Meeting Example ===');

  const conversationManager = new ConversationManager();
  const characterManager = new CharacterManager();

  // Define multiple business characters
  const characters: ConversationCharacter[] = [
    {
      id: 'ceo',
      name: 'Jennifer (CEO)',
      voiceProfile: {
        provider: 'elevenlabs',
        voiceId: 'jennifer-executive',
        stability: 0.9,
        similarityBoost: 0.8,
        style: 0.2,
        useSpeakerBoost: true
      },
      personality: {
        traits: ['authoritative', 'decisive', 'strategic'],
        speakingStyle: 'executive',
        emotionalRange: {
          default: 'confident',
          intensity: 0.6,
          variability: 0.2
        }
      },
      speechPatterns: {
        pace: 'medium',
        pauseFrequency: 0.3,
        emphasisStyle: 'authoritative',
        fillerWords: ['so', 'moving forward'],
        catchphrases: ['Let\'s make this happen']
      }
    },
    {
      id: 'cto',
      name: 'Marcus (CTO)',
      voiceProfile: {
        provider: 'elevenlabs',
        voiceId: 'marcus-technical',
        stability: 0.8,
        similarityBoost: 0.75,
        style: 0.1,
        useSpeakerBoost: true
      },
      personality: {
        traits: ['technical', 'analytical', 'detail-oriented'],
        speakingStyle: 'technical',
        emotionalRange: {
          default: 'focused',
          intensity: 0.4,
          variability: 0.3
        }
      },
      speechPatterns: {
        pace: 'medium',
        pauseFrequency: 0.4,
        emphasisStyle: 'precise',
        fillerWords: ['technically speaking', 'essentially'],
        catchphrases: ['From a technical standpoint']
      }
    },
    {
      id: 'cmo',
      name: 'Lisa (CMO)',
      voiceProfile: {
        provider: 'elevenlabs',
        voiceId: 'lisa-marketing',
        stability: 0.75,
        similarityBoost: 0.85,
        style: 0.3,
        useSpeakerBoost: true
      },
      personality: {
        traits: ['enthusiastic', 'creative', 'people-focused'],
        speakingStyle: 'enthusiastic',
        emotionalRange: {
          default: 'positive',
          intensity: 0.7,
          variability: 0.5
        }
      },
      speechPatterns: {
        pace: 'fast',
        pauseFrequency: 0.2,
        emphasisStyle: 'energetic',
        fillerWords: ['absolutely', 'you know what'],
        catchphrases: ['This is going to be amazing!']
      }
    }
  ];

  // Register all characters
  characters.forEach(char => characterManager.addCharacter(char));

  const script = `
    Jennifer: Good morning everyone. Let's discuss our Q4 strategy.
    Marcus: From a technical standpoint, we're ready to scale our infrastructure.
    Lisa: This is going to be amazing! Our market research shows huge potential.
    Jennifer: Excellent. Marcus, what's our timeline for the new features?
    Marcus: Technically speaking, we can deliver the core functionality in 6 weeks.
    Lisa: Absolutely! And I can have the marketing campaign ready to launch simultaneously.
    Jennifer: Perfect. Let's make this happen. Any concerns or roadblocks?
    Marcus: We'll need additional server capacity, but that's manageable.
    Lisa: You know what? I think we should also consider international markets.
    Jennifer: Good point. Let's schedule a follow-up to discuss expansion strategy.
  `;

  const config: ConversationConfig = {
    characters,
    globalSettings: {
      backgroundMusic: false,
      ambientSounds: true,
      crossfadeDuration: 0.2,
      overallPace: 'business'
    },
    outputFormat: {
      sampleRate: 44100,
      bitDepth: 16,
      channels: 2,
      format: 'mp3'
    }
  };

  try {
    const result = await conversationManager.generateConversation(script, config);
    
    console.log(`Generated business meeting with ${result.segments.length} segments`);
    console.log(`Participants: ${characters.length}`);
    console.log(`Output saved to: ${result.outputPath}`);
    
    return result;
  } catch (error) {
    console.error('Failed to generate business meeting:', error);
    throw error;
  }
}

/**
 * Example 4: Interactive Story with Narrator
 */
async function interactiveStoryExample() {
  console.log('=== Interactive Story with Narrator Example ===');

  const conversationManager = new ConversationManager();
  const characterManager = new CharacterManager();

  // Story characters including narrator
  const narrator: ConversationCharacter = {
    id: 'narrator',
    name: 'Narrator',
    voiceProfile: {
      provider: 'elevenlabs',
      voiceId: 'narrator-storyteller',
      stability: 0.85,
      similarityBoost: 0.8,
      style: 0.4,
      useSpeakerBoost: true
    },
    personality: {
      traits: ['wise', 'engaging', 'descriptive'],
      speakingStyle: 'narrative',
      emotionalRange: {
        default: 'storytelling',
        intensity: 0.6,
        variability: 0.4
      }
    },
    speechPatterns: {
      pace: 'measured',
      pauseFrequency: 0.4,
      emphasisStyle: 'dramatic',
      fillerWords: [],
      catchphrases: ['And so it was...', 'In that moment...']
    }
  };

  const hero: ConversationCharacter = {
    id: 'hero',
    name: 'Alex',
    voiceProfile: {
      provider: 'elevenlabs',
      voiceId: 'alex-hero',
      stability: 0.75,
      similarityBoost: 0.85,
      style: 0.2,
      useSpeakerBoost: true
    },
    personality: {
      traits: ['brave', 'determined', 'caring'],
      speakingStyle: 'heroic',
      emotionalRange: {
        default: 'determined',
        intensity: 0.7,
        variability: 0.5
      }
    },
    speechPatterns: {
      pace: 'medium',
      pauseFrequency: 0.3,
      emphasisStyle: 'confident',
      fillerWords: [],
      catchphrases: ['I won\'t give up!']
    }
  };

  const villain: ConversationCharacter = {
    id: 'villain',
    name: 'Shadow',
    voiceProfile: {
      provider: 'elevenlabs',
      voiceId: 'shadow-villain',
      stability: 0.8,
      similarityBoost: 0.75,
      style: 0.5,
      useSpeakerBoost: true
    },
    personality: {
      traits: ['menacing', 'intelligent', 'manipulative'],
      speakingStyle: 'sinister',
      emotionalRange: {
        default: 'dark',
        intensity: 0.8,
        variability: 0.3
      }
    },
    speechPatterns: {
      pace: 'slow',
      pauseFrequency: 0.5,
      emphasisStyle: 'menacing',
      fillerWords: [],
      catchphrases: ['You cannot stop what\'s coming...']
    }
  };

  [narrator, hero, villain].forEach(char => characterManager.addCharacter(char));

  const script = `
    Narrator: In the depths of the ancient forest, Alex approached the clearing where shadows danced.
    Alex: I know you're here, Shadow. Show yourself!
    Narrator: And so it was that the darkness began to coalesce into a familiar, terrifying form.
    Shadow [menacing]: You cannot stop what's coming, little hero.
    Alex [determined]: I won't give up! The people of this realm depend on me.
    Shadow [laughing darkly]: Your determination is... amusing. But ultimately futile.
    Narrator: In that moment, Alex felt the weight of destiny upon their shoulders.
    Alex [resolute]: Then let's end this, once and for all.
    Shadow [sinister]: Very well. Let us see if your courage matches your words.
    Narrator: The final confrontation was about to begin...
  `;

  const config: ConversationConfig = {
    characters: [narrator, hero, villain],
    globalSettings: {
      backgroundMusic: true,
      ambientSounds: true,
      crossfadeDuration: 0.4,
      overallPace: 'cinematic'
    },
    outputFormat: {
      sampleRate: 44100,
      bitDepth: 16,
      channels: 2,
      format: 'mp3'
    },
    emotionTransitions: {
      enabled: true,
      smoothingFactor: 0.8,
      adaptationRate: 0.4
    }
  };

  try {
    const result = await conversationManager.generateConversation(script, config);
    
    console.log(`Generated interactive story with ${result.segments.length} segments`);
    console.log(`Characters: ${[narrator, hero, villain].length}`);
    console.log(`Output saved to: ${result.outputPath}`);
    
    return result;
  } catch (error) {
    console.error('Failed to generate interactive story:', error);
    throw error;
  }
}

/**
 * Main execution function
 */
async function runAllExamples() {
  console.log('🎭 Multi-Voice Conversation Examples');
  console.log('=====================================\n');

  try {
    await simpleDialogueExample();
    console.log('\n');
    
    await emotionalDramaExample();
    console.log('\n');
    
    await businessMeetingExample();
    console.log('\n');
    
    await interactiveStoryExample();
    console.log('\n');
    
    console.log('✅ All examples completed successfully!');
  } catch (error) {
    console.error('❌ Example execution failed:', error);
    process.exit(1);
  }
}

// Export examples for individual testing
export {
  simpleDialogueExample,
  emotionalDramaExample,
  businessMeetingExample,
  interactiveStoryExample,
  runAllExamples
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples();
}