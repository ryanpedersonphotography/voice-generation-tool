import {
  VideoTimeline,
  SubtitleTrack,
  SubtitleEntry,
  TimelineParseConfig,
  VideoScene,
  SceneContext
} from '../../interfaces/video.interface.js';
import * as fs from 'fs/promises';

/**
 * Subtitle file reader for SRT, VTT, ASS, and SSA formats
 */
export class SubtitleReader {
  /**
   * Parse subtitle file into timeline format
   */
  async parse(filePath: string, config: TimelineParseConfig): Promise<VideoTimeline> {
    const content = await fs.readFile(filePath, 'utf-8');
    const format = this.detectSubtitleFormat(content);
    
    let subtitleTrack: SubtitleTrack;
    
    switch (format) {
      case 'srt':
        subtitleTrack = this.parseSRT(content);
        break;
      case 'vtt':
        subtitleTrack = this.parseVTT(content);
        break;
      default:
        throw new Error(`Unsupported subtitle format: ${format}`);
    }

    return this.convertToTimeline(subtitleTrack, filePath);
  }

  /**
   * Detect subtitle format from content
   */
  private detectSubtitleFormat(content: string): 'srt' | 'vtt' | 'ass' | 'ssa' {
    if (content.startsWith('WEBVTT')) {
      return 'vtt';
    }
    
    if (content.includes('[Script Info]') || content.includes('[Events]')) {
      return 'ass';
    }
    
    // Default to SRT if numbered entries are found
    if (/^\d+\s*$/m.test(content)) {
      return 'srt';
    }
    
    return 'srt'; // Default fallback
  }

  /**
   * Parse SRT subtitle format
   */
  private parseSRT(content: string): SubtitleTrack {
    const entries: SubtitleEntry[] = [];
    const blocks = content.split(/\n\s*\n/).filter(block => block.trim());

    for (const block of blocks) {
      const lines = block.split('\n').map(line => line.trim());
      
      if (lines.length < 3) continue;

      const index = parseInt(lines[0], 10);
      if (isNaN(index)) continue;

      const timeLine = lines[1];
      const textLines = lines.slice(2);

      const timeMatch = timeLine.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
      if (!timeMatch) continue;

      const startTime = this.parseTimeToSeconds(
        parseInt(timeMatch[1]), parseInt(timeMatch[2]), 
        parseInt(timeMatch[3]), parseInt(timeMatch[4])
      );
      
      const endTime = this.parseTimeToSeconds(
        parseInt(timeMatch[5]), parseInt(timeMatch[6]), 
        parseInt(timeMatch[7]), parseInt(timeMatch[8])
      );

      const text = textLines.join('\n');
      const { cleanText, speaker, emotion } = this.parseTextAnnotations(text);

      entries.push({
        index,
        startTime,
        endTime,
        startTimecode: this.secondsToTimecode(startTime),
        endTimecode: this.secondsToTimecode(endTime),
        text: cleanText,
        speaker,
        emotion
      });
    }

    return {
      id: 'subtitle_track',
      language: 'en',
      format: 'srt',
      entries,
      metadata: {
        language: 'en',
        encoding: 'utf-8',
        frameRate: 25,
        totalEntries: entries.length
      }
    };
  }

  /**
   * Parse VTT subtitle format
   */
  private parseVTT(content: string): SubtitleTrack {
    const entries: SubtitleEntry[] = [];
    const lines = content.split('\n');
    
    let index = 0;
    let inCue = false;
    let cueText: string[] = [];
    let startTime = 0;
    let endTime = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip WEBVTT header and empty lines
      if (line === 'WEBVTT' || line === '') {
        continue;
      }

      // Check for time cue
      const timeMatch = line.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
      if (timeMatch) {
        // Save previous cue if exists
        if (inCue && cueText.length > 0) {
          const text = cueText.join('\n');
          const { cleanText, speaker, emotion } = this.parseTextAnnotations(text);
          
          entries.push({
            index: index++,
            startTime,
            endTime,
            startTimecode: this.secondsToTimecode(startTime),
            endTimecode: this.secondsToTimecode(endTime),
            text: cleanText,
            speaker,
            emotion
          });
        }

        // Start new cue
        startTime = this.parseTimeToSeconds(
          parseInt(timeMatch[1]), parseInt(timeMatch[2]), 
          parseInt(timeMatch[3]), parseInt(timeMatch[4])
        );
        
        endTime = this.parseTimeToSeconds(
          parseInt(timeMatch[5]), parseInt(timeMatch[6]), 
          parseInt(timeMatch[7]), parseInt(timeMatch[8])
        );

        inCue = true;
        cueText = [];
      } else if (inCue) {
        // Collect cue text
        if (line) {
          cueText.push(line);
        } else {
          // End of cue
          inCue = false;
        }
      }
    }

    // Handle last cue
    if (inCue && cueText.length > 0) {
      const text = cueText.join('\n');
      const { cleanText, speaker, emotion } = this.parseTextAnnotations(text);
      
      entries.push({
        index: index++,
        startTime,
        endTime,
        startTimecode: this.secondsToTimecode(startTime),
        endTimecode: this.secondsToTimecode(endTime),
        text: cleanText,
        speaker,
        emotion
      });
    }

    return {
      id: 'subtitle_track',
      language: 'en',
      format: 'vtt',
      entries,
      metadata: {
        language: 'en',
        encoding: 'utf-8',
        frameRate: 25,
        totalEntries: entries.length
      }
    };
  }

  /**
   * Parse time components to seconds
   */
  private parseTimeToSeconds(hours: number, minutes: number, seconds: number, milliseconds: number): number {
    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
  }

  /**
   * Convert seconds to timecode string
   */
  private secondsToTimecode(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 25); // Assuming 25fps

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  }

  /**
   * Parse text for speaker annotations and emotions
   */
  private parseTextAnnotations(text: string): {
    cleanText: string;
    speaker?: string;
    emotion?: any;
  } {
    let cleanText = text;
    let speaker: string | undefined;
    let emotion: any | undefined;

    // Extract speaker from format "SPEAKER: text"
    const speakerMatch = text.match(/^([A-Z][^:]*?):\s*(.+)/s);
    if (speakerMatch) {
      speaker = speakerMatch[1].trim();
      cleanText = speakerMatch[2].trim();
    }

    // Extract emotion annotations like [happy], [sad], [excited]
    const emotionMatch = cleanText.match(/\[([a-z]+)\]/i);
    if (emotionMatch) {
      const emotionType = emotionMatch[1].toLowerCase();
      emotion = {
        primary: emotionType,
        intensity: 0.7,
        confidence: 0.8
      };
      cleanText = cleanText.replace(/\[[a-z]+\]/gi, '').trim();
    }

    // Remove other formatting tags
    cleanText = cleanText
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\{[^}]*\}/g, '') // Remove styling tags
      .trim();

    return { cleanText, speaker, emotion };
  }

  /**
   * Convert subtitle track to timeline format
   */
  private convertToTimeline(subtitleTrack: SubtitleTrack, filePath: string): VideoTimeline {
    const scenes: VideoScene[] = [];
    
    // Convert each subtitle entry to a scene
    subtitleTrack.entries.forEach((entry, index) => {
      const scene: VideoScene = {
        id: `subtitle_scene_${entry.index}`,
        name: `Subtitle ${entry.index}`,
        startTime: entry.startTime,
        endTime: entry.endTime,
        startTimecode: entry.startTimecode,
        endTimecode: entry.endTimecode,
        description: entry.text.substring(0, 50) + (entry.text.length > 50 ? '...' : ''),
        context: this.inferSceneContext(entry.text),
        voiceRequirements: [{
          startTime: entry.startTime,
          endTime: entry.endTime,
          text: entry.text,
          speaker: entry.speaker,
          emotionProfile: entry.emotion,
          priority: 'high'
        }],
        transitions: []
      };

      scenes.push(scene);
    });

    // Calculate total duration
    const totalDuration = subtitleTrack.entries.length > 0 
      ? Math.max(...subtitleTrack.entries.map(e => e.endTime))
      : 0;

    return {
      id: `subtitle_timeline_${Date.now()}`,
      name: `Subtitle Timeline from ${filePath}`,
      duration: totalDuration,
      framerate: 25,
      timecode: {
        dropFrame: false,
        startTimecode: '00:00:00:00',
        frameRate: 25
      },
      resolution: {
        width: 1920,
        height: 1080,
        aspectRatio: '16:9',
        pixelAspectRatio: 1.0,
        colorSpace: 'Rec.709'
      },
      scenes,
      markers: [],
      audioTracks: [],
      metadata: {
        title: `Subtitle Timeline`,
        software: 'Voice Generation Tool',
        createdDate: new Date()
      },
      format: subtitleTrack.format as any
    };
  }

  /**
   * Infer scene context from subtitle text
   */
  private inferSceneContext(text: string): SceneContext {
    const lowerText = text.toLowerCase();
    
    // Simple mood detection based on keywords
    let mood: SceneContext['mood'] = 'documentary'; // default
    
    if (lowerText.includes('action') || lowerText.includes('fight') || lowerText.includes('run')) {
      mood = 'action';
    } else if (lowerText.includes('funny') || lowerText.includes('laugh') || lowerText.includes('joke')) {
      mood = 'comedic';
    } else if (lowerText.includes('love') || lowerText.includes('kiss') || lowerText.includes('romantic')) {
      mood = 'romantic';
    } else if (lowerText.includes('learn') || lowerText.includes('teach') || lowerText.includes('explain')) {
      mood = 'educational';
    } else if (lowerText.includes('drama') || lowerText.includes('serious') || lowerText.includes('intense')) {
      mood = 'dramatic';
    }

    return {
      mood,
      environment: 'indoor', // default assumption
      timeOfDay: 'afternoon', // default assumption
      characterCount: 1, // assume single speaker unless detected otherwise
      proximityToCamera: 'medium',
      backgroundNoise: 0.1,
      emotionalIntensity: 0.5,
      pacing: 'medium'
    };
  }

  /**
   * Export timeline back to subtitle format
   */
  async exportToSubtitle(
    timeline: VideoTimeline, 
    format: 'srt' | 'vtt',
    outputPath: string
  ): Promise<void> {
    let content = '';

    if (format === 'srt') {
      content = this.generateSRT(timeline);
    } else if (format === 'vtt') {
      content = this.generateVTT(timeline);
    }

    await fs.writeFile(outputPath, content, 'utf-8');
  }

  /**
   * Generate SRT format from timeline
   */
  private generateSRT(timeline: VideoTimeline): string {
    const lines: string[] = [];

    timeline.scenes.forEach((scene, index) => {
      const voiceReq = scene.voiceRequirements[0];
      if (!voiceReq) return;

      lines.push((index + 1).toString());
      
      const startTime = this.secondsToSRTTime(scene.startTime);
      const endTime = this.secondsToSRTTime(scene.endTime);
      lines.push(`${startTime} --> ${endTime}`);
      
      let text = voiceReq.text;
      if (voiceReq.speaker) {
        text = `${voiceReq.speaker}: ${text}`;
      }
      
      lines.push(text);
      lines.push(''); // Empty line between entries
    });

    return lines.join('\n');
  }

  /**
   * Generate VTT format from timeline
   */
  private generateVTT(timeline: VideoTimeline): string {
    const lines: string[] = ['WEBVTT', ''];

    timeline.scenes.forEach((scene) => {
      const voiceReq = scene.voiceRequirements[0];
      if (!voiceReq) return;

      const startTime = this.secondsToVTTTime(scene.startTime);
      const endTime = this.secondsToVTTTime(scene.endTime);
      lines.push(`${startTime} --> ${endTime}`);
      
      let text = voiceReq.text;
      if (voiceReq.speaker) {
        text = `${voiceReq.speaker}: ${text}`;
      }
      
      lines.push(text);
      lines.push(''); // Empty line between entries
    });

    return lines.join('\n');
  }

  /**
   * Convert seconds to SRT time format (HH:MM:SS,mmm)
   */
  private secondsToSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
  }

  /**
   * Convert seconds to VTT time format (HH:MM:SS.mmm)
   */
  private secondsToVTTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }
}

export default SubtitleReader;