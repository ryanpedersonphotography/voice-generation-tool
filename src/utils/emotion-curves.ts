import { TransitionCurve, EmotionCurveFunction } from '../interfaces/emotion-transition.interface.js';

/**
 * Mathematical curve functions for emotion transitions
 * Each function takes progress (0-1) and returns eased progress (0-1)
 */

export class EmotionCurves {
  static linear(progress: number): number {
    return Math.max(0, Math.min(1, progress));
  }

  static easeIn(progress: number): number {
    return progress * progress;
  }

  static easeOut(progress: number): number {
    return 1 - Math.pow(1 - progress, 2);
  }

  static easeInOut(progress: number): number {
    if (progress < 0.5) {
      return 2 * progress * progress;
    }
    return 1 - Math.pow(-2 * progress + 2, 2) / 2;
  }

  static bezier(progress: number, controlPoints: [number, number][] = [[0.25, 0.1], [0.75, 0.9]]): number {
    // Cubic bezier implementation
    const [cp1, cp2] = controlPoints;
    const t = progress;
    const t2 = t * t;
    const t3 = t2 * t;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;

    return mt3 * 0 + 3 * mt2 * t * cp1[1] + 3 * mt * t2 * cp2[1] + t3 * 1;
  }

  static elastic(progress: number, amplitude = 1, period = 0.3): number {
    if (progress === 0) return 0;
    if (progress === 1) return 1;

    const s = period / 4;
    return amplitude * Math.pow(2, -10 * progress) * Math.sin((progress - s) * (2 * Math.PI) / period) + 1;
  }

  static bounce(progress: number): number {
    if (progress < 1 / 2.75) {
      return 7.5625 * progress * progress;
    } else if (progress < 2 / 2.75) {
      return 7.5625 * (progress -= 1.5 / 2.75) * progress + 0.75;
    } else if (progress < 2.5 / 2.75) {
      return 7.5625 * (progress -= 2.25 / 2.75) * progress + 0.9375;
    } else {
      return 7.5625 * (progress -= 2.625 / 2.75) * progress + 0.984375;
    }
  }

  static getCurveFunction(curve: TransitionCurve, controlPoints?: [number, number][]): EmotionCurveFunction {
    const curveMap: Record<TransitionCurve, EmotionCurveFunction> = {
      linear: {
        type: 'linear',
        calculate: this.linear
      },
      'ease-in': {
        type: 'ease-in',
        calculate: this.easeIn
      },
      'ease-out': {
        type: 'ease-out',
        calculate: this.easeOut
      },
      'ease-in-out': {
        type: 'ease-in-out',
        calculate: this.easeInOut
      },
      bezier: {
        type: 'bezier',
        calculate: (progress: number) => this.bezier(progress, controlPoints),
        controlPoints
      }
    };

    return curveMap[curve];
  }

  /**
   * Generate emotion intensity interpolation between two values
   */
  static interpolateEmotionIntensity(
    fromIntensity: number,
    toIntensity: number,
    progress: number,
    curve: TransitionCurve = 'ease-in-out',
    controlPoints?: [number, number][]
  ): number {
    const curveFunction = this.getCurveFunction(curve, controlPoints);
    const easedProgress = curveFunction.calculate(progress);
    
    return fromIntensity + (toIntensity - fromIntensity) * easedProgress;
  }

  /**
   * Create a natural emotion transition curve that mimics human speech patterns
   */
  static naturalEmotionCurve(progress: number, emotionType: string): number {
    // Different emotions have different natural transition patterns
    switch (emotionType) {
      case 'happy':
      case 'excited':
        // Quick rise, gradual plateau
        return progress < 0.3 ? this.easeIn(progress / 0.3) : 1;
        
      case 'sad':
      case 'calm':
        // Gradual, smooth transition
        return this.easeInOut(progress);
        
      case 'angry':
      case 'fearful':
        // Sharp rise, then stabilize
        return progress < 0.2 ? this.easeIn(progress / 0.2) * 0.8 : 0.8 + (progress - 0.2) * 0.25;
        
      case 'surprised':
        // Instant spike, then settle
        return progress < 0.1 ? 1 : 1 - (progress - 0.1) * 0.3;
        
      default:
        return this.easeInOut(progress);
    }
  }

  /**
   * Smooth transition between multiple emotion keyframes
   */
  static smoothMultiTransition(
    emotions: { time: number; intensity: number }[],
    currentTime: number,
    totalDuration: number
  ): number {
    if (emotions.length === 0) return 0;
    if (emotions.length === 1) return emotions[0].intensity;

    // Find the two keyframes we're between
    let beforeIdx = 0;
    let afterIdx = 1;

    for (let i = 0; i < emotions.length - 1; i++) {
      if (currentTime >= emotions[i].time && currentTime <= emotions[i + 1].time) {
        beforeIdx = i;
        afterIdx = i + 1;
        break;
      }
    }

    const before = emotions[beforeIdx];
    const after = emotions[afterIdx];
    
    if (!before || !after) {
      return emotions[emotions.length - 1].intensity;
    }

    const segmentDuration = after.time - before.time;
    const progress = segmentDuration > 0 ? (currentTime - before.time) / segmentDuration : 0;
    
    return this.interpolateEmotionIntensity(before.intensity, after.intensity, progress);
  }
}