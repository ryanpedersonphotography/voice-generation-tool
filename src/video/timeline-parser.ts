import {
  VideoTimeline,
  TimelineFormat,
  TimelineParseConfig,
  TimelineParseResult,
  ParseWarning,
  ParseStatistics,
  VideoScene,
  TimelineMarker,
  VideoAudioTrack
} from '../interfaces/video.interface.js';
import { PremiereReader } from './format-readers/premiere-reader.js';
import { DaVinciReader } from './format-readers/davinci-reader.js';
import { FCPXReader } from './format-readers/fcpx-reader.js';
import { SubtitleReader } from './format-readers/subtitle-reader.js';
import { JSONReader } from './format-readers/json-reader.js';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Main timeline parser that handles multiple video editing formats
 */
export class TimelineParser {
  private readers: Map<TimelineFormat, any> = new Map();
  private warnings: ParseWarning[] = [];

  constructor() {
    this.initializeReaders();
  }

  /**
   * Initialize format-specific readers
   */
  private initializeReaders(): void {
    this.readers.set('premiere', new PremiereReader());
    this.readers.set('davinci', new DaVinciReader());
    this.readers.set('fcpx', new FCPXReader());
    this.readers.set('srt', new SubtitleReader());
    this.readers.set('vtt', new SubtitleReader());
    this.readers.set('json', new JSONReader());
  }

  /**
   * Parse timeline from file
   */
  async parseTimeline(
    filePath: string,
    config?: Partial<TimelineParseConfig>
  ): Promise<TimelineParseResult> {
    const startTime = Date.now();
    this.warnings = [];

    try {
      // Detect format from file extension
      const format = this.detectFormat(filePath);
      
      // Merge with default config
      const parseConfig: TimelineParseConfig = {
        format,
        extractAudio: true,
        extractMarkers: true,
        extractMetadata: true,
        validateTimecode: true,
        mergeOverlappingScenes: false,
        minimumSceneDuration: 0.1,
        ...config
      };

      // Get file stats
      const fileStats = await fs.stat(filePath);
      
      // Get appropriate reader
      const reader = this.readers.get(format);
      if (!reader) {
        throw new Error(`Unsupported timeline format: ${format}`);
      }

      // Parse the timeline
      const timeline = await reader.parse(filePath, parseConfig);
      
      // Post-process timeline
      await this.postProcessTimeline(timeline, parseConfig);
      
      // Validate timeline
      this.validateTimeline(timeline, parseConfig);

      const parseTime = Date.now() - startTime;

      return {
        timeline,
        warnings: this.warnings,
        statistics: {
          totalScenes: timeline.scenes.length,
          totalMarkers: timeline.markers.length,
          totalAudioTracks: timeline.audioTracks.length,
          parseTime,
          fileSize: fileStats.size
        },
        success: true
      };

    } catch (error) {
      const parseTime = Date.now() - startTime;
      
      return {
        timeline: this.createEmptyTimeline(),
        warnings: this.warnings,
        statistics: {
          totalScenes: 0,
          totalMarkers: 0,
          totalAudioTracks: 0,
          parseTime,
          fileSize: 0
        },
        success: false
      };
    }
  }

  /**
   * Detect timeline format from file extension
   */
  private detectFormat(filePath: string): TimelineFormat {
    const ext = path.extname(filePath).toLowerCase();
    
    switch (ext) {
      case '.xml':
        // Need to examine content to distinguish between formats
        return this.detectXMLFormat(filePath);
      case '.fcpxml':
        return 'fcpx';
      case '.prproj':
        return 'premiere';
      case '.drp':
        return 'davinci';
      case '.srt':
        return 'srt';
      case '.vtt':
        return 'vtt';
      case '.json':
        return 'json';
      default:
        throw new Error(`Unknown file format: ${ext}`);
    }
  }

  /**
   * Detect XML format by examining content
   */
  private detectXMLFormat(filePath: string): TimelineFormat {
    // For now, return premiere as default
    // In a real implementation, we'd read the XML and check root elements
    return 'premiere';
  }

  /**
   * Post-process timeline after parsing
   */
  private async postProcessTimeline(
    timeline: VideoTimeline,
    config: TimelineParseConfig
  ): Promise<void> {
    // Merge overlapping scenes if requested
    if (config.mergeOverlappingScenes) {
      this.mergeOverlappingScenes(timeline);
    }

    // Filter out scenes that are too short
    timeline.scenes = timeline.scenes.filter(scene => {
      const duration = scene.endTime - scene.startTime;
      if (duration < config.minimumSceneDuration) {
        this.addWarning('scene_overlap', 
          `Scene ${scene.id} duration (${duration}s) below minimum (${config.minimumSceneDuration}s)`);
        return false;
      }
      return true;
    });

    // Sort scenes by start time
    timeline.scenes.sort((a, b) => a.startTime - b.startTime);
    
    // Sort markers by time
    timeline.markers.sort((a, b) => a.time - b.time);

    // Generate scene IDs if missing
    timeline.scenes.forEach((scene, index) => {
      if (!scene.id) {
        scene.id = `scene_${index + 1}`;
      }
    });
  }

  /**
   * Merge overlapping scenes
   */
  private mergeOverlappingScenes(timeline: VideoTimeline): void {
    const mergedScenes: VideoScene[] = [];
    let currentScene: VideoScene | null = null;

    for (const scene of timeline.scenes) {
      if (!currentScene) {
        currentScene = { ...scene };
        continue;
      }

      // Check for overlap
      if (scene.startTime <= currentScene.endTime) {
        // Merge scenes
        currentScene.endTime = Math.max(currentScene.endTime, scene.endTime);
        currentScene.endTimecode = scene.endTimecode;
        
        // Merge voice requirements
        currentScene.voiceRequirements.push(...scene.voiceRequirements);
        
        this.addWarning('scene_overlap', 
          `Merged overlapping scenes ${currentScene.id} and ${scene.id}`);
      } else {
        // No overlap, save current and start new
        mergedScenes.push(currentScene);
        currentScene = { ...scene };
      }
    }

    if (currentScene) {
      mergedScenes.push(currentScene);
    }

    timeline.scenes = mergedScenes;
  }

  /**
   * Validate timeline structure
   */
  private validateTimeline(timeline: VideoTimeline, config: TimelineParseConfig): void {
    // Validate basic structure
    if (!timeline.id) {
      this.addWarning('invalid_marker', 'Timeline missing ID');
    }

    if (timeline.duration <= 0) {
      this.addWarning('invalid_marker', 'Timeline has invalid duration');
    }

    if (timeline.framerate <= 0) {
      this.addWarning('invalid_marker', 'Timeline has invalid framerate');
    }

    // Validate timecode if requested
    if (config.validateTimecode) {
      this.validateTimecodes(timeline);
    }

    // Validate scenes
    this.validateScenes(timeline);
    
    // Validate markers
    this.validateMarkers(timeline);
  }

  /**
   * Validate timecode consistency
   */
  private validateTimecodes(timeline: VideoTimeline): void {
    // Check if timecode settings are consistent
    if (timeline.timecode.frameRate !== timeline.framerate) {
      this.addWarning('timecode_mismatch', 
        `Timecode framerate (${timeline.timecode.frameRate}) differs from timeline framerate (${timeline.framerate})`);
    }

    // Validate scene timecodes
    timeline.scenes.forEach(scene => {
      const startSeconds = this.timecodeToSeconds(scene.startTimecode, timeline.framerate);
      const endSeconds = this.timecodeToSeconds(scene.endTimecode, timeline.framerate);

      if (Math.abs(startSeconds - scene.startTime) > 0.1) {
        this.addWarning('timecode_mismatch', 
          `Scene ${scene.id} start time mismatch: ${scene.startTime}s vs ${startSeconds}s`);
      }

      if (Math.abs(endSeconds - scene.endTime) > 0.1) {
        this.addWarning('timecode_mismatch', 
          `Scene ${scene.id} end time mismatch: ${scene.endTime}s vs ${endSeconds}s`);
      }
    });
  }

  /**
   * Validate scene structure
   */
  private validateScenes(timeline: VideoTimeline): void {
    timeline.scenes.forEach(scene => {
      if (scene.startTime >= scene.endTime) {
        this.addWarning('scene_overlap', 
          `Scene ${scene.id} has invalid time range: ${scene.startTime}s to ${scene.endTime}s`);
      }

      if (scene.startTime < 0 || scene.endTime > timeline.duration) {
        this.addWarning('scene_overlap', 
          `Scene ${scene.id} extends beyond timeline boundaries`);
      }
    });
  }

  /**
   * Validate marker structure
   */
  private validateMarkers(timeline: VideoTimeline): void {
    timeline.markers.forEach(marker => {
      if (marker.time < 0 || marker.time > timeline.duration) {
        this.addWarning('invalid_marker', 
          `Marker ${marker.id} at ${marker.time}s is outside timeline duration`);
      }
    });
  }

  /**
   * Convert timecode string to seconds
   */
  private timecodeToSeconds(timecode: string, framerate: number): number {
    const parts = timecode.split(':');
    if (parts.length !== 4) {
      throw new Error(`Invalid timecode format: ${timecode}`);
    }

    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseInt(parts[2], 10);
    const frames = parseInt(parts[3], 10);

    return hours * 3600 + minutes * 60 + seconds + frames / framerate;
  }

  /**
   * Convert seconds to timecode string
   */
  secondsToTimecode(seconds: number, framerate: number, dropFrame: boolean = false): string {
    const totalFrames = Math.round(seconds * framerate);
    
    let hours = Math.floor(totalFrames / (framerate * 3600));
    let remainder = totalFrames % (framerate * 3600);
    
    let minutes = Math.floor(remainder / (framerate * 60));
    remainder = remainder % (framerate * 60);
    
    let secs = Math.floor(remainder / framerate);
    let frames = remainder % framerate;

    // Handle drop frame timecode for NTSC
    if (dropFrame && (framerate === 29.97 || framerate === 59.94)) {
      // Simplified drop frame calculation
      // In real implementation, need proper drop frame algorithm
    }

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${Math.floor(frames).toString().padStart(2, '0')}`;
  }

  /**
   * Add warning to the warnings list
   */
  private addWarning(type: ParseWarning['type'], message: string): void {
    this.warnings.push({ type, message });
  }

  /**
   * Create empty timeline for error cases
   */
  private createEmptyTimeline(): VideoTimeline {
    return {
      id: 'empty_timeline',
      name: 'Empty Timeline',
      duration: 0,
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
      scenes: [],
      markers: [],
      audioTracks: [],
      metadata: {},
      format: 'json'
    };
  }

  /**
   * Get supported formats
   */
  getSupportedFormats(): TimelineFormat[] {
    return Array.from(this.readers.keys());
  }

  /**
   * Validate timeline file without parsing
   */
  async validateFile(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) return false;

      const format = this.detectFormat(filePath);
      return this.readers.has(format);
    } catch {
      return false;
    }
  }

  /**
   * Get timeline metadata without full parsing
   */
  async getTimelineInfo(filePath: string): Promise<{
    format: TimelineFormat;
    fileSize: number;
    canParse: boolean;
  }> {
    const stats = await fs.stat(filePath);
    const format = this.detectFormat(filePath);
    const canParse = this.readers.has(format);

    return {
      format,
      fileSize: stats.size,
      canParse
    };
  }
}

export default TimelineParser;