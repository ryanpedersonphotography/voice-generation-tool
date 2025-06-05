/**
 * SSML (Speech Synthesis Markup Language) type definitions
 */

export type EmphasisLevel = 'strong' | 'moderate' | 'reduced';
export type BreakStrength = 'none' | 'x-weak' | 'weak' | 'medium' | 'strong' | 'x-strong';
export type VoiceGender = 'male' | 'female' | 'neutral';
export type VoiceAge = 'child' | 'young' | 'adult' | 'old';

/**
 * Prosody settings for speech modification
 */
export interface ProsodySettings {
  rate?: string;        // Speech rate (e.g., '1.0', '0.8', 'slow', 'fast')
  pitch?: string;       // Pitch adjustment (e.g., '+10%', '-5Hz', 'high')
  volume?: string;      // Volume adjustment (e.g., '+6dB', 'loud', 'soft')
  range?: string;       // Pitch range (e.g., '+20%', 'high', 'low')
}

/**
 * SSML element attributes
 */
export interface SSMLAttributes {
  // Voice attributes
  name?: string;
  gender?: VoiceGender;
  age?: VoiceAge;
  language?: string;
  
  // Prosody attributes
  prosody?: ProsodySettings;
  
  // Emphasis attributes
  level?: EmphasisLevel;
  
  // Break attributes
  strength?: BreakStrength;
  time?: string;
  
  // Audio attributes
  src?: string;
  clipBegin?: string;
  clipEnd?: string;
  speed?: string;
  repeatCount?: string;
  repeatDur?: string;
  soundLevel?: string;
  
  // Say-as attributes
  'interpret-as'?: 'characters' | 'spell-out' | 'cardinal' | 'number' | 'ordinal' | 'digits' | 'fraction' | 'unit' | 'date' | 'time' | 'telephone' | 'address';
  format?: string;
  detail?: string;
  
  // Phoneme attributes
  alphabet?: 'ipa' | 'x-sampa';
  ph?: string;
  
  // Substitution attributes
  alias?: string;
  
  // Generic XML attributes
  'xml:lang'?: string;
}

/**
 * SSML element structure
 */
export interface SSMLElement {
  tag: string;
  attributes?: Record<string, string>;
  content: string | SSMLElement[];
  selfClosing?: boolean;
}

/**
 * Complete SSML document
 */
export interface SSMLDocument {
  version: string;
  language: string;
  elements: SSMLElement[];
  rawSSML: string;
}

/**
 * SSML generation options
 */
export interface SSMLGenerationOptions {
  includeXMLDeclaration?: boolean;
  includeSpeak?: boolean;
  language?: string;
  version?: string;
  preserveWhitespace?: boolean;
  validateMarkup?: boolean;
}

/**
 * SSML validation result
 */
export interface SSMLValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Advanced SSML features
 */
export interface AdvancedSSMLFeatures {
  // Multi-voice support
  voiceSwitching?: boolean;
  
  // Audio mixing
  backgroundAudio?: boolean;
  audioEffects?: boolean;
  
  // Timing control
  preciseTimings?: boolean;
  synchronization?: boolean;
  
  // Expression control
  emotionalMarkup?: boolean;
  gestureAnnotation?: boolean;
  
  // Accessibility
  screenReaderOptimization?: boolean;
  visualDescriptions?: boolean;
}