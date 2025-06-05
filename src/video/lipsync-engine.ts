import {
  LipMovement,
  LipSyncMarker,
  SynchronizedAudioSegment,
  MouthShape,
  SyncQualityMetrics
} from '../interfaces/video.interface.js';
import { AudioSegment } from '../interfaces/conversation.interface.js';

/**
 * Advanced lip-sync timing optimization engine
 * Analyzes video and audio to create natural lip synchronization
 */
export class LipSyncEngine {
  private phonemeToMouthMap: Map<string, MouthShape>;
  private wordToPhonemeCache: Map<string, string[]>;

  constructor() {
    this.phonemeToMouthMap = this.initializePhonemeMapping();
    this.wordToPhonemeCache = new Map();
  }

  /**
   * Initialize phoneme to mouth shape mapping
   */
  private initializePhonemeMapping(): Map<string, MouthShape> {
    const mapping = new Map<string, MouthShape>();
    
    // Vowels
    mapping.set('a', 'A').set('ɑ', 'A').set('æ', 'A');
    mapping.set('e', 'E').set('ɛ', 'E').set('eɪ', 'E');
    mapping.set('i', 'I').set('ɪ', 'I').set('iː', 'I');
    mapping.set('o', 'O').set('ɔ', 'O').set('oʊ', 'O');
    mapping.set('u', 'U').set('ʊ', 'U').set('uː', 'U');
    
    // Bilabials (lips together)
    mapping.set('m', 'M').set('b', 'B').set('p', 'P');
    
    // Labiodentals (lip to teeth)
    mapping.set('f', 'F').set('v', 'V');
    
    // Default closed mouth for consonants
    mapping.set('t', 'Closed').set('d', 'Closed').set('n', 'Closed');
    mapping.set('s', 'Closed').set('z', 'Closed').set('l', 'Closed');
    mapping.set('r', 'Closed').set('k', 'Closed').set('g', 'Closed');
    mapping.set('h', 'Closed').set('w', 'Closed').set('j', 'Closed');
    
    return mapping;
  }

  /**
   * Analyze video for lip movements (placeholder implementation)
   * In a real implementation, this would use computer vision
   */
  async analyzeVideoLips(videoFile: string, startTime: number, endTime: number): Promise<LipMovement[]> {
    console.log(`🎬 Analyzing lip movements in ${videoFile} from ${startTime}s to ${endTime}s`);
    
    // Placeholder implementation - would use OpenCV or similar
    const movements: LipMovement[] = [];
    const duration = endTime - startTime;
    const frameRate = 24; // Assume 24fps
    const totalFrames = Math.floor(duration * frameRate);
    
    // Generate synthetic lip movements for demonstration
    for (let frame = 0; frame < totalFrames; frame += 4) { // Every 4th frame
      const time = startTime + (frame / frameRate);
      const intensity = Math.sin((frame / totalFrames) * Math.PI * 4) * 0.5 + 0.5; // Sine wave pattern
      
      movements.push({
        startTime: time,
        endTime: time + (4 / frameRate),
        intensity,
        confidence: 0.7 + Math.random() * 0.2 // Random confidence between 0.7-0.9
      });
    }
    
    return movements;
  }

  /**
   * Optimize audio timing for lip synchronization
   */
  optimizeAudioTiming(
    audioSegments: SynchronizedAudioSegment[],
    lipMovements: LipMovement[]
  ): SynchronizedAudioSegment[] {
    console.log(`🎵 Optimizing timing for ${audioSegments.length} audio segments with ${lipMovements.length} lip movements`);
    
    const optimizedSegments = audioSegments.map(segment => {
      const segmentMovements = this.getMovementsForSegment(segment, lipMovements);
      const optimizedSegment = this.adjustSegmentTiming(segment, segmentMovements);
      
      return optimizedSegment;
    });
    
    return optimizedSegments;
  }

  /**
   * Generate lip sync markers from audio segments
   */
  generateLipSyncMarkers(audioSegments: SynchronizedAudioSegment[]): LipSyncMarker[] {
    const markers: LipSyncMarker[] = [];
    
    for (const segment of audioSegments) {
      const segmentMarkers = this.generateMarkersForSegment(segment);
      markers.push(...segmentMarkers);
    }
    
    // Sort markers by time
    markers.sort((a, b) => a.time - b.time);
    
    return markers;
  }

  /**
   * Generate lip sync markers for a single audio segment
   */
  private generateMarkersForSegment(segment: SynchronizedAudioSegment): LipSyncMarker[] {
    const markers: LipSyncMarker[] = [];
    const words = this.tokenizeText(segment.text);
    const duration = segment.endTime - segment.startTime;
    
    let currentTime = segment.startTime;
    
    for (const word of words) {
      const phonemes = this.getPhonemes(word);
      const wordDuration = this.estimateWordDuration(word, duration / words.length);
      const phonemeDuration = wordDuration / phonemes.length;
      
      for (const phoneme of phonemes) {
        const mouthShape = this.phonemeToMouthMap.get(phoneme) || 'Closed';
        const intensity = this.calculatePhonemeIntensity(phoneme);
        
        markers.push({
          time: currentTime,
          phoneme,
          mouthShape,
          duration: phonemeDuration,
          intensity,
          confidence: 0.8 // Default confidence
        });
        
        currentTime += phonemeDuration;
      }
      
      // Add small pause between words
      currentTime += 0.05; // 50ms pause
    }
    
    return markers;
  }

  /**
   * Tokenize text into words
   */
  private tokenizeText(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  /**
   * Get phonemes for a word (simplified phoneme generation)
   */
  private getPhonemes(word: string): string[] {
    // Check cache first
    if (this.wordToPhonemeCache.has(word)) {
      return this.wordToPhonemeCache.get(word)!;
    }
    
    // Simplified phoneme generation based on spelling
    const phonemes: string[] = [];
    const chars = word.split('');
    
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      const nextChar = chars[i + 1];
      
      // Handle common letter combinations
      if (char === 't' && nextChar === 'h') {
        phonemes.push('θ'); // th sound
        i++; // Skip next character
      } else if (char === 'c' && nextChar === 'h') {
        phonemes.push('tʃ'); // ch sound
        i++;
      } else if (char === 's' && nextChar === 'h') {
        phonemes.push('ʃ'); // sh sound
        i++;
      } else if (this.isVowel(char)) {
        // Simple vowel mapping
        phonemes.push(this.mapVowel(char));
      } else if (this.isConsonant(char)) {
        phonemes.push(char);
      }
    }
    
    // Cache the result
    this.wordToPhonemeCache.set(word, phonemes);
    
    return phonemes;
  }

  /**
   * Check if character is a vowel
   */
  private isVowel(char: string): boolean {
    return 'aeiou'.includes(char);
  }

  /**
   * Check if character is a consonant
   */
  private isConsonant(char: string): boolean {
    return /[bcdfghjklmnpqrstvwxyz]/.test(char);
  }

  /**
   * Map simple vowel to phoneme
   */
  private mapVowel(vowel: string): string {
    const mapping: Record<string, string> = {
      'a': 'æ',
      'e': 'e',
      'i': 'ɪ',
      'o': 'ɔ',
      'u': 'ʊ'
    };
    
    return mapping[vowel] || vowel;
  }

  /**
   * Estimate duration for a word based on complexity
   */
  private estimateWordDuration(word: string, averageDuration: number): number {
    // Adjust duration based on word length and complexity
    const baseLength = 5; // Average word length
    const lengthFactor = word.length / baseLength;
    
    // Longer words get more time, but with diminishing returns
    const adjustedDuration = averageDuration * Math.sqrt(lengthFactor);
    
    // Ensure minimum and maximum durations
    return Math.max(0.1, Math.min(1.0, adjustedDuration));
  }

  /**
   * Calculate intensity for a phoneme
   */
  private calculatePhonemeIntensity(phoneme: string): number {
    // Vowels generally have higher intensity
    if (this.isVowel(phoneme)) {
      return 0.7 + Math.random() * 0.2; // 0.7-0.9
    }
    
    // Bilabials (m, b, p) have medium intensity
    if (['m', 'b', 'p'].includes(phoneme)) {
      return 0.5 + Math.random() * 0.2; // 0.5-0.7
    }
    
    // Other consonants have lower intensity
    return 0.3 + Math.random() * 0.2; // 0.3-0.5
  }

  /**
   * Get lip movements that overlap with an audio segment
   */
  private getMovementsForSegment(
    segment: SynchronizedAudioSegment,
    movements: LipMovement[]
  ): LipMovement[] {
    return movements.filter(movement => 
      movement.startTime < segment.endTime && movement.endTime > segment.startTime
    );
  }

  /**
   * Adjust segment timing based on lip movements
   */
  private adjustSegmentTiming(
    segment: SynchronizedAudioSegment,
    movements: LipMovement[]
  ): SynchronizedAudioSegment {
    if (movements.length === 0) {
      return segment; // No movements to sync with
    }
    
    // Calculate average mouth opening during segment
    const avgIntensity = movements.reduce((sum, m) => sum + m.intensity, 0) / movements.length;
    
    // Adjust timing slightly based on mouth activity
    // More mouth activity = slightly slower speech
    const timingAdjustment = (avgIntensity - 0.5) * 0.1; // ±5% adjustment
    const newDuration = (segment.endTime - segment.startTime) * (1 + timingAdjustment);
    
    return {
      ...segment,
      endTime: segment.startTime + newDuration
    };
  }

  /**
   * Validate lip sync quality
   */
  validateLipSync(
    audioSegments: SynchronizedAudioSegment[],
    lipMovements: LipMovement[],
    markers: LipSyncMarker[]
  ): SyncQualityMetrics {
    console.log(`🔍 Validating lip sync quality for ${audioSegments.length} segments`);
    
    // Calculate timing accuracy
    const timingAccuracy = this.calculateTimingAccuracy(audioSegments, lipMovements);
    
    // Calculate lip sync quality based on marker confidence
    const lipSyncQuality = markers.length > 0 
      ? markers.reduce((sum, marker) => sum + marker.confidence, 0) / markers.length
      : 0.5;
    
    // Calculate naturalness based on mouth shape transitions
    const naturalness = this.calculateNaturalness(markers);
    
    // Overall score is weighted average
    const overallScore = (timingAccuracy * 0.4) + (lipSyncQuality * 0.4) + (naturalness * 0.2);
    
    // Identify potential issues
    const issues = this.identifyLipSyncIssues(audioSegments, lipMovements, markers);
    
    return {
      overallScore,
      timingAccuracy,
      lipSyncQuality,
      naturalness,
      issues
    };
  }

  /**
   * Calculate timing accuracy between audio and lip movements
   */
  private calculateTimingAccuracy(
    audioSegments: SynchronizedAudioSegment[],
    lipMovements: LipMovement[]
  ): number {
    if (lipMovements.length === 0) return 0.5;
    
    let totalError = 0;
    let comparisonCount = 0;
    
    for (const segment of audioSegments) {
      const overlappingMovements = this.getMovementsForSegment(segment, lipMovements);
      
      for (const movement of overlappingMovements) {
        // Calculate overlap percentage
        const overlapStart = Math.max(segment.startTime, movement.startTime);
        const overlapEnd = Math.min(segment.endTime, movement.endTime);
        const overlapDuration = Math.max(0, overlapEnd - overlapStart);
        
        const segmentDuration = segment.endTime - segment.startTime;
        const movementDuration = movement.endTime - movement.startTime;
        
        const expectedOverlap = Math.min(segmentDuration, movementDuration);
        const overlapRatio = overlapDuration / expectedOverlap;
        
        totalError += Math.abs(1 - overlapRatio);
        comparisonCount++;
      }
    }
    
    if (comparisonCount === 0) return 0.5;
    
    const avgError = totalError / comparisonCount;
    return Math.max(0, 1 - avgError);
  }

  /**
   * Calculate naturalness of mouth shape transitions
   */
  private calculateNaturalness(markers: LipSyncMarker[]): number {
    if (markers.length < 2) return 0.5;
    
    let naturalTransitions = 0;
    let totalTransitions = 0;
    
    for (let i = 1; i < markers.length; i++) {
      const prev = markers[i - 1];
      const curr = markers[i];
      
      // Check if transition is natural
      const isNatural = this.isNaturalTransition(prev.mouthShape, curr.mouthShape);
      
      if (isNatural) naturalTransitions++;
      totalTransitions++;
    }
    
    return totalTransitions > 0 ? naturalTransitions / totalTransitions : 0.5;
  }

  /**
   * Check if mouth shape transition is natural
   */
  private isNaturalTransition(from: MouthShape, to: MouthShape): boolean {
    // Define natural transitions between mouth shapes
    const naturalTransitions: Record<MouthShape, MouthShape[]> = {
      'A': ['E', 'O', 'Closed'],
      'E': ['A', 'I', 'Closed'],
      'I': ['E', 'Closed'],
      'O': ['A', 'U', 'Closed'],
      'U': ['O', 'Closed'],
      'M': ['A', 'E', 'I', 'O', 'U'],
      'B': ['A', 'E', 'I', 'O', 'U'],
      'P': ['A', 'E', 'I', 'O', 'U'],
      'F': ['A', 'E', 'I', 'O', 'U'],
      'V': ['A', 'E', 'I', 'O', 'U'],
      'Closed': ['A', 'E', 'I', 'O', 'U', 'M', 'B', 'P', 'F', 'V']
    };
    
    return naturalTransitions[from]?.includes(to) || false;
  }

  /**
   * Identify potential lip sync issues
   */
  private identifyLipSyncIssues(
    audioSegments: SynchronizedAudioSegment[],
    lipMovements: LipMovement[],
    markers: LipSyncMarker[]
  ) {
    const issues: any[] = [];
    
    // Check for segments with no corresponding lip movement
    for (const segment of audioSegments) {
      const overlappingMovements = this.getMovementsForSegment(segment, lipMovements);
      
      if (overlappingMovements.length === 0) {
        issues.push({
          type: 'lip_mismatch',
          severity: 'high',
          startTime: segment.startTime,
          endTime: segment.endTime,
          description: `No lip movement detected for audio segment: "${segment.text.substring(0, 30)}..."`,
          suggestions: [
            'Check video quality and lighting',
            'Verify speaker is visible in frame',
            'Consider manual timing adjustment'
          ]
        });
      }
    }
    
    // Check for low confidence markers
    const lowConfidenceMarkers = markers.filter(marker => marker.confidence < 0.5);
    if (lowConfidenceMarkers.length > markers.length * 0.2) { // More than 20% low confidence
      issues.push({
        type: 'timing_drift',
        severity: 'medium',
        startTime: 0,
        endTime: 0,
        description: `${lowConfidenceMarkers.length} markers have low confidence scores`,
        suggestions: [
          'Review phoneme detection accuracy',
          'Consider alternative voice processing settings',
          'Check audio quality and clarity'
        ]
      });
    }
    
    return issues;
  }

  /**
   * Export lip sync data to file
   */
  async exportLipSyncData(
    markers: LipSyncMarker[],
    outputPath: string,
    format: 'json' | 'csv' | 'xml' = 'json'
  ): Promise<void> {
    const fs = await import('fs/promises');
    
    switch (format) {
      case 'json':
        await fs.writeFile(outputPath, JSON.stringify(markers, null, 2));
        break;
      case 'csv':
        const csvContent = this.convertToCSV(markers);
        await fs.writeFile(outputPath, csvContent);
        break;
      case 'xml':
        const xmlContent = this.convertToXML(markers);
        await fs.writeFile(outputPath, xmlContent);
        break;
    }
    
    console.log(`📁 Exported ${markers.length} lip sync markers to ${outputPath}`);
  }

  /**
   * Convert markers to CSV format
   */
  private convertToCSV(markers: LipSyncMarker[]): string {
    const header = 'Time,Phoneme,MouthShape,Duration,Intensity,Confidence\n';
    const rows = markers.map(marker => 
      `${marker.time},${marker.phoneme},${marker.mouthShape},${marker.duration},${marker.intensity},${marker.confidence}`
    ).join('\n');
    
    return header + rows;
  }

  /**
   * Convert markers to XML format
   */
  private convertToXML(markers: LipSyncMarker[]): string {
    const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n<lipsync>\n';
    const xmlFooter = '</lipsync>';
    
    const xmlBody = markers.map(marker => 
      `  <marker time="${marker.time}" phoneme="${marker.phoneme}" mouth="${marker.mouthShape}" duration="${marker.duration}" intensity="${marker.intensity}" confidence="${marker.confidence}"/>`
    ).join('\n');
    
    return xmlHeader + xmlBody + '\n' + xmlFooter;
  }
}

export default LipSyncEngine;