/**
 * Video Integration Interface Definitions
 * Comprehensive types for video timeline synchronization and processing
 */

export type TimelineFormat = 'premiere' | 'davinci' | 'fcpx' | 'srt' | 'vtt' | 'json';
export type SceneMood = 'dramatic' | 'comedic' | 'romantic' | 'action' | 'documentary' | 'educational';
export type Environment = 'indoor' | 'outdoor' | 'studio' | 'vehicle' | 'crowded' | 'quiet';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';
export type WeatherCondition = 'sunny' | 'rainy' | 'stormy' | 'foggy';
export type ProximityToCamera = 'close' | 'medium' | 'wide';
export type TimingMode = 'strict' | 'flexible' | 'optimize';
export type MouthShape = 'A' | 'E' | 'I' | 'O' | 'U' | 'M' | 'B' | 'P' | 'F' | 'V' | 'Closed';

/**
 * Core video timeline structure
 */
export interface VideoTimeline {
  id: string;
  name: string;
  duration: number; // Total duration in seconds
  framerate: number; // FPS
  timecode: TimecodeSettings;
  resolution: VideoResolution;
  scenes: VideoScene[];
  markers: TimelineMarker[];
  audioTracks: VideoAudioTrack[];
  metadata: VideoMetadata;
  format: TimelineFormat;
}

/**
 * Video resolution and format information
 */
export interface VideoResolution {
  width: number;
  height: number;
  aspectRatio: string; // e.g., "16:9", "4:3"
  pixelAspectRatio: number;
  colorSpace: string; // e.g., "Rec.709", "Rec.2020"
}

/**
 * Timecode configuration
 */
export interface TimecodeSettings {
  dropFrame: boolean;
  startTimecode: string; // "HH:MM:SS:FF"
  frameRate: number;
}

/**
 * Individual video scene definition
 */
export interface VideoScene {
  id: string;
  name?: string;
  startTime: number; // Seconds from timeline start
  endTime: number;
  startTimecode: string;
  endTimecode: string;
  description?: string;
  context: SceneContext;
  voiceRequirements: VoiceRequirement[];
  transitions: SceneTransition[];
}

/**
 * Scene context for voice modulation
 */
export interface SceneContext {
  mood: SceneMood;
  environment: Environment;
  timeOfDay: TimeOfDay;
  weatherCondition?: WeatherCondition;
  characterCount: number;
  proximityToCamera: ProximityToCamera;
  backgroundNoise: number; // 0-1 scale
  emotionalIntensity: number; // 0-1 scale
  pacing: 'slow' | 'medium' | 'fast' | 'variable';
}

/**
 * Voice requirements for a scene
 */
export interface VoiceRequirement {
  startTime: number;
  endTime: number;
  text: string;
  speaker?: string;
  voiceProfile?: string;
  emotionProfile?: import('./voice.interface.js').EmotionProfile;
  priority: 'low' | 'medium' | 'high' | 'critical';
  notes?: string;
}

/**
 * Scene transition effects
 */
export interface SceneTransition {
  type: 'cut' | 'fade' | 'dissolve' | 'wipe';
  duration: number;
  audioFade: boolean;
  voiceOverlap: boolean;
}

/**
 * Timeline markers for various purposes
 */
export interface TimelineMarker {
  id: string;
  time: number;
  timecode: string;
  type: 'chapter' | 'scene' | 'voice_cue' | 'emotion_change' | 'audio_mix' | 'custom';
  name?: string;
  description?: string;
  color?: string;
  data: Record<string, any>;
}

/**
 * Audio track in video timeline
 */
export interface VideoAudioTrack {
  id: string;
  name: string;
  type: 'dialogue' | 'music' | 'sfx' | 'narration' | 'ambient';
  enabled: boolean;
  muted: boolean;
  volume: number; // 0-1
  pan: number; // -1 to 1
  clips: AudioClip[];
}

/**
 * Individual audio clip
 */
export interface AudioClip {
  id: string;
  startTime: number;
  endTime: number;
  sourceFile?: string;
  fadeIn: number;
  fadeOut: number;
  gain: number;
  speed: number;
}

/**
 * Video metadata
 */
export interface VideoMetadata {
  title?: string;
  description?: string;
  author?: string;
  createdDate?: Date;
  modifiedDate?: Date;
  software?: string;
  version?: string;
  project?: {
    name: string;
    path: string;
    settings: Record<string, any>;
  };
}

/**
 * Subtitle and caption definitions
 */
export interface SubtitleTrack {
  id: string;
  language: string;
  format: 'srt' | 'vtt' | 'ass' | 'ssa';
  entries: SubtitleEntry[];
  metadata: SubtitleMetadata;
}

export interface SubtitleEntry {
  index: number;
  startTime: number;
  endTime: number;
  startTimecode: string;
  endTimecode: string;
  text: string;
  speaker?: string;
  emotion?: import('./voice.interface.js').EmotionProfile;
  voiceSettings?: import('./voice.interface.js').VoiceModulation;
  styling?: SubtitleStyling;
}

export interface SubtitleStyling {
  position?: { x: number; y: number };
  alignment?: 'left' | 'center' | 'right';
  fontSize?: number;
  fontColor?: string;
  backgroundColor?: string;
  bold?: boolean;
  italic?: boolean;
}

export interface SubtitleMetadata {
  title?: string;
  language: string;
  encoding: string;
  frameRate: number;
  totalEntries: number;
}

/**
 * Synchronized audio generation result
 */
export interface SynchronizedAudio {
  audioSegments: SynchronizedAudioSegment[];
  totalDuration: number;
  timingAdjustments: TimingAdjustment[];
  lipSyncMarkers: LipSyncMarker[];
  qualityMetrics: SyncQualityMetrics;
}

export interface SynchronizedAudioSegment {
  id: string;
  startTime: number;
  endTime: number;
  audioBuffer: Buffer;
  speaker?: string;
  text: string;
  confidence: number; // 0-1 sync confidence
}

export interface TimingAdjustment {
  segmentId: string;
  originalDuration: number;
  adjustedDuration: number;
  reason: 'lip_sync' | 'scene_timing' | 'natural_pause' | 'breath_space';
  confidence: number;
}

/**
 * Lip synchronization definitions
 */
export interface LipSyncMarker {
  time: number;
  phoneme: string;
  mouthShape: MouthShape;
  duration: number;
  intensity: number; // 0-1 mouth opening
  confidence: number;
}

export interface LipMovement {
  startTime: number;
  endTime: number;
  intensity: number; // 0-1 mouth opening
  phoneme?: string;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface SyncQualityMetrics {
  overallScore: number; // 0-1
  timingAccuracy: number; // 0-1
  lipSyncQuality: number; // 0-1
  naturalness: number; // 0-1
  issues: SyncIssue[];
}

export interface SyncIssue {
  type: 'timing_drift' | 'lip_mismatch' | 'unnatural_pause' | 'audio_artifact';
  severity: 'low' | 'medium' | 'high';
  startTime: number;
  endTime: number;
  description: string;
  suggestions: string[];
}

/**
 * Scene analysis and recommendation
 */
export interface VoiceRecommendation {
  emotionalTone: import('./voice.interface.js').EmotionProfile;
  volume: number; // 0-1
  reverb: ReverbSettings;
  eq: EQSettings;
  compression: CompressionSettings;
  spatialPosition?: SpatialPosition;
  confidence: number; // 0-1 recommendation confidence
}

export interface ReverbSettings {
  enabled: boolean;
  roomSize: number; // 0-1
  damping: number; // 0-1
  wetLevel: number; // 0-1
  dryLevel: number; // 0-1
  predelay: number; // milliseconds
}

export interface EQSettings {
  enabled: boolean;
  lowCut: number; // Hz
  lowShelf: { frequency: number; gain: number; q: number };
  midPeaking: { frequency: number; gain: number; q: number };
  highShelf: { frequency: number; gain: number; q: number };
  highCut: number; // Hz
}

export interface CompressionSettings {
  enabled: boolean;
  threshold: number; // dB
  ratio: number;
  attack: number; // ms
  release: number; // ms
  makeupGain: number; // dB
}

export interface SpatialPosition {
  x: number; // -1 to 1 (left to right)
  y: number; // -1 to 1 (back to front)
  z: number; // -1 to 1 (down to up)
  distance: number; // 0 to 1
}

/**
 * Export and muxing definitions
 */
export interface VideoExportConfig {
  format: 'wav' | 'aiff' | 'mp3' | 'aac' | 'flac';
  sampleRate: number;
  bitDepth: number;
  channels: number;
  quality: 'low' | 'medium' | 'high' | 'lossless';
  loudnessStandard?: 'ITU-R_BS.1770' | 'EBU_R128';
  targetLUFS?: number;
}

export interface ExportResult {
  audioFile: string;
  videoFile?: string;
  subtitleFile?: string;
  projectFile?: string;
  metadata: ExportMetadata;
  processingTime: number;
  qualityMetrics?: AudioQualityMetrics;
}

export interface ExportMetadata {
  originalDuration: number;
  exportedDuration: number;
  compressionRatio: number;
  fileSize: number;
  checksum: string;
  timestamp: Date;
}

export interface AudioQualityMetrics {
  lufs: number; // Loudness
  peak: number; // Peak level in dB
  truePeak: number; // True peak in dB
  dynamicRange: number; // DR value
  signalToNoise: number; // SNR in dB
  thd: number; // Total Harmonic Distortion
}

/**
 * Multi-track export format
 */
export interface MultiTrackFormat {
  format: 'wav' | 'aiff' | 'omf' | 'aaf' | 'xml';
  sampleRate: number;
  bitDepth: number;
  trackLayout: TrackLayout[];
  sessionData?: SessionData;
}

export interface TrackLayout {
  trackNumber: number;
  name: string;
  type: 'mono' | 'stereo' | 'surround';
  role: 'dialogue' | 'music' | 'sfx' | 'narration';
  color?: string;
}

export interface SessionData {
  tempo: number;
  timeSignature: string;
  key: string;
  markers: SessionMarker[];
}

export interface SessionMarker {
  position: string; // Bars:beats:ticks
  name: string;
  type: 'memory' | 'selection' | 'cue';
}

/**
 * Timeline parsing configuration
 */
export interface TimelineParseConfig {
  format: TimelineFormat;
  extractAudio: boolean;
  extractMarkers: boolean;
  extractMetadata: boolean;
  validateTimecode: boolean;
  mergeOverlappingScenes: boolean;
  minimumSceneDuration: number; // seconds
}

/**
 * Timeline parsing result
 */
export interface TimelineParseResult {
  timeline: VideoTimeline;
  warnings: ParseWarning[];
  statistics: ParseStatistics;
  success: boolean;
}

export interface ParseWarning {
  type: 'timecode_mismatch' | 'missing_audio' | 'invalid_marker' | 'scene_overlap';
  message: string;
  location?: {
    timecode?: string;
    sceneId?: string;
    markerId?: string;
  };
}

export interface ParseStatistics {
  totalScenes: number;
  totalMarkers: number;
  totalAudioTracks: number;
  parseTime: number; // milliseconds
  fileSize: number; // bytes
}

/**
 * Video processing settings for audio enhancement
 */
export interface VideoAudioSettings {
  targetLUFS: number; // Loudness standard (-23 for broadcast)
  dynamicRange: number; // Target dynamic range
  eqPreset: 'voice' | 'narration' | 'dialogue' | 'documentary' | 'custom';
  noiseReduction: boolean;
  deEsser: boolean;
  limiter: LimiterSettings;
  roomTone: RoomToneSettings;
}

export interface LimiterSettings {
  enabled: boolean;
  threshold: number; // dB
  ceiling: number; // dB
  release: number; // ms
}

export interface RoomToneSettings {
  enabled: boolean;
  duration: number; // seconds of room tone to add
  level: number; // 0-1 relative to dialogue
  source: 'generate' | 'extract' | 'file';
  sourceFile?: string;
}