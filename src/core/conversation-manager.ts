import {
  ConversationConfig,
  ConversationResult,
  ConversationCharacter,
  DialogueLine,
  ConversationTimeline,
  TimelineEvent,
  AudioTrackResult,
  AudioSegment,
  ConversationStatistics,
  CharacterStatistics,
  ConversationGenerationRequest,
  MixingOptions
} from '../interfaces/conversation.interface.js';
import { VoiceEngine } from './voice-engine.js';
import { GenerationRequest } from '../interfaces/voice.interface.js';
import { CharacterManager } from './character-manager.js';
import { DialogueParser } from '../utils/dialogue-parser.js';
import { AudioMixer } from '../utils/audio-mixer.js';

export class ConversationManager {
  private voiceEngine: VoiceEngine;
  private characterManager: CharacterManager;
  private dialogueParser: DialogueParser;
  private audioMixer: AudioMixer;

  constructor(voiceEngine: VoiceEngine) {
    this.voiceEngine = voiceEngine;
    this.characterManager = new CharacterManager();
    this.dialogueParser = new DialogueParser();
    this.audioMixer = new AudioMixer();
  }

  /**
   * Generate a complete conversation with multiple characters
   */
  async generateConversation(request: ConversationGenerationRequest): Promise<ConversationResult> {
    const { config } = request;
    
    console.log(`🎭 Generating conversation: "${config.title}"`);
    console.log(`👥 Characters: ${config.characters.length}`);
    console.log(`💬 Lines: ${config.dialogue.length}`);

    // Validate configuration
    this.validateConversationConfig(config);

    // Initialize characters
    await this.characterManager.initializeCharacters(config.characters);

    // Process dialogue timing
    const processedDialogue = await this.processDialogueTiming(config.dialogue, config.globalSettings);

    // Generate audio for each character's lines
    const audioTracks = await this.generateCharacterAudioTracks(
      processedDialogue,
      config.characters,
      request.outputFormat
    );

    // Create conversation timeline
    const timeline = this.createConversationTimeline(processedDialogue, audioTracks);

    // Mix audio tracks if requested
    let mixedAudio: Buffer | undefined;
    if (request.mixingOptions?.enableAutomaticMixing) {
      mixedAudio = await this.mixAudioTracks(audioTracks, timeline, request.mixingOptions);
    }

    // Calculate statistics
    const statistics = this.calculateConversationStatistics(config.dialogue, audioTracks, timeline);

    return {
      audioTracks,
      mixedAudio,
      timeline,
      statistics,
      metadata: config.metadata || {
        genre: 'conversation',
        targetAudience: 'general',
        estimatedDuration: timeline.totalDuration,
        complexity: 'moderate',
        tags: [],
        created: new Date(),
        lastModified: new Date()
      }
    };
  }

  /**
   * Generate conversation from a script string
   */
  async generateFromScript(
    script: string,
    characterVoices: Record<string, string>,
    options: {
      outputFormat?: 'mp3' | 'wav' | 'aac';
      naturalTiming?: boolean;
      mixAudio?: boolean;
    } = {}
  ): Promise<ConversationResult> {
    console.log('📝 Parsing script format...');
    
    // Parse the script to extract dialogue
    const parseResult = this.dialogueParser.parseScript(script);
    
    // Create characters from voice descriptions
    const characters: ConversationCharacter[] = [];
    for (const characterName of parseResult.characters) {
      const voiceDescription = characterVoices[characterName] || 'neutral voice';
      const character = await this.characterManager.createCharacterFromDescription(
        characterName,
        voiceDescription
      );
      characters.push(character);
    }

    // Convert parsed lines to dialogue configuration
    const dialogue: DialogueLine[] = parseResult.lines.map((line, index) => ({
      id: `line_${index}`,
      characterId: line.character,
      text: line.text,
      emotion: line.emotion ? { type: line.emotion as any, intensity: 0.7, variations: [] } : undefined,
      timing: {
        startTime: index * 3000, // Basic timing: 3 seconds per line
        pauseBefore: index === 0 ? 0 : 500,
        pauseAfter: 300
      }
    }));

    // Create conversation configuration
    const config: ConversationConfig = {
      id: `conversation_${Date.now()}`,
      title: 'Generated Conversation',
      characters,
      dialogue,
      globalSettings: {
        pauseBetweenLines: 500,
        crossfadeDuration: 200,
        masterVolume: 1.0,
        naturalTiming: options.naturalTiming || true
      }
    };

    // Generate the conversation
    const request: ConversationGenerationRequest = {
      config,
      outputFormat: options.outputFormat || 'mp3',
      mixingOptions: {
        enableAutomaticMixing: options.mixAudio || false,
        preserveIndividualTracks: true,
        normalizeAudio: true,
        compressionLevel: 0.3,
        spatialAudioEnabled: false
      }
    };

    return this.generateConversation(request);
  }

  /**
   * Process dialogue timing for natural conversation flow
   */
  private async processDialogueTiming(
    dialogue: DialogueLine[],
    globalSettings: any
  ): Promise<DialogueLine[]> {
    const processed = [...dialogue];
    let currentTime = 0;

    for (let i = 0; i < processed.length; i++) {
      const line = processed[i];
      
      // Calculate estimated speaking time based on text length
      const wordCount = line.text.split(/\s+/).length;
      const estimatedDuration = (wordCount / 3) * 1000; // ~180 WPM = 3 words/second
      
      // Apply pause before (if not specified)
      if (line.timing.pauseBefore === undefined) {
        line.timing.pauseBefore = i === 0 ? 0 : globalSettings.pauseBetweenLines;
      }

      // Set start time
      line.timing.startTime = currentTime + line.timing.pauseBefore;
      
      // Set end time based on estimated duration
      line.timing.endTime = line.timing.startTime + estimatedDuration;
      
      // Apply speed modifier if specified
      if (line.timing.speedModifier) {
        const adjustedDuration = estimatedDuration / line.timing.speedModifier;
        line.timing.endTime = line.timing.startTime + adjustedDuration;
      }

      // Handle overlapping dialogue
      if (line.timing.overlap?.enabled && line.timing.overlap.targetLineId) {
        const targetLine = processed.find(l => l.id === line.timing.overlap!.targetLineId);
        if (targetLine && targetLine.timing.endTime) {
          line.timing.startTime = targetLine.timing.startTime + line.timing.overlap.overlapStart;
        }
      }

      // Update current time for next line
      currentTime = line.timing.endTime + (line.timing.pauseAfter || 0);
    }

    return processed;
  }

  /**
   * Generate audio tracks for each character
   */
  private async generateCharacterAudioTracks(
    dialogue: DialogueLine[],
    characters: ConversationCharacter[],
    outputFormat: 'mp3' | 'wav' | 'aac'
  ): Promise<AudioTrackResult[]> {
    const tracks: AudioTrackResult[] = [];

    // Group dialogue by character
    const characterLines = new Map<string, DialogueLine[]>();
    for (const line of dialogue) {
      if (!characterLines.has(line.characterId)) {
        characterLines.set(line.characterId, []);
      }
      characterLines.get(line.characterId)!.push(line);
    }

    // Generate audio for each character
    for (const character of characters) {
      const lines = characterLines.get(character.id) || [];
      
      if (lines.length === 0) {
        continue; // Skip characters with no lines
      }

      console.log(`🎤 Generating audio for ${character.name} (${lines.length} lines)`);

      const segments: AudioSegment[] = [];
      const audioBuffers: Buffer[] = [];

      for (const line of lines) {
        // Prepare generation request
        const generationRequest: GenerationRequest = {
          text: line.text,
          voiceProfile: character.voiceProfile,
          modulation: line.emotion ? {
            emotion: line.emotion,
            speed: line.timing.speedModifier || 1.0,
            pitch: 0,
            volume: 1.0,
            emphasis: [],
            pauses: []
          } : undefined,
          emotionTransitions: line.emotionTransitions,
          outputFormat
        };

        // Generate audio for this line
        const audioBuffer = await this.voiceEngine.generateVoice(generationRequest);
        audioBuffers.push(audioBuffer);

        // Create segment
        const segment: AudioSegment = {
          lineId: line.id,
          startTime: line.timing.startTime,
          endTime: line.timing.endTime || line.timing.startTime + 3000,
          text: line.text,
          emotion: line.emotion || character.defaultEmotion,
          audioBuffer
        };
        segments.push(segment);
      }

      // Combine all audio buffers for this character
      const combinedAudio = Buffer.concat(audioBuffers);
      const totalDuration = segments.reduce((sum, seg) => Math.max(sum, seg.endTime), 0);

      tracks.push({
        characterId: character.id,
        characterName: character.name,
        audioBuffer: combinedAudio,
        segments,
        totalDuration
      });
    }

    return tracks;
  }

  /**
   * Create conversation timeline
   */
  private createConversationTimeline(
    dialogue: DialogueLine[],
    audioTracks: AudioTrackResult[]
  ): ConversationTimeline {
    const events: TimelineEvent[] = [];
    const characterUsage: Record<string, number> = {};

    // Calculate total duration
    let totalDuration = 0;

    // Process each dialogue line
    for (const line of dialogue) {
      // Add line start event
      events.push({
        time: line.timing.startTime,
        type: 'line_start',
        characterId: line.characterId,
        lineId: line.id,
        data: { text: line.text }
      });

      // Add line end event
      const endTime = line.timing.endTime || line.timing.startTime + 3000;
      events.push({
        time: endTime,
        type: 'line_end',
        characterId: line.characterId,
        lineId: line.id
      });

      // Track character usage
      const duration = endTime - line.timing.startTime;
      characterUsage[line.characterId] = (characterUsage[line.characterId] || 0) + duration;

      totalDuration = Math.max(totalDuration, endTime);

      // Add emotion change events if present
      if (line.emotionTransitions) {
        for (const transition of line.emotionTransitions) {
          events.push({
            time: line.timing.startTime + (transition.triggers.time || 0),
            type: 'emotion_change',
            characterId: line.characterId,
            lineId: line.id,
            data: { fromEmotion: transition.fromEmotion, toEmotion: transition.toEmotion }
          });
        }
      }

      // Add overlap events
      if (line.timing.overlap?.enabled) {
        events.push({
          time: line.timing.startTime,
          type: 'overlap_start',
          characterId: line.characterId,
          lineId: line.id,
          data: line.timing.overlap
        });

        events.push({
          time: line.timing.startTime + line.timing.overlap.overlapDuration,
          type: 'overlap_end',
          characterId: line.characterId,
          lineId: line.id
        });
      }
    }

    // Sort events by time
    events.sort((a, b) => a.time - b.time);

    return {
      totalDuration,
      events,
      characterUsage
    };
  }

  /**
   * Mix multiple audio tracks into a single conversation
   */
  private async mixAudioTracks(
    tracks: AudioTrackResult[],
    timeline: ConversationTimeline,
    options: MixingOptions
  ): Promise<Buffer> {
    console.log('🎚️ Mixing audio tracks...');
    
    return this.audioMixer.mixConversation(tracks, timeline, options);
  }

  /**
   * Calculate conversation statistics
   */
  private calculateConversationStatistics(
    dialogue: DialogueLine[],
    audioTracks: AudioTrackResult[],
    timeline: ConversationTimeline
  ): ConversationStatistics {
    const totalLines = dialogue.length;
    const totalWords = dialogue.reduce((sum, line) => sum + line.text.split(/\s+/).length, 0);
    const averageLineLength = totalWords / totalLines;

    const characterStats: Record<string, CharacterStatistics> = {};
    const emotionDistribution: Record<string, number> = {};
    let overlappingLines = 0;
    let silenceDuration = 0;

    // Calculate character statistics
    for (const track of audioTracks) {
      const characterLines = dialogue.filter(line => line.characterId === track.characterId);
      const wordCount = characterLines.reduce((sum, line) => sum + line.text.split(/\s+/).length, 0);
      
      characterStats[track.characterId] = {
        lineCount: characterLines.length,
        wordCount,
        speakingTime: timeline.characterUsage[track.characterId] || 0,
        averageEmotion: { type: 'neutral', intensity: 0.5, variations: [] }, // Simplified
        emotionChanges: characterLines.reduce((sum, line) => 
          sum + (line.emotionTransitions?.length || 0), 0)
      };
    }

    // Calculate emotion distribution
    for (const line of dialogue) {
      const emotion = line.emotion?.type || 'neutral';
      emotionDistribution[emotion] = (emotionDistribution[emotion] || 0) + 1;
    }

    // Count overlapping lines
    overlappingLines = dialogue.filter(line => line.timing.overlap?.enabled).length;

    // Calculate silence duration (simplified)
    const totalSpeakingTime = Object.values(timeline.characterUsage).reduce((sum, time) => sum + time, 0);
    silenceDuration = Math.max(0, timeline.totalDuration - totalSpeakingTime);

    return {
      totalLines,
      totalWords,
      averageLineLength,
      characterStats,
      emotionDistribution,
      overlappingLines,
      silenceDuration
    };
  }

  /**
   * Validate conversation configuration
   */
  private validateConversationConfig(config: ConversationConfig): void {
    if (!config.characters || config.characters.length === 0) {
      throw new Error('Conversation must have at least one character');
    }

    if (!config.dialogue || config.dialogue.length === 0) {
      throw new Error('Conversation must have at least one dialogue line');
    }

    // Check that all dialogue references valid characters
    const characterIds = new Set(config.characters.map(c => c.id));
    for (const line of config.dialogue) {
      if (!characterIds.has(line.characterId)) {
        throw new Error(`Dialogue line references unknown character: ${line.characterId}`);
      }
    }

    // Validate overlapping dialogue references
    const lineIds = new Set(config.dialogue.map(l => l.id));
    for (const line of config.dialogue) {
      if (line.timing.overlap?.targetLineId && !lineIds.has(line.timing.overlap.targetLineId)) {
        throw new Error(`Overlap target line not found: ${line.timing.overlap.targetLineId}`);
      }
    }
  }

  /**
   * Get conversation manager statistics
   */
  getManagerStatistics(): any {
    return {
      charactersManaged: this.characterManager.getCharacterCount(),
      conversationsGenerated: 0, // Would track this in production
      totalAudioGenerated: 0 // Would track this in production
    };
  }
}