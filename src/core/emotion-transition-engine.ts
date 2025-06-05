import {
  EmotionTransition,
  EmotionTimeline,
  EmotionKeyframe,
  EmotionSegment,
  TransitionConfig,
  EmotionTransitionResult,
  EmotionBlend
} from '../interfaces/emotion-transition.interface.js';
import { EmotionProfile, EmotionType } from '../interfaces/voice.interface.js';
import { EmotionCurves } from '../utils/emotion-curves.js';

export class EmotionTransitionEngine {
  private config: TransitionConfig;

  constructor(config?: Partial<TransitionConfig>) {
    this.config = {
      enableSmoothing: true,
      minimumDuration: 500, // 0.5 seconds
      maximumDuration: 3000, // 3 seconds
      naturalBreaks: true,
      intensityThreshold: 0.1,
      ...config
    };
  }

  /**
   * Process text with emotion transitions to create a timeline
   */
  async processEmotionTransitions(
    text: string,
    transitions: EmotionTransition[],
    defaultEmotion: EmotionProfile
  ): Promise<EmotionTransitionResult> {
    // Create emotion timeline from transitions
    const timeline = this.createEmotionTimeline(text, transitions, defaultEmotion);
    
    // Generate emotion segments for audio processing
    const segments = this.generateEmotionSegments(text, timeline);
    
    // Calculate total duration based on text length and speaking rate
    const totalDuration = this.estimateAudioDuration(text);

    return {
      timeline,
      segments,
      totalDuration,
      transitionCount: transitions.length
    };
  }

  /**
   * Create a timeline of emotion keyframes from transitions
   */
  private createEmotionTimeline(
    text: string,
    transitions: EmotionTransition[],
    defaultEmotion: EmotionProfile
  ): EmotionTimeline {
    const keyframes: EmotionKeyframe[] = [];
    const textLength = text.length;
    
    // Add initial keyframe with default emotion
    keyframes.push({
      time: 0,
      emotion: defaultEmotion.type,
      intensity: defaultEmotion.intensity
    });

    // Process each transition
    for (const transition of transitions) {
      const triggerTime = this.calculateTriggerTime(text, transition);
      
      if (triggerTime >= 0) {
        // Add transition start keyframe
        keyframes.push({
          time: triggerTime,
          emotion: transition.fromEmotion.type,
          intensity: transition.fromEmotion.intensity,
          transition
        });

        // Add transition end keyframe
        keyframes.push({
          time: triggerTime + transition.duration,
          emotion: transition.toEmotion.type,
          intensity: transition.toEmotion.intensity
        });
      }
    }

    // Sort keyframes by time
    keyframes.sort((a, b) => a.time - b.time);

    // Estimate total duration
    const totalDuration = this.estimateAudioDuration(text);

    return {
      keyframes,
      duration: totalDuration,
      defaultEmotion
    };
  }

  /**
   * Calculate when a transition should trigger based on the trigger configuration
   */
  private calculateTriggerTime(text: string, transition: EmotionTransition): number {
    const trigger = transition.triggers;

    // Time-based trigger
    if (trigger.time !== undefined) {
      return trigger.time;
    }

    // Word-based trigger
    if (trigger.word) {
      const wordIndex = text.toLowerCase().indexOf(trigger.word.toLowerCase());
      if (wordIndex >= 0) {
        // Estimate time based on character position and average speaking rate
        const avgCharsPerSecond = 15; // ~180 WPM
        return (wordIndex / avgCharsPerSecond) * 1000;
      }
    }

    // Position-based trigger
    if (trigger.position !== undefined) {
      const avgCharsPerSecond = 15;
      return (trigger.position / avgCharsPerSecond) * 1000;
    }

    // Marker-based trigger (custom markers in text like [EXCITED])
    if (trigger.marker) {
      const markerPattern = new RegExp(`\\[${trigger.marker}\\]`, 'i');
      const match = text.match(markerPattern);
      if (match && match.index !== undefined) {
        const avgCharsPerSecond = 15;
        return (match.index / avgCharsPerSecond) * 1000;
      }
    }

    return -1; // Trigger not found
  }

  /**
   * Generate audio segments with emotion data for synthesis
   */
  private generateEmotionSegments(text: string, timeline: EmotionTimeline): EmotionSegment[] {
    const segments: EmotionSegment[] = [];
    const words = this.splitTextIntoWords(text);
    const totalDuration = timeline.duration;
    
    let currentTime = 0;
    const avgWordsPerSecond = 3; // ~180 WPM
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const wordDuration = (word.length / 15) * 1000; // Estimate based on characters
      const segmentEndTime = currentTime + wordDuration;
      
      // Get emotion at current time
      const emotionAtTime = this.getEmotionAtTime(timeline, currentTime);
      
      // Check if this segment is during a transition
      const transitionData = this.getTransitionAtTime(timeline, currentTime);
      
      segments.push({
        startTime: currentTime,
        endTime: segmentEndTime,
        text: word,
        emotion: emotionAtTime,
        isTransition: transitionData !== null,
        transitionData: transitionData || undefined
      });
      
      currentTime = segmentEndTime;
    }

    return segments;
  }

  /**
   * Get the emotion profile at a specific time in the timeline
   */
  private getEmotionAtTime(timeline: EmotionTimeline, time: number): EmotionProfile {
    const keyframes = timeline.keyframes;
    
    // Find the keyframes we're between
    for (let i = 0; i < keyframes.length - 1; i++) {
      const current = keyframes[i];
      const next = keyframes[i + 1];
      
      if (time >= current.time && time <= next.time) {
        // Check if we're in a transition
        if (current.transition && time <= current.time + current.transition.duration) {
          return this.interpolateEmotion(current, next, time, current.transition);
        }
        
        // Use current emotion if not in transition
        return {
          type: current.emotion,
          intensity: current.intensity,
          variations: []
        };
      }
    }
    
    // Use last keyframe if time is beyond timeline
    const lastKeyframe = keyframes[keyframes.length - 1];
    return {
      type: lastKeyframe.emotion,
      intensity: lastKeyframe.intensity,
      variations: []
    };
  }

  /**
   * Get transition data if currently in a transition
   */
  private getTransitionAtTime(timeline: EmotionTimeline, time: number): any {
    for (const keyframe of timeline.keyframes) {
      if (keyframe.transition && 
          time >= keyframe.time && 
          time <= keyframe.time + keyframe.transition.duration) {
        
        const progress = (time - keyframe.time) / keyframe.transition.duration;
        return {
          fromEmotion: keyframe.transition.fromEmotion,
          toEmotion: keyframe.transition.toEmotion,
          progress
        };
      }
    }
    return null;
  }

  /**
   * Interpolate emotion between two keyframes during a transition
   */
  private interpolateEmotion(
    fromKeyframe: EmotionKeyframe,
    toKeyframe: EmotionKeyframe,
    currentTime: number,
    transition: EmotionTransition
  ): EmotionProfile {
    const progress = (currentTime - fromKeyframe.time) / transition.duration;
    const clampedProgress = Math.max(0, Math.min(1, progress));
    
    // Use emotion curves to calculate smooth transition
    const intensity = EmotionCurves.interpolateEmotionIntensity(
      transition.fromEmotion.intensity,
      transition.toEmotion.intensity,
      clampedProgress,
      transition.curve,
      transition.controlPoints
    );

    // For emotion type, we typically switch at 50% progress
    const emotionType = clampedProgress < 0.5 ? 
      transition.fromEmotion.type : 
      transition.toEmotion.type;

    return {
      type: emotionType,
      intensity,
      variations: []
    };
  }

  /**
   * Blend two emotions with a given ratio
   */
  blendEmotions(blend: EmotionBlend): EmotionProfile {
    const { primary, secondary, blendRatio } = blend;
    
    // Blend intensity
    const intensity = primary.intensity * (1 - blendRatio) + 
                     secondary.intensity * blendRatio;
    
    // Choose emotion type based on stronger intensity
    const emotionType = primary.intensity >= secondary.intensity ? 
      primary.type : secondary.type;

    return {
      type: emotionType,
      intensity,
      variations: [...primary.variations, ...secondary.variations]
    };
  }

  /**
   * Split text into words while preserving punctuation context
   */
  private splitTextIntoWords(text: string): string[] {
    return text.split(/\s+/).filter(word => word.length > 0);
  }

  /**
   * Estimate audio duration based on text length and average speaking rate
   */
  private estimateAudioDuration(text: string): number {
    const wordCount = text.split(/\s+/).length;
    const wordsPerMinute = 180; // Average speaking rate
    const durationMinutes = wordCount / wordsPerMinute;
    return durationMinutes * 60 * 1000; // Convert to milliseconds
  }

  /**
   * Validate emotion transition configuration
   */
  validateTransition(transition: EmotionTransition): boolean {
    if (transition.duration < this.config.minimumDuration) return false;
    if (transition.duration > this.config.maximumDuration) return false;
    
    const intensityDiff = Math.abs(
      transition.toEmotion.intensity - transition.fromEmotion.intensity
    );
    if (intensityDiff < this.config.intensityThreshold) return false;
    
    return true;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<TransitionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): TransitionConfig {
    return { ...this.config };
  }
}