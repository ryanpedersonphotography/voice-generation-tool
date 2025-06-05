import { EmotionProfile, EmotionType } from './voice.interface.js';

export type TransitionCurve = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bezier';

export interface EmotionTransition {
  id?: string;
  fromEmotion: EmotionProfile;
  toEmotion: EmotionProfile;
  duration: number; // milliseconds
  curve: TransitionCurve;
  triggers: EmotionTrigger;
  controlPoints?: [number, number][]; // For bezier curves
}

export interface EmotionTrigger {
  word?: string;
  time?: number; // milliseconds from start
  marker?: string; // Custom marker in text
  position?: number; // Character position in text
}

export interface EmotionCurveFunction {
  type: TransitionCurve;
  calculate: (progress: number) => number; // progress: 0-1, returns: 0-1
  controlPoints?: [number, number][];
}

export interface EmotionKeyframe {
  time: number; // milliseconds
  emotion: EmotionType;
  intensity: number;
  transition?: EmotionTransition;
}

export interface EmotionTimeline {
  keyframes: EmotionKeyframe[];
  duration: number;
  defaultEmotion: EmotionProfile;
}

export interface TransitionConfig {
  enableSmoothing: boolean;
  minimumDuration: number; // Minimum transition time
  maximumDuration: number; // Maximum transition time
  naturalBreaks: boolean; // Use natural speech breaks for transitions
  intensityThreshold: number; // Minimum intensity change to trigger transition
}

export interface EmotionBlend {
  primary: EmotionProfile;
  secondary: EmotionProfile;
  blendRatio: number; // 0-1, where 0 = all primary, 1 = all secondary
}

export interface EmotionTransitionResult {
  timeline: EmotionTimeline;
  segments: EmotionSegment[];
  totalDuration: number;
  transitionCount: number;
}

export interface EmotionSegment {
  startTime: number;
  endTime: number;
  text: string;
  emotion: EmotionProfile;
  isTransition: boolean;
  transitionData?: {
    fromEmotion: EmotionProfile;
    toEmotion: EmotionProfile;
    progress: number;
  };
}