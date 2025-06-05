import {
  VideoScene,
  SceneContext,
  VoiceRecommendation,
  ReverbSettings,
  EQSettings,
  CompressionSettings,
  SpatialPosition,
  SceneMood,
  Environment,
  TimeOfDay,
  ProximityToCamera
} from '../interfaces/video.interface.js';
import { EmotionProfile } from '../interfaces/voice.interface.js';

/**
 * Scene analyzer that recommends voice settings based on video context
 */
export class SceneAnalyzer {
  private moodEmotionMap: Map<SceneMood, EmotionProfile>;
  private environmentAudioMap: Map<Environment, Partial<VoiceRecommendation>>;
  private proximityVolumeMap: Map<ProximityToCamera, number>;

  constructor() {
    this.initializeMappings();
  }

  /**
   * Initialize mapping tables for scene analysis
   */
  private initializeMappings(): void {
    // Map scene moods to emotional profiles
    this.moodEmotionMap = new Map([
      ['dramatic', { primary: 'serious', intensity: 0.8, confidence: 0.9 }],
      ['comedic', { primary: 'happy', intensity: 0.7, confidence: 0.8 }],
      ['romantic', { primary: 'tender', intensity: 0.6, confidence: 0.8 }],
      ['action', { primary: 'excited', intensity: 0.9, confidence: 0.9 }],
      ['documentary', { primary: 'neutral', intensity: 0.5, confidence: 0.9 }],
      ['educational', { primary: 'calm', intensity: 0.6, confidence: 0.8 }]
    ]);

    // Map environments to audio processing settings
    this.environmentAudioMap = new Map([
      ['indoor', {
        reverb: { enabled: true, roomSize: 0.3, damping: 0.7, wetLevel: 0.2, dryLevel: 0.8, predelay: 10 },
        eq: { enabled: true, lowCut: 80, highCut: 12000 }
      }],
      ['outdoor', {
        reverb: { enabled: true, roomSize: 0.8, damping: 0.3, wetLevel: 0.4, dryLevel: 0.6, predelay: 20 },
        eq: { enabled: true, lowCut: 60, highCut: 15000 }
      }],
      ['studio', {
        reverb: { enabled: false, roomSize: 0.1, damping: 0.9, wetLevel: 0.05, dryLevel: 0.95, predelay: 5 },
        eq: { enabled: true, lowCut: 40, highCut: 20000 }
      }],
      ['vehicle', {
        reverb: { enabled: true, roomSize: 0.2, damping: 0.8, wetLevel: 0.15, dryLevel: 0.85, predelay: 5 },
        eq: { enabled: true, lowCut: 100, highCut: 8000 },
        compression: { enabled: true, threshold: -12, ratio: 3, attack: 5, release: 50, makeupGain: 2 }
      }],
      ['crowded', {
        reverb: { enabled: true, roomSize: 0.6, damping: 0.4, wetLevel: 0.3, dryLevel: 0.7, predelay: 15 },
        eq: { enabled: true, lowCut: 120, midPeaking: { frequency: 2000, gain: 2, q: 1.5 } },
        compression: { enabled: true, threshold: -10, ratio: 4, attack: 3, release: 30, makeupGain: 3 }
      }],
      ['quiet', {
        reverb: { enabled: true, roomSize: 0.4, damping: 0.6, wetLevel: 0.25, dryLevel: 0.75, predelay: 12 },
        eq: { enabled: false },
        compression: { enabled: false }
      }]
    ]);

    // Map proximity to volume adjustments
    this.proximityVolumeMap = new Map([
      ['close', 0.9],    // Slightly lower for intimate feel
      ['medium', 1.0],   // Standard volume
      ['wide', 1.2]      // Slightly higher to compensate for distance
    ]);
  }

  /**
   * Analyze scene context and generate comprehensive analysis
   */
  analyzeSceneContext(scene: VideoScene): SceneAnalysisResult {
    console.log(`🎬 Analyzing scene: ${scene.name || scene.id}`);

    const context = scene.context;
    const recommendations = this.recommendVoiceSettings(context);
    const emotionalCues = this.extractEmotionalCues(scene);
    const technicalRequirements = this.assessTechnicalRequirements(context);
    const challenges = this.identifyPotentialChallenges(context);

    return {
      scene,
      context,
      recommendations,
      emotionalCues,
      technicalRequirements,
      challenges,
      confidence: this.calculateAnalysisConfidence(context)
    };
  }

  /**
   * Recommend voice settings based on scene context
   */
  recommendVoiceSettings(context: SceneContext): VoiceRecommendation {
    // Get base emotion from mood
    const baseEmotion = this.moodEmotionMap.get(context.mood) || {
      primary: 'neutral',
      intensity: 0.5,
      confidence: 0.5
    };

    // Adjust emotion intensity based on context
    const adjustedEmotion = this.adjustEmotionForContext(baseEmotion, context);

    // Get base volume from proximity
    const baseVolume = this.proximityVolumeMap.get(context.proximityToCamera) || 1.0;

    // Adjust volume for environment and background noise
    const adjustedVolume = this.adjustVolumeForEnvironment(baseVolume, context);

    // Get environment-specific audio settings
    const environmentSettings = this.environmentAudioMap.get(context.environment) || {};

    // Generate spatial positioning
    const spatialPosition = this.calculateSpatialPosition(context);

    // Calculate confidence based on context completeness
    const confidence = this.calculateRecommendationConfidence(context);

    return {
      emotionalTone: adjustedEmotion,
      volume: adjustedVolume,
      reverb: this.buildReverbSettings(environmentSettings.reverb, context),
      eq: this.buildEQSettings(environmentSettings.eq, context),
      compression: this.buildCompressionSettings(environmentSettings.compression, context),
      spatialPosition,
      confidence
    };
  }

  /**
   * Adjust emotion based on scene context factors
   */
  private adjustEmotionForContext(baseEmotion: EmotionProfile, context: SceneContext): EmotionProfile {
    let adjustedIntensity = baseEmotion.intensity;

    // Time of day adjustments
    switch (context.timeOfDay) {
      case 'morning':
        adjustedIntensity *= 0.9; // Slightly more subdued
        break;
      case 'evening':
        adjustedIntensity *= 1.1; // Slightly more intense
        break;
      case 'night':
        adjustedIntensity *= 0.8; // More intimate/quiet
        break;
    }

    // Environmental intensity adjustments
    if (context.environment === 'crowded') {
      adjustedIntensity *= 1.2; // Need more intensity to cut through
    } else if (context.environment === 'quiet') {
      adjustedIntensity *= 0.8; // More subdued for quiet environments
    }

    // Emotional intensity override
    if (context.emotionalIntensity !== undefined) {
      adjustedIntensity = (adjustedIntensity + context.emotionalIntensity) / 2;
    }

    // Ensure intensity stays within bounds
    adjustedIntensity = Math.max(0, Math.min(1, adjustedIntensity));

    return {
      ...baseEmotion,
      intensity: adjustedIntensity
    };
  }

  /**
   * Adjust volume for environment and background noise
   */
  private adjustVolumeForEnvironment(baseVolume: number, context: SceneContext): number {
    let adjustedVolume = baseVolume;

    // Background noise compensation
    adjustedVolume += context.backgroundNoise * 0.3; // Up to 30% increase for noise

    // Environment-specific adjustments
    switch (context.environment) {
      case 'outdoor':
        adjustedVolume *= 1.1; // Slightly louder for outdoor
        break;
      case 'vehicle':
        adjustedVolume *= 1.15; // Louder to overcome road noise
        break;
      case 'crowded':
        adjustedVolume *= 1.2; // Much louder for crowded spaces
        break;
      case 'studio':
        adjustedVolume *= 0.95; // Slightly quieter for controlled environment
        break;
    }

    // Character count adjustment (more people = need to be heard)
    if (context.characterCount > 2) {
      adjustedVolume *= 1 + (context.characterCount - 2) * 0.05; // 5% per additional character
    }

    // Ensure volume stays within reasonable bounds
    return Math.max(0.3, Math.min(2.0, adjustedVolume));
  }

  /**
   * Calculate spatial audio position based on context
   */
  private calculateSpatialPosition(context: SceneContext): SpatialPosition {
    // Default center position
    let x = 0; // Center
    let y = 0; // Center
    let z = 0; // Center
    let distance = 0.5; // Medium distance

    // Adjust based on proximity
    switch (context.proximityToCamera) {
      case 'close':
        distance = 0.2;
        y = 0.2; // Slightly forward
        break;
      case 'medium':
        distance = 0.5;
        break;
      case 'wide':
        distance = 0.8;
        y = -0.2; // Slightly back
        break;
    }

    // Environment adjustments
    if (context.environment === 'outdoor') {
      z = 0.1; // Slightly elevated for outdoor feel
    } else if (context.environment === 'vehicle') {
      y = -0.1; // Slightly back for enclosed feel
    }

    return { x, y, z, distance };
  }

  /**
   * Build reverb settings from environment defaults and context
   */
  private buildReverbSettings(
    baseSettings: Partial<ReverbSettings> | undefined,
    context: SceneContext
  ): ReverbSettings {
    const defaults: ReverbSettings = {
      enabled: true,
      roomSize: 0.4,
      damping: 0.6,
      wetLevel: 0.2,
      dryLevel: 0.8,
      predelay: 10
    };

    const settings = { ...defaults, ...baseSettings };

    // Adjust for mood
    if (context.mood === 'dramatic') {
      settings.roomSize *= 1.2;
      settings.wetLevel *= 1.3;
    } else if (context.mood === 'romantic') {
      settings.damping *= 1.2;
      settings.wetLevel *= 0.8;
    }

    return settings;
  }

  /**
   * Build EQ settings from environment defaults and context
   */
  private buildEQSettings(
    baseSettings: Partial<EQSettings> | undefined,
    context: SceneContext
  ): EQSettings {
    const defaults: EQSettings = {
      enabled: true,
      lowCut: 80,
      lowShelf: { frequency: 200, gain: 0, q: 0.7 },
      midPeaking: { frequency: 1000, gain: 0, q: 1.0 },
      highShelf: { frequency: 8000, gain: 0, q: 0.7 },
      highCut: 15000
    };

    const settings = { ...defaults, ...baseSettings };

    // Voice clarity adjustments for different moods
    if (context.mood === 'action') {
      settings.midPeaking.gain = 2; // Boost presence for action
      settings.highShelf.gain = 1;
    } else if (context.mood === 'romantic') {
      settings.lowShelf.gain = 1; // Warmer tone
      settings.highCut = 12000; // Softer highs
    }

    return settings;
  }

  /**
   * Build compression settings from environment defaults and context
   */
  private buildCompressionSettings(
    baseSettings: Partial<CompressionSettings> | undefined,
    context: SceneContext
  ): CompressionSettings {
    const defaults: CompressionSettings = {
      enabled: false,
      threshold: -18,
      ratio: 2,
      attack: 10,
      release: 100,
      makeupGain: 0
    };

    const settings = { ...defaults, ...baseSettings };

    // Enable compression for challenging environments
    if (context.backgroundNoise > 0.5 || context.environment === 'crowded') {
      settings.enabled = true;
      settings.threshold = -15;
      settings.ratio = 3;
      settings.makeupGain = 2;
    }

    // Adjust for pacing
    if (context.pacing === 'fast') {
      settings.attack = 5; // Faster attack for quick speech
      settings.release = 50;
    } else if (context.pacing === 'slow') {
      settings.attack = 15; // Slower attack for deliberate speech
      settings.release = 200;
    }

    return settings;
  }

  /**
   * Extract emotional cues from scene content
   */
  private extractEmotionalCues(scene: VideoScene): EmotionalCue[] {
    const cues: EmotionalCue[] = [];

    // Analyze voice requirements for emotional indicators
    scene.voiceRequirements.forEach((req, index) => {
      const textCues = this.analyzeTextForEmotions(req.text);
      cues.push(...textCues.map(cue => ({
        ...cue,
        startTime: req.startTime,
        endTime: req.endTime,
        source: `voice_requirement_${index}`
      })));

      // Add explicit emotion if specified
      if (req.emotionProfile) {
        cues.push({
          emotion: req.emotionProfile.primary,
          intensity: req.emotionProfile.intensity,
          confidence: req.emotionProfile.confidence,
          startTime: req.startTime,
          endTime: req.endTime,
          source: 'explicit_emotion',
          description: `Explicit ${req.emotionProfile.primary} emotion`
        });
      }
    });

    return cues;
  }

  /**
   * Analyze text content for emotional indicators
   */
  private analyzeTextForEmotions(text: string): EmotionalCue[] {
    const cues: EmotionalCue[] = [];
    const lowerText = text.toLowerCase();

    // Emotional keyword detection
    const emotionKeywords = {
      happy: ['happy', 'joy', 'excited', 'wonderful', 'amazing', 'great', 'fantastic'],
      sad: ['sad', 'crying', 'tears', 'sorrow', 'devastating', 'heartbreak'],
      angry: ['angry', 'furious', 'rage', 'mad', 'outraged', 'livid'],
      fearful: ['scared', 'afraid', 'terrified', 'frightened', 'worried', 'anxious'],
      surprised: ['surprised', 'shocked', 'amazed', 'astonished', 'stunned'],
      calm: ['calm', 'peaceful', 'serene', 'tranquil', 'relaxed']
    };

    Object.entries(emotionKeywords).forEach(([emotion, keywords]) => {
      keywords.forEach(keyword => {
        if (lowerText.includes(keyword)) {
          cues.push({
            emotion,
            intensity: 0.7,
            confidence: 0.6,
            startTime: 0,
            endTime: 0,
            source: 'text_analysis',
            description: `Detected keyword: "${keyword}"`
          });
        }
      });
    });

    // Punctuation-based emotion detection
    if (text.includes('!')) {
      cues.push({
        emotion: 'excited',
        intensity: 0.6,
        confidence: 0.5,
        startTime: 0,
        endTime: 0,
        source: 'punctuation',
        description: 'Exclamation mark detected'
      });
    }

    if (text.includes('?')) {
      cues.push({
        emotion: 'curious',
        intensity: 0.5,
        confidence: 0.4,
        startTime: 0,
        endTime: 0,
        source: 'punctuation',
        description: 'Question mark detected'
      });
    }

    return cues;
  }

  /**
   * Assess technical requirements for the scene
   */
  private assessTechnicalRequirements(context: SceneContext): TechnicalRequirement[] {
    const requirements: TechnicalRequirement[] = [];

    // Audio processing requirements
    if (context.backgroundNoise > 0.3) {
      requirements.push({
        type: 'noise_reduction',
        priority: 'high',
        description: 'High background noise detected - noise reduction required',
        settings: { enabled: true, strength: context.backgroundNoise }
      });
    }

    if (context.environment === 'vehicle' || context.environment === 'crowded') {
      requirements.push({
        type: 'compression',
        priority: 'medium',
        description: 'Challenging acoustic environment - compression recommended',
        settings: { threshold: -12, ratio: 3, makeupGain: 2 }
      });
    }

    // Voice enhancement requirements
    if (context.characterCount > 3) {
      requirements.push({
        type: 'voice_separation',
        priority: 'high',
        description: 'Multiple speakers - voice separation and clarity enhancement needed',
        settings: { speakerCount: context.characterCount }
      });
    }

    // Spatial audio requirements
    if (context.environment === 'outdoor' || context.proximityToCamera === 'wide') {
      requirements.push({
        type: 'spatial_audio',
        priority: 'medium',
        description: 'Spatial audio processing recommended for environment/distance',
        settings: { enabled: true, roomSize: 'large' }
      });
    }

    return requirements;
  }

  /**
   * Identify potential challenges for voice processing
   */
  private identifyPotentialChallenges(context: SceneContext): ProcessingChallenge[] {
    const challenges: ProcessingChallenge[] = [];

    // Environmental challenges
    if (context.backgroundNoise > 0.7) {
      challenges.push({
        type: 'high_noise',
        severity: 'high',
        description: 'Very high background noise may affect voice quality',
        mitigation: [
          'Use aggressive noise reduction',
          'Increase voice level significantly',
          'Consider re-recording in quieter environment'
        ]
      });
    }

    if (context.environment === 'vehicle' && context.backgroundNoise > 0.5) {
      challenges.push({
        type: 'vehicle_noise',
        severity: 'medium',
        description: 'Vehicle environment with road noise',
        mitigation: [
          'Apply high-pass filter to remove low-frequency rumble',
          'Use compression to maintain consistent levels',
          'Boost mid-frequency clarity'
        ]
      });
    }

    // Technical challenges
    if (context.characterCount > 5) {
      challenges.push({
        type: 'many_speakers',
        severity: 'medium',
        description: 'Large number of speakers may cause clarity issues',
        mitigation: [
          'Ensure distinct voice characteristics for each speaker',
          'Use spatial positioning to separate voices',
          'Consider sequential rather than overlapping speech'
        ]
      });
    }

    // Timing challenges
    if (context.pacing === 'fast' && context.characterCount > 2) {
      challenges.push({
        type: 'fast_dialogue',
        severity: 'medium',
        description: 'Fast-paced multi-character dialogue may be difficult to follow',
        mitigation: [
          'Ensure clear articulation for each character',
          'Add slight pauses between speaker changes',
          'Use distinct vocal characteristics'
        ]
      });
    }

    return challenges;
  }

  /**
   * Calculate confidence in scene analysis
   */
  private calculateAnalysisConfidence(context: SceneContext): number {
    let confidence = 1.0;

    // Reduce confidence for incomplete context
    if (!context.mood) confidence -= 0.2;
    if (!context.environment) confidence -= 0.2;
    if (context.characterCount === 0) confidence -= 0.1;
    if (context.backgroundNoise === undefined) confidence -= 0.1;
    if (context.emotionalIntensity === undefined) confidence -= 0.1;

    // Reduce confidence for challenging scenarios
    if (context.backgroundNoise > 0.8) confidence -= 0.2;
    if (context.characterCount > 5) confidence -= 0.1;

    return Math.max(0, confidence);
  }

  /**
   * Calculate confidence in voice recommendations
   */
  private calculateRecommendationConfidence(context: SceneContext): number {
    let confidence = 0.8; // Base confidence

    // Increase confidence for well-defined contexts
    if (this.moodEmotionMap.has(context.mood)) confidence += 0.1;
    if (this.environmentAudioMap.has(context.environment)) confidence += 0.1;

    // Decrease confidence for edge cases
    if (context.backgroundNoise > 0.9) confidence -= 0.2;
    if (context.characterCount > 10) confidence -= 0.2;

    return Math.max(0.1, Math.min(1.0, confidence));
  }
}

/**
 * Supporting interfaces for scene analysis
 */
export interface SceneAnalysisResult {
  scene: VideoScene;
  context: SceneContext;
  recommendations: VoiceRecommendation;
  emotionalCues: EmotionalCue[];
  technicalRequirements: TechnicalRequirement[];
  challenges: ProcessingChallenge[];
  confidence: number;
}

export interface EmotionalCue {
  emotion: string;
  intensity: number;
  confidence: number;
  startTime: number;
  endTime: number;
  source: 'text_analysis' | 'explicit_emotion' | 'punctuation' | 'context_inference';
  description: string;
}

export interface TechnicalRequirement {
  type: 'noise_reduction' | 'compression' | 'voice_separation' | 'spatial_audio' | 'eq' | 'reverb';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  settings: Record<string, any>;
}

export interface ProcessingChallenge {
  type: 'high_noise' | 'vehicle_noise' | 'many_speakers' | 'fast_dialogue' | 'poor_acoustics';
  severity: 'low' | 'medium' | 'high';
  description: string;
  mitigation: string[];
}

export default SceneAnalyzer;