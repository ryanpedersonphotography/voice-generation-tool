import { VoiceProfile, EmotionProfile } from './voice.interface.js';
import { EmotionTransition } from './emotion-transition.interface.js';

export interface ConversationCharacter {
  id: string;
  name: string;
  voiceProfile: VoiceProfile;
  personality: CharacterPersonality;
  speechPatterns: SpeechPattern[];
  defaultEmotion: EmotionProfile;
}

export interface CharacterPersonality {
  traits: PersonalityTrait[];
  speakingStyle: SpeakingStyle;
  emotionalRange: EmotionalRange;
  catchphrases?: string[];
  verbosity: 'concise' | 'moderate' | 'verbose';
}

export interface PersonalityTrait {
  name: string;
  intensity: number; // 0-1
  manifestation: string[]; // How this trait affects speech
}

export interface SpeakingStyle {
  pace: 'slow' | 'normal' | 'fast' | 'variable';
  formality: 'casual' | 'professional' | 'formal' | 'slang';
  confidence: number; // 0-1
  enthusiasm: number; // 0-1
  interruption_tendency: number; // 0-1, likelihood to interrupt others
}

export interface EmotionalRange {
  baseline: EmotionProfile;
  volatility: number; // 0-1, how quickly emotions change
  maxIntensity: number; // 0-1, maximum emotion intensity this character reaches
  dominantEmotions: string[]; // Most common emotions for this character
}

export interface SpeechPattern {
  pattern: RegExp | string;
  replacement: string;
  description: string;
  frequency: number; // 0-1, how often this pattern applies
}

export interface DialogueLine {
  id: string;
  characterId: string;
  text: string;
  emotion?: EmotionProfile;
  emotionTransitions?: EmotionTransition[];
  timing: DialogueTiming;
  audioEffects?: AudioEffect[];
  context?: DialogueContext;
}

export interface DialogueTiming {
  startTime: number; // milliseconds from conversation start
  endTime?: number; // calculated or specified
  pauseBefore?: number; // milliseconds of silence before this line
  pauseAfter?: number; // milliseconds of silence after this line
  overlap?: OverlapConfig;
  speedModifier?: number; // 0.5-2.0, relative to character's base speed
}

export interface OverlapConfig {
  enabled: boolean;
  targetLineId?: string; // Which line to overlap with
  overlapStart: number; // milliseconds into the target line
  overlapDuration: number; // how long the overlap lasts
  volumeReduction: number; // 0-1, how much to reduce volume during overlap
}

export interface DialogueContext {
  scene: string;
  mood: string;
  relationship: string; // between characters
  urgency: 'low' | 'medium' | 'high';
  privacy: 'public' | 'private' | 'intimate';
}

export interface AudioEffect {
  type: 'reverb' | 'echo' | 'filter' | 'distortion' | 'radio' | 'phone' | 'whisper' | 'shout';
  intensity: number; // 0-1
  parameters?: Record<string, number>;
}

export interface ConversationConfig {
  id: string;
  title: string;
  characters: ConversationCharacter[];
  dialogue: DialogueLine[];
  globalSettings: ConversationGlobalSettings;
  metadata?: ConversationMetadata;
}

export interface ConversationGlobalSettings {
  pauseBetweenLines: number; // default pause in milliseconds
  crossfadeDuration: number; // default crossfade between speakers
  backgroundAmbience?: AudioTrack;
  masterVolume: number; // 0-1
  spatialAudio?: SpatialAudioConfig;
  naturalTiming: boolean; // use AI to adjust timing naturally
}

export interface AudioTrack {
  url: string;
  volume: number; // 0-1
  loop: boolean;
  fadeIn?: number; // milliseconds
  fadeOut?: number; // milliseconds
}

export interface SpatialAudioConfig {
  enabled: boolean;
  characterPositions: Record<string, { x: number; y: number; z: number }>;
  listenerPosition: { x: number; y: number; z: number };
  roomSize: { width: number; height: number; depth: number };
}

export interface ConversationMetadata {
  genre: string;
  targetAudience: string;
  estimatedDuration: number;
  complexity: 'simple' | 'moderate' | 'complex';
  tags: string[];
  created: Date;
  lastModified: Date;
}

export interface ConversationResult {
  audioTracks: AudioTrackResult[];
  mixedAudio?: Buffer;
  timeline: ConversationTimeline;
  statistics: ConversationStatistics;
  metadata: ConversationMetadata;
}

export interface AudioTrackResult {
  characterId: string;
  characterName: string;
  audioBuffer: Buffer;
  segments: AudioSegment[];
  totalDuration: number;
}

export interface AudioSegment {
  lineId: string;
  startTime: number;
  endTime: number;
  text: string;
  emotion: EmotionProfile;
  audioBuffer: Buffer;
}

export interface ConversationTimeline {
  totalDuration: number;
  events: TimelineEvent[];
  characterUsage: Record<string, number>; // speaking time per character
}

export interface TimelineEvent {
  time: number;
  type: 'line_start' | 'line_end' | 'emotion_change' | 'overlap_start' | 'overlap_end' | 'effect_start' | 'effect_end';
  characterId?: string;
  lineId?: string;
  data?: any;
}

export interface ConversationStatistics {
  totalLines: number;
  totalWords: number;
  averageLineLength: number;
  characterStats: Record<string, CharacterStatistics>;
  emotionDistribution: Record<string, number>;
  overlappingLines: number;
  silenceDuration: number;
}

export interface CharacterStatistics {
  lineCount: number;
  wordCount: number;
  speakingTime: number;
  averageEmotion: EmotionProfile;
  emotionChanges: number;
}

export interface DialogueParseResult {
  characters: Set<string>;
  lines: ParsedDialogueLine[];
  formatType: 'script' | 'novel' | 'chat' | 'screenplay';
}

export interface ParsedDialogueLine {
  character: string;
  text: string;
  emotion?: string;
  stage_direction?: string;
  line_number: number;
}

export interface ConversationGenerationRequest {
  config: ConversationConfig;
  outputFormat: 'mp3' | 'wav' | 'aac';
  mixingOptions?: MixingOptions;
  exportOptions?: ExportOptions;
}

export interface MixingOptions {
  enableAutomaticMixing: boolean;
  preserveIndividualTracks: boolean;
  normalizeAudio: boolean;
  compressionLevel: number; // 0-1
  spatialAudioEnabled: boolean;
}

export interface ExportOptions {
  includeTimeline: boolean;
  includeSubtitles: boolean;
  subtitleFormat?: 'srt' | 'vtt' | 'ass';
  includeStatistics: boolean;
  separateCharacterTracks: boolean;
}