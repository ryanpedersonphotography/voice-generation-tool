import {
  SubtitleTrack,
  SubtitleEntry,
  SynchronizedAudio,
  SynchronizedAudioSegment,
  TimingAdjustment,
  LipSyncMarker,
  SyncQualityMetrics,
  SyncIssue,
  TimingMode
} from '../interfaces/video.interface.js';
import { VoiceEngine } from '../core/voice-engine.js';
import { ConversationManager } from '../core/conversation-manager.js';
import { CharacterManager } from '../core/character-manager.js';
import { VoiceProfile, VoiceModulation } from '../interfaces/voice.interface.js';
import { ConversationCharacter, ConversationConfig } from '../interfaces/conversation.interface.js';
import { SubtitleReader } from './format-readers/subtitle-reader.js';

/**
 * Advanced subtitle parser with voice generation and synchronization
 */
export class SubtitleParser {
  private voiceEngine: VoiceEngine;
  private conversationManager: ConversationManager;
  private characterManager: CharacterManager;
  private subtitleReader: SubtitleReader;

  constructor() {
    this.voiceEngine = new VoiceEngine();
    this.conversationManager = new ConversationManager();
    this.characterManager = new CharacterManager();
    this.subtitleReader = new SubtitleReader();
  }

  /**
   * Initialize the subtitle parser
   */
  async initialize(): Promise<void> {
    await this.voiceEngine.initialize();
  }

  /**
   * Parse subtitle file and return structured data
   */
  async parseSubtitles(filePath: string): Promise<SubtitleTrack> {
    const timeline = await this.subtitleReader.parse(filePath, {
      format: 'srt', // Will be auto-detected
      extractAudio: false,
      extractMarkers: false,
      extractMetadata: true,
      validateTimecode: true,
      mergeOverlappingScenes: false,
      minimumSceneDuration: 0.1
    });

    // Convert timeline back to subtitle track format
    const entries: SubtitleEntry[] = timeline.scenes.map((scene, index) => {
      const voiceReq = scene.voiceRequirements[0];
      return {
        index: index + 1,
        startTime: scene.startTime,
        endTime: scene.endTime,
        startTimecode: scene.startTimecode,
        endTimecode: scene.endTimecode,
        text: voiceReq?.text || '',
        speaker: voiceReq?.speaker,
        emotion: voiceReq?.emotionProfile,
        voiceSettings: undefined // Will be set during generation
      };
    });

    return {
      id: `subtitle_${Date.now()}`,
      language: 'en',
      format: timeline.format === 'srt' ? 'srt' : 'vtt',
      entries,
      metadata: {
        language: 'en',
        encoding: 'utf-8',
        frameRate: timeline.framerate,
        totalEntries: entries.length
      }
    };
  }

  /**
   * Generate synchronized voice from subtitle track
   */
  async generateVoiceFromSubtitles(
    track: SubtitleTrack,
    config: VoiceGenerationConfig
  ): Promise<SynchronizedAudio> {
    const audioSegments: SynchronizedAudioSegment[] = [];
    const timingAdjustments: TimingAdjustment[] = [];
    const lipSyncMarkers: LipSyncMarker[] = [];
    
    // Group entries by speaker for character consistency
    const speakerGroups = this.groupBySpeaker(track.entries);
    
    // Create characters for each speaker
    const characters = await this.createCharactersFromSpeakers(speakerGroups, config);
    
    // Process each subtitle entry
    for (const entry of track.entries) {
      try {
        const segment = await this.generateSegment(entry, characters, config);
        audioSegments.push(segment);
        
        // Check if timing adjustment is needed
        const adjustment = this.calculateTimingAdjustment(entry, segment, config.timingMode);
        if (adjustment) {
          timingAdjustments.push(adjustment);
        }
        
        // Generate lip sync markers if enabled
        if (config.lipSyncEnabled) {
          const markers = await this.generateLipSyncMarkers(segment);
          lipSyncMarkers.push(...markers);
        }
      } catch (error) {
        console.error(`Failed to generate audio for entry ${entry.index}:`, error);
        
        // Create silent segment as fallback
        const duration = entry.endTime - entry.startTime;
        audioSegments.push({
          id: `segment_${entry.index}`,
          startTime: entry.startTime,
          endTime: entry.endTime,
          audioBuffer: Buffer.alloc(Math.floor(duration * 44100 * 2)), // Silent audio
          speaker: entry.speaker,
          text: entry.text,
          confidence: 0.0
        });
      }
    }

    // Calculate quality metrics
    const qualityMetrics = this.calculateQualityMetrics(audioSegments, timingAdjustments);

    // Optimize timings if flexible mode
    if (config.timingMode === 'flexible' || config.timingMode === 'optimize') {
      await this.optimizeTimings(audioSegments, timingAdjustments);
    }

    const totalDuration = Math.max(...audioSegments.map(s => s.endTime));

    return {
      audioSegments,
      totalDuration,
      timingAdjustments,
      lipSyncMarkers,
      qualityMetrics
    };
  }

  /**
   * Group subtitle entries by speaker
   */
  private groupBySpeaker(entries: SubtitleEntry[]): Map<string, SubtitleEntry[]> {
    const groups = new Map<string, SubtitleEntry[]>();
    
    for (const entry of entries) {
      const speaker = entry.speaker || 'narrator';
      if (!groups.has(speaker)) {
        groups.set(speaker, []);
      }
      groups.get(speaker)!.push(entry);
    }
    
    return groups;
  }

  /**
   * Create character profiles from speakers
   */
  private async createCharactersFromSpeakers(
    speakerGroups: Map<string, SubtitleEntry[]>,
    config: VoiceGenerationConfig
  ): Promise<Map<string, ConversationCharacter>> {
    const characters = new Map<string, ConversationCharacter>();
    
    for (const [speaker, entries] of speakerGroups) {
      // Use provided voice mapping or default
      const voicePrompt = config.voiceMapping?.[speaker] || config.defaultVoice || 'professional narrator';
      
      // Analyze speaker's emotional range from entries
      const emotions = entries
        .filter(e => e.emotion)
        .map(e => e.emotion!.primary);
      
      const character: ConversationCharacter = {
        id: `speaker_${speaker.toLowerCase().replace(/\s+/g, '_')}`,
        name: speaker,
        voiceProfile: this.createVoiceProfile(voicePrompt, speaker),
        personality: {
          traits: this.inferPersonalityTraits(emotions),
          speakingStyle: this.inferSpeakingStyle(entries),
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
          fillerWords: [],
          catchphrases: []
        }
      };
      
      this.characterManager.addCharacter(character);
      characters.set(speaker, character);
    }
    
    return characters;
  }

  /**
   * Create voice profile from prompt
   */
  private createVoiceProfile(voicePrompt: string, speakerName: string): VoiceProfile {
    return {
      provider: 'elevenlabs', // Default to ElevenLabs for emotion control
      voiceId: `voice_${speakerName.toLowerCase()}`,
      stability: 0.75,
      similarityBoost: 0.85,
      style: 0.2,
      useSpeakerBoost: true,
      description: voicePrompt
    };
  }

  /**
   * Infer personality traits from emotional content
   */
  private inferPersonalityTraits(emotions: string[]): string[] {
    const traits: string[] = [];
    const emotionCounts = emotions.reduce((acc, emotion) => {
      acc[emotion] = (acc[emotion] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Map dominant emotions to personality traits
    if (emotionCounts['happy'] || emotionCounts['excited']) {
      traits.push('optimistic', 'energetic');
    }
    if (emotionCounts['sad'] || emotionCounts['melancholy']) {
      traits.push('thoughtful', 'introspective');
    }
    if (emotionCounts['angry'] || emotionCounts['frustrated']) {
      traits.push('passionate', 'intense');
    }
    if (emotionCounts['calm'] || emotionCounts['peaceful']) {
      traits.push('serene', 'composed');
    }

    return traits.length > 0 ? traits : ['neutral', 'professional'];
  }

  /**
   * Infer speaking style from subtitle entries
   */
  private inferSpeakingStyle(entries: SubtitleEntry[]): any {
    // Analyze text patterns to determine speaking style
    const totalText = entries.map(e => e.text).join(' ');
    const avgLength = totalText.length / entries.length;
    
    if (avgLength > 100) {
      return 'narrative'; // Long form content
    } else if (totalText.includes('!') || totalText.includes('?')) {
      return 'conversational'; // Interactive content
    } else {
      return 'neutral'; // Standard delivery
    }
  }

  /**
   * Generate audio segment for a subtitle entry
   */
  private async generateSegment(
    entry: SubtitleEntry,
    characters: Map<string, ConversationCharacter>,
    config: VoiceGenerationConfig
  ): Promise<SynchronizedAudioSegment> {
    const speaker = entry.speaker || 'narrator';
    const character = characters.get(speaker);
    
    if (!character) {
      throw new Error(`No character found for speaker: ${speaker}`);
    }

    // Calculate target duration
    const targetDuration = entry.endTime - entry.startTime;
    
    // Generate voice with timing constraints
    const result = await this.voiceEngine.generateVoice({
      text: entry.text,
      voiceProfile: character.voiceProfile,
      emotionProfile: entry.emotion,
      outputFormat: 'wav',
      processingOptions: {
        targetDuration: config.timingMode === 'strict' ? targetDuration : undefined,
        maxDuration: targetDuration * 1.2, // Allow 20% flexibility
        minDuration: targetDuration * 0.8
      }
    });

    // Calculate confidence based on timing accuracy
    const actualDuration = result.metadata?.duration || targetDuration;
    const timingError = Math.abs(actualDuration - targetDuration) / targetDuration;
    const confidence = Math.max(0, 1 - timingError * 2); // Reduce confidence as timing error increases

    return {
      id: `segment_${entry.index}`,
      startTime: entry.startTime,
      endTime: entry.endTime,
      audioBuffer: result.audioBuffer,
      speaker,
      text: entry.text,
      confidence
    };
  }

  /**
   * Calculate timing adjustment needed for a segment
   */
  private calculateTimingAdjustment(
    entry: SubtitleEntry,
    segment: SynchronizedAudioSegment,
    timingMode: TimingMode
  ): TimingAdjustment | null {
    const originalDuration = entry.endTime - entry.startTime;
    const actualDuration = segment.endTime - segment.startTime;
    
    if (timingMode === 'strict') {
      return null; // No adjustments in strict mode
    }
    
    const difference = Math.abs(actualDuration - originalDuration);
    
    if (difference > 0.1) { // Threshold of 100ms
      return {
        segmentId: segment.id,
        originalDuration,
        adjustedDuration: actualDuration,
        reason: 'natural_pause',
        confidence: 0.8
      };
    }
    
    return null;
  }

  /**
   * Generate lip sync markers for audio segment
   */
  private async generateLipSyncMarkers(segment: SynchronizedAudioSegment): Promise<LipSyncMarker[]> {
    // This would integrate with phoneme detection/generation
    // For now, return basic markers based on text analysis
    const markers: LipSyncMarker[] = [];
    const words = segment.text.split(' ');
    const duration = segment.endTime - segment.startTime;
    const timePerWord = duration / words.length;
    
    words.forEach((word, index) => {
      const time = segment.startTime + (index * timePerWord);
      const phoneme = this.getMainPhoneme(word);
      const mouthShape = this.phonemeToMouthShape(phoneme);
      
      markers.push({
        time,
        phoneme,
        mouthShape,
        duration: timePerWord,
        intensity: 0.7,
        confidence: 0.6
      });
    });
    
    return markers;
  }

  /**
   * Get main phoneme for a word (simplified)
   */
  private getMainPhoneme(word: string): string {
    const vowels = ['a', 'e', 'i', 'o', 'u'];
    const firstVowel = word.toLowerCase().split('').find(char => vowels.includes(char));
    return firstVowel || 'ə'; // schwa as default
  }

  /**
   * Map phoneme to mouth shape
   */
  private phonemeToMouthShape(phoneme: string): any {
    const mapping: Record<string, any> = {
      'a': 'A',
      'e': 'E', 
      'i': 'I',
      'o': 'O',
      'u': 'U',
      'm': 'M',
      'b': 'B',
      'p': 'P',
      'f': 'F',
      'v': 'V'
    };
    
    return mapping[phoneme.toLowerCase()] || 'Closed';
  }

  /**
   * Calculate synchronization quality metrics
   */
  private calculateQualityMetrics(
    segments: SynchronizedAudioSegment[],
    adjustments: TimingAdjustment[]
  ): SyncQualityMetrics {
    // Overall confidence score
    const overallScore = segments.reduce((sum, seg) => sum + seg.confidence, 0) / segments.length;
    
    // Timing accuracy based on adjustments
    const timingAccuracy = adjustments.length === 0 ? 1.0 : 
      1.0 - Math.min(0.5, adjustments.length / segments.length);
    
    // Placeholder for other metrics
    const lipSyncQuality = 0.8; // Would be calculated from actual lip sync analysis
    const naturalness = 0.75; // Would be calculated from speech analysis

    const issues: SyncIssue[] = [];
    
    // Identify timing issues
    adjustments.forEach(adj => {
      if (adj.confidence < 0.5) {
        issues.push({
          type: 'timing_drift',
          severity: 'medium',
          startTime: 0, // Would need segment reference
          endTime: 0,
          description: `Timing adjustment needed for segment ${adj.segmentId}`,
          suggestions: ['Consider manual timing adjustment', 'Check speech rate settings']
        });
      }
    });
    
    return {
      overallScore,
      timingAccuracy,
      lipSyncQuality,
      naturalness,
      issues
    };
  }

  /**
   * Optimize timings based on generated audio
   */
  private async optimizeTimings(
    segments: SynchronizedAudioSegment[],
    adjustments: TimingAdjustment[]
  ): Promise<void> {
    // Implementation would analyze audio and adjust timing
    // For now, just log the optimization request
    console.log(`Optimizing timings for ${segments.length} segments with ${adjustments.length} adjustments`);
  }

  /**
   * Export synchronized audio to file
   */
  async exportSynchronizedAudio(
    syncedAudio: SynchronizedAudio,
    outputPath: string,
    format: 'wav' | 'mp3' | 'aac' = 'wav'
  ): Promise<void> {
    // This would mix all segments into a single audio file
    // For now, just save the first segment as an example
    if (syncedAudio.audioSegments.length > 0) {
      const fs = await import('fs/promises');
      await fs.writeFile(outputPath, syncedAudio.audioSegments[0].audioBuffer);
    }
  }
}

/**
 * Configuration for voice generation from subtitles
 */
export interface VoiceGenerationConfig {
  defaultVoice: string;
  voiceMapping?: Record<string, string>; // speaker name -> voice description
  timingMode: TimingMode;
  lipSyncEnabled: boolean;
  qualityThreshold: number; // 0-1
  processingOptions?: {
    concurrent?: boolean;
    maxConcurrency?: number;
    cacheEnabled?: boolean;
  };
}

export default SubtitleParser;