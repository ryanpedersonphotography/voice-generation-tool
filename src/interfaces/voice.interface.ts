export type EmotionType = 'happy' | 'sad' | 'angry' | 'excited' | 'calm' | 'fearful' | 'surprised' | 'neutral';

export interface EmotionVariation {
  subtype: string;
  intensity: number;
  duration?: number;
}

export interface EmphasisPoint {
  word: string;
  strength: number; // 0-1
  position: number; // character position in text
}

export interface PausePoint {
  position: number; // character position in text
  duration: number; // milliseconds
}

export interface EmotionMapEntry {
  start: number;
  end: number;
  emotion: EmotionType;
  intensity: number;
}

export interface VoiceProfile {
  id: string;
  name: string;
  provider: 'elevenlabs' | 'openai' | 'google' | 'amazon' | 'coqui';
  baseVoiceId: string;
  characteristics: VoiceCharacteristics;
  customSettings: Record<string, any>;
  created: Date;
  updated: Date;
}

export interface VoiceCharacteristics {
  gender: 'male' | 'female' | 'neutral';
  age: 'child' | 'young' | 'adult' | 'senior';
  accent: string;
  personality: string[];
  defaultEmotion: EmotionProfile;
  timbre: 'deep' | 'medium' | 'high';
  pace: 'slow' | 'normal' | 'fast';
}

export interface EmotionProfile {
  type: EmotionType;
  intensity: number; // 0-1
  variations: EmotionVariation[];
}

export interface VoiceModulation {
  emotion: EmotionProfile;
  speed: number; // 0.5-2.0
  pitch: number; // -20 to +20 semitones
  volume: number; // 0-1
  emphasis: EmphasisPoint[];
  pauses: PausePoint[];
}

export interface GenerationRequest {
  text: string;
  voiceProfile?: VoiceProfile;
  voicePrompt?: string;
  modulation?: VoiceModulation;
  outputFormat: 'mp3' | 'wav' | 'aac';
  emotionMap?: EmotionMapEntry[];
  emotionTransitions?: import('./emotion-transition.interface.js').EmotionTransition[];
}

export interface AudioProcessingOptions {
  format: 'mp3' | 'wav' | 'aac';
  normalize: boolean;
  removeNoise: boolean;
  bitrate?: number;
  sampleRate?: number;
}