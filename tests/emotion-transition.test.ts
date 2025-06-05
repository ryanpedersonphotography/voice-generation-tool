import { describe, it, expect, beforeEach } from 'vitest';
import { EmotionTransitionEngine } from '../src/core/emotion-transition-engine.js';
import { EmotionTransition, TransitionConfig } from '../src/interfaces/emotion-transition.interface.js';
import { EmotionProfile } from '../src/interfaces/voice.interface.js';
import { EmotionCurves } from '../src/utils/emotion-curves.js';

describe('EmotionTransitionEngine', () => {
  let engine: EmotionTransitionEngine;
  let defaultEmotion: EmotionProfile;

  beforeEach(() => {
    engine = new EmotionTransitionEngine();
    defaultEmotion = {
      type: 'neutral',
      intensity: 0.5,
      variations: []
    };
  });

  it('should create emotion transition engine', () => {
    expect(engine).toBeInstanceOf(EmotionTransitionEngine);
  });

  it('should process simple emotion transition', async () => {
    const text = 'I was calm, but then I became really excited!';
    const transitions: EmotionTransition[] = [
      {
        fromEmotion: { type: 'calm', intensity: 0.6, variations: [] },
        toEmotion: { type: 'excited', intensity: 0.9, variations: [] },
        duration: 2000,
        curve: 'ease-in-out',
        triggers: { word: 'excited' }
      }
    ];

    const result = await engine.processEmotionTransitions(text, transitions, defaultEmotion);

    expect(result.timeline).toBeDefined();
    expect(result.segments).toBeDefined();
    expect(result.transitionCount).toBe(1);
    expect(result.segments.length).toBeGreaterThan(0);
  });

  it('should handle time-based triggers', async () => {
    const text = 'This is a test of time-based emotion triggers.';
    const transitions: EmotionTransition[] = [
      {
        fromEmotion: { type: 'neutral', intensity: 0.5, variations: [] },
        toEmotion: { type: 'happy', intensity: 0.8, variations: [] },
        duration: 1500,
        curve: 'linear',
        triggers: { time: 2000 }
      }
    ];

    const result = await engine.processEmotionTransitions(text, transitions, defaultEmotion);

    expect(result.timeline.keyframes.some(kf => kf.time === 2000)).toBe(true);
    expect(result.transitionCount).toBe(1);
  });

  it('should handle multiple emotion transitions', async () => {
    const text = 'Start calm, get excited, then become sad, and finally happy again.';
    const transitions: EmotionTransition[] = [
      {
        fromEmotion: { type: 'calm', intensity: 0.6, variations: [] },
        toEmotion: { type: 'excited', intensity: 0.9, variations: [] },
        duration: 1000,
        curve: 'ease-in',
        triggers: { word: 'excited' }
      },
      {
        fromEmotion: { type: 'excited', intensity: 0.9, variations: [] },
        toEmotion: { type: 'sad', intensity: 0.7, variations: [] },
        duration: 1500,
        curve: 'ease-out',
        triggers: { word: 'sad' }
      },
      {
        fromEmotion: { type: 'sad', intensity: 0.7, variations: [] },
        toEmotion: { type: 'happy', intensity: 0.8, variations: [] },
        duration: 1200,
        curve: 'ease-in-out',
        triggers: { word: 'happy' }
      }
    ];

    const result = await engine.processEmotionTransitions(text, transitions, defaultEmotion);

    expect(result.transitionCount).toBe(3);
    expect(result.timeline.keyframes.length).toBeGreaterThan(3);
  });

  it('should validate transition configuration', () => {
    const validTransition: EmotionTransition = {
      fromEmotion: { type: 'neutral', intensity: 0.5, variations: [] },
      toEmotion: { type: 'happy', intensity: 0.8, variations: [] },
      duration: 1000,
      curve: 'linear',
      triggers: { word: 'test' }
    };

    const invalidTransition: EmotionTransition = {
      fromEmotion: { type: 'neutral', intensity: 0.5, variations: [] },
      toEmotion: { type: 'neutral', intensity: 0.51, variations: [] }, // Intensity difference too small
      duration: 100, // Duration too short
      curve: 'linear',
      triggers: { word: 'test' }
    };

    expect(engine.validateTransition(validTransition)).toBe(true);
    expect(engine.validateTransition(invalidTransition)).toBe(false);
  });

  it('should update configuration', () => {
    const newConfig: Partial<TransitionConfig> = {
      minimumDuration: 1000,
      maximumDuration: 5000,
      intensityThreshold: 0.2
    };

    engine.updateConfig(newConfig);
    const config = engine.getConfig();

    expect(config.minimumDuration).toBe(1000);
    expect(config.maximumDuration).toBe(5000);
    expect(config.intensityThreshold).toBe(0.2);
  });

  it('should blend emotions correctly', () => {
    const primaryEmotion: EmotionProfile = {
      type: 'happy',
      intensity: 0.8,
      variations: []
    };

    const secondaryEmotion: EmotionProfile = {
      type: 'excited',
      intensity: 0.6,
      variations: []
    };

    const blend = engine.blendEmotions({
      primary: primaryEmotion,
      secondary: secondaryEmotion,
      blendRatio: 0.3
    });

    expect(blend.type).toBe('happy'); // Primary emotion should dominate
    expect(blend.intensity).toBeCloseTo(0.74); // 0.8 * 0.7 + 0.6 * 0.3
  });
});

describe('EmotionCurves', () => {
  it('should calculate linear interpolation', () => {
    expect(EmotionCurves.linear(0)).toBe(0);
    expect(EmotionCurves.linear(0.5)).toBe(0.5);
    expect(EmotionCurves.linear(1)).toBe(1);
  });

  it('should calculate ease-in curve', () => {
    expect(EmotionCurves.easeIn(0)).toBe(0);
    expect(EmotionCurves.easeIn(0.5)).toBe(0.25);
    expect(EmotionCurves.easeIn(1)).toBe(1);
  });

  it('should calculate ease-out curve', () => {
    expect(EmotionCurves.easeOut(0)).toBe(0);
    expect(EmotionCurves.easeOut(0.5)).toBe(0.75);
    expect(EmotionCurves.easeOut(1)).toBe(1);
  });

  it('should calculate ease-in-out curve', () => {
    expect(EmotionCurves.easeInOut(0)).toBe(0);
    expect(EmotionCurves.easeInOut(0.25)).toBe(0.125);
    expect(EmotionCurves.easeInOut(0.75)).toBe(0.875);
    expect(EmotionCurves.easeInOut(1)).toBe(1);
  });

  it('should interpolate emotion intensity', () => {
    const result = EmotionCurves.interpolateEmotionIntensity(0.2, 0.8, 0.5);
    expect(result).toBe(0.5); // Midpoint between 0.2 and 0.8
  });

  it('should create natural emotion curves', () => {
    const happyProgress = EmotionCurves.naturalEmotionCurve(0.2, 'happy');
    const sadProgress = EmotionCurves.naturalEmotionCurve(0.2, 'sad');
    const angryProgress = EmotionCurves.naturalEmotionCurve(0.1, 'angry');
    
    expect(happyProgress).toBeGreaterThan(0);
    expect(sadProgress).toBeGreaterThan(0);
    expect(angryProgress).toBeGreaterThan(0);
  });

  it('should handle smooth multi-transition', () => {
    const emotions = [
      { time: 0, intensity: 0.2 },
      { time: 1000, intensity: 0.8 },
      { time: 2000, intensity: 0.4 }
    ];

    const result = EmotionCurves.smoothMultiTransition(emotions, 500, 2000);
    expect(result).toBeCloseTo(0.5); // Midpoint between 0.2 and 0.8
  });

  it('should get curve function by type', () => {
    const linearCurve = EmotionCurves.getCurveFunction('linear');
    const easeInCurve = EmotionCurves.getCurveFunction('ease-in');
    
    expect(linearCurve.type).toBe('linear');
    expect(easeInCurve.type).toBe('ease-in');
    expect(linearCurve.calculate(0.5)).toBe(0.5);
    expect(easeInCurve.calculate(0.5)).toBe(0.25);
  });
});