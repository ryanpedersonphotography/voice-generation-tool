import {
  ConversationCharacter,
  CharacterPersonality,
  SpeechPattern,
  EmotionalRange,
  SpeakingStyle,
  PersonalityTrait
} from '../interfaces/conversation.interface.js';
import { VoiceProfile, EmotionProfile } from '../interfaces/voice.interface.js';
import { parseVoicePrompt } from '../utils/prompt-parser.js';

export class CharacterManager {
  private characters: Map<string, ConversationCharacter> = new Map();
  private voiceTemplates: Map<string, VoiceProfile> = new Map();

  constructor() {
    this.initializeVoiceTemplates();
  }

  /**
   * Initialize predefined voice templates for common character types
   */
  private initializeVoiceTemplates(): void {
    const templates: Array<{ name: string; profile: VoiceProfile }> = [
      {
        name: 'narrator',
        profile: {
          id: 'narrator-template',
          name: 'Professional Narrator',
          provider: 'elevenlabs',
          voiceId: 'narrator',
          characteristics: {
            gender: 'neutral',
            age: 'adult',
            accent: 'american',
            style: 'professional',
            pace: 'moderate',
            pitch: 'medium',
            energy: 'calm',
            defaultEmotion: { type: 'calm', intensity: 0.6, variations: [] },
            languages: ['en']
          },
          customization: {
            stability: 0.8,
            similarity: 0.7,
            style_exaggeration: 0.3
          }
        }
      },
      {
        name: 'friendly',
        profile: {
          id: 'friendly-template',
          name: 'Friendly Character',
          provider: 'elevenlabs',
          voiceId: 'friendly',
          characteristics: {
            gender: 'neutral',
            age: 'young_adult',
            accent: 'american',
            style: 'conversational',
            pace: 'normal',
            pitch: 'medium',
            energy: 'moderate',
            defaultEmotion: { type: 'happy', intensity: 0.7, variations: [] },
            languages: ['en']
          },
          customization: {
            stability: 0.7,
            similarity: 0.8,
            style_exaggeration: 0.5
          }
        }
      },
      {
        name: 'serious',
        profile: {
          id: 'serious-template',
          name: 'Serious Character',
          provider: 'elevenlabs',
          voiceId: 'serious',
          characteristics: {
            gender: 'neutral',
            age: 'adult',
            accent: 'british',
            style: 'formal',
            pace: 'slow',
            pitch: 'low',
            energy: 'low',
            defaultEmotion: { type: 'neutral', intensity: 0.5, variations: [] },
            languages: ['en']
          },
          customization: {
            stability: 0.9,
            similarity: 0.9,
            style_exaggeration: 0.2
          }
        }
      }
    ];

    for (const template of templates) {
      this.voiceTemplates.set(template.name, template.profile);
    }
  }

  /**
   * Initialize multiple characters for a conversation
   */
  async initializeCharacters(characters: ConversationCharacter[]): Promise<void> {
    console.log(`🎭 Initializing ${characters.length} characters...`);
    
    for (const character of characters) {
      await this.addCharacter(character);
    }

    console.log(`✅ All ${characters.length} characters initialized`);
  }

  /**
   * Add a character to the manager
   */
  async addCharacter(character: ConversationCharacter): Promise<void> {
    // Validate character data
    this.validateCharacter(character);
    
    // Store character
    this.characters.set(character.id, character);
    
    console.log(`👤 Added character: ${character.name} (${character.id})`);
  }

  /**
   * Create a character from a voice description
   */
  async createCharacterFromDescription(
    name: string,
    voiceDescription: string
  ): Promise<ConversationCharacter> {
    console.log(`🎨 Creating character "${name}" from description: "${voiceDescription}"`);
    
    // Parse voice description to extract characteristics
    const voiceCharacteristics = parseVoicePrompt(voiceDescription);
    
    // Create voice profile
    const voiceProfile: VoiceProfile = {
      id: `${name.toLowerCase()}_voice`,
      name: `${name} Voice`,
      provider: 'elevenlabs', // Default to ElevenLabs for emotion support
      voiceId: this.selectVoiceIdFromDescription(voiceDescription),
      characteristics: voiceCharacteristics,
      customization: {
        stability: 0.8,
        similarity: 0.7,
        style_exaggeration: 0.4
      }
    };

    // Create personality based on voice description
    const personality = this.createPersonalityFromDescription(voiceDescription);
    
    // Generate speech patterns
    const speechPatterns = this.generateSpeechPatterns(personality);

    // Create character
    const character: ConversationCharacter = {
      id: name.toLowerCase().replace(/\s+/g, '_'),
      name,
      voiceProfile,
      personality,
      speechPatterns,
      defaultEmotion: voiceCharacteristics.defaultEmotion
    };

    await this.addCharacter(character);
    return character;
  }

  /**
   * Get a character by ID
   */
  getCharacter(id: string): ConversationCharacter | undefined {
    return this.characters.get(id);
  }

  /**
   * Get all managed characters
   */
  getAllCharacters(): ConversationCharacter[] {
    return Array.from(this.characters.values());
  }

  /**
   * Update character personality
   */
  updateCharacterPersonality(characterId: string, personality: Partial<CharacterPersonality>): void {
    const character = this.characters.get(characterId);
    if (!character) {
      throw new Error(`Character not found: ${characterId}`);
    }

    character.personality = { ...character.personality, ...personality };
    console.log(`🔄 Updated personality for ${character.name}`);
  }

  /**
   * Clone a character with modifications
   */
  cloneCharacter(
    sourceId: string, 
    newId: string, 
    newName: string,
    modifications?: Partial<ConversationCharacter>
  ): ConversationCharacter {
    const source = this.characters.get(sourceId);
    if (!source) {
      throw new Error(`Source character not found: ${sourceId}`);
    }

    const cloned: ConversationCharacter = {
      ...source,
      id: newId,
      name: newName,
      voiceProfile: {
        ...source.voiceProfile,
        id: `${newId}_voice`,
        name: `${newName} Voice`
      },
      ...modifications
    };

    this.characters.set(newId, cloned);
    console.log(`👥 Cloned character: ${newName} from ${source.name}`);
    
    return cloned;
  }

  /**
   * Get character count
   */
  getCharacterCount(): number {
    return this.characters.size;
  }

  /**
   * Create personality from voice description
   */
  private createPersonalityFromDescription(description: string): CharacterPersonality {
    const desc = description.toLowerCase();
    
    // Extract personality traits from description
    const traits: PersonalityTrait[] = [];
    
    // Analyze for traits
    if (desc.includes('confident') || desc.includes('strong')) {
      traits.push({
        name: 'confidence',
        intensity: 0.8,
        manifestation: ['clear pronunciation', 'steady pace', 'assertive tone']
      });
    }
    
    if (desc.includes('friendly') || desc.includes('warm')) {
      traits.push({
        name: 'friendliness',
        intensity: 0.7,
        manifestation: ['upward inflection', 'enthusiastic tone', 'varied pitch']
      });
    }
    
    if (desc.includes('serious') || desc.includes('professional')) {
      traits.push({
        name: 'professionalism',
        intensity: 0.8,
        manifestation: ['formal language', 'controlled emotion', 'measured pace']
      });
    }
    
    if (desc.includes('energetic') || desc.includes('excited')) {
      traits.push({
        name: 'energy',
        intensity: 0.9,
        manifestation: ['fast pace', 'dynamic pitch', 'emphasis on key words']
      });
    }

    // Default traits if none detected
    if (traits.length === 0) {
      traits.push({
        name: 'neutral',
        intensity: 0.5,
        manifestation: ['balanced tone', 'moderate pace']
      });
    }

    // Determine speaking style
    const speakingStyle: SpeakingStyle = {
      pace: desc.includes('fast') ? 'fast' : desc.includes('slow') ? 'slow' : 'normal',
      formality: desc.includes('formal') || desc.includes('professional') ? 'formal' :
                desc.includes('casual') ? 'casual' : 'professional',
      confidence: desc.includes('confident') ? 0.8 : desc.includes('nervous') ? 0.3 : 0.6,
      enthusiasm: desc.includes('enthusiastic') || desc.includes('excited') ? 0.8 : 0.5,
      interruption_tendency: desc.includes('assertive') ? 0.7 : 0.3
    };

    // Create emotional range
    const emotionalRange: EmotionalRange = {
      baseline: { type: 'neutral', intensity: 0.5, variations: [] },
      volatility: desc.includes('emotional') || desc.includes('dramatic') ? 0.8 : 0.4,
      maxIntensity: desc.includes('intense') ? 0.9 : 0.7,
      dominantEmotions: this.extractDominantEmotions(desc)
    };

    // Determine verbosity
    const verbosity: 'concise' | 'moderate' | 'verbose' = 
      desc.includes('talkative') || desc.includes('verbose') ? 'verbose' :
      desc.includes('concise') || desc.includes('brief') ? 'concise' : 'moderate';

    return {
      traits,
      speakingStyle,
      emotionalRange,
      verbosity,
      catchphrases: this.extractCatchphrases(desc)
    };
  }

  /**
   * Extract dominant emotions from description
   */
  private extractDominantEmotions(description: string): string[] {
    const emotions: string[] = [];
    
    if (description.includes('happy') || description.includes('joyful')) emotions.push('happy');
    if (description.includes('sad') || description.includes('melancholy')) emotions.push('sad');
    if (description.includes('angry') || description.includes('frustrated')) emotions.push('angry');
    if (description.includes('excited') || description.includes('enthusiastic')) emotions.push('excited');
    if (description.includes('calm') || description.includes('peaceful')) emotions.push('calm');
    if (description.includes('surprised') || description.includes('amazed')) emotions.push('surprised');
    if (description.includes('fearful') || description.includes('nervous')) emotions.push('fearful');
    
    return emotions.length > 0 ? emotions : ['neutral'];
  }

  /**
   * Extract catchphrases from description
   */
  private extractCatchphrases(description: string): string[] | undefined {
    // Look for quoted phrases in the description
    const catchphraseMatch = description.match(/"([^"]+)"/g);
    if (catchphraseMatch) {
      return catchphraseMatch.map(phrase => phrase.replace(/"/g, ''));
    }
    return undefined;
  }

  /**
   * Generate speech patterns based on personality
   */
  private generateSpeechPatterns(personality: CharacterPersonality): SpeechPattern[] {
    const patterns: SpeechPattern[] = [];

    // Add patterns based on formality
    if (personality.speakingStyle.formality === 'formal') {
      patterns.push({
        pattern: /\buh\b|\bum\b|\ber\b/gi,
        replacement: '',
        description: 'Remove filler words for formal speech',
        frequency: 0.9
      });
    } else if (personality.speakingStyle.formality === 'casual') {
      patterns.push({
        pattern: /\byou are\b/gi,
        replacement: "you're",
        description: 'Use contractions for casual speech',
        frequency: 0.7
      });
    }

    // Add patterns based on enthusiasm
    if (personality.speakingStyle.enthusiasm > 0.7) {
      patterns.push({
        pattern: /(!+)$/gm,
        replacement: '!',
        description: 'Normalize exclamation marks',
        frequency: 0.8
      });
    }

    // Add catchphrase insertion patterns
    if (personality.catchphrases && personality.catchphrases.length > 0) {
      for (const catchphrase of personality.catchphrases) {
        patterns.push({
          pattern: /\.(\s+)(?=[A-Z])/g,
          replacement: `. ${catchphrase}. `,
          description: `Insert catchphrase: ${catchphrase}`,
          frequency: 0.1 // Low frequency to avoid overuse
        });
      }
    }

    return patterns;
  }

  /**
   * Select appropriate voice ID from description
   */
  private selectVoiceIdFromDescription(description: string): string {
    const desc = description.toLowerCase();
    
    // Match to voice templates
    if (desc.includes('narrator') || desc.includes('storyteller')) {
      return 'narrator';
    }
    
    if (desc.includes('friendly') || desc.includes('warm')) {
      return 'friendly';
    }
    
    if (desc.includes('serious') || desc.includes('professional')) {
      return 'serious';
    }
    
    // Gender-based defaults
    if (desc.includes('male') || desc.includes('man')) {
      return 'male-voice';
    }
    
    if (desc.includes('female') || desc.includes('woman')) {
      return 'female-voice';
    }
    
    // Age-based defaults
    if (desc.includes('young') || desc.includes('child')) {
      return 'young-voice';
    }
    
    if (desc.includes('old') || desc.includes('elderly')) {
      return 'elderly-voice';
    }
    
    // Default voice
    return 'default-voice';
  }

  /**
   * Validate character configuration
   */
  private validateCharacter(character: ConversationCharacter): void {
    if (!character.id || !character.name) {
      throw new Error('Character must have id and name');
    }
    
    if (this.characters.has(character.id)) {
      throw new Error(`Character with id "${character.id}" already exists`);
    }
    
    if (!character.voiceProfile) {
      throw new Error('Character must have a voice profile');
    }
    
    if (!character.personality) {
      throw new Error('Character must have personality configuration');
    }
  }

  /**
   * Get available voice templates
   */
  getVoiceTemplates(): string[] {
    return Array.from(this.voiceTemplates.keys());
  }

  /**
   * Create character from template
   */
  async createCharacterFromTemplate(
    name: string,
    templateName: string,
    customizations?: Partial<ConversationCharacter>
  ): Promise<ConversationCharacter> {
    const template = this.voiceTemplates.get(templateName);
    if (!template) {
      throw new Error(`Voice template not found: ${templateName}`);
    }

    const character: ConversationCharacter = {
      id: name.toLowerCase().replace(/\s+/g, '_'),
      name,
      voiceProfile: {
        ...template,
        id: `${name.toLowerCase()}_voice`,
        name: `${name} Voice`
      },
      personality: this.createDefaultPersonality(),
      speechPatterns: [],
      defaultEmotion: template.characteristics.defaultEmotion,
      ...customizations
    };

    await this.addCharacter(character);
    return character;
  }

  /**
   * Create default personality
   */
  private createDefaultPersonality(): CharacterPersonality {
    return {
      traits: [
        {
          name: 'neutral',
          intensity: 0.5,
          manifestation: ['balanced tone', 'moderate pace']
        }
      ],
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
    };
  }

  /**
   * Clear all characters
   */
  clear(): void {
    this.characters.clear();
    console.log('🧹 Cleared all characters');
  }

  /**
   * Export character configuration
   */
  exportCharacter(characterId: string): ConversationCharacter | null {
    const character = this.characters.get(characterId);
    return character ? JSON.parse(JSON.stringify(character)) : null;
  }

  /**
   * Import character configuration
   */
  async importCharacter(characterData: ConversationCharacter): Promise<void> {
    await this.addCharacter(characterData);
  }
}