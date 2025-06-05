import {
  VideoTimeline,
  TimelineParseConfig
} from '../../interfaces/video.interface.js';
import * as fs from 'fs/promises';

/**
 * JSON timeline format reader
 * For custom timeline format in JSON
 */
export class JSONReader {
  /**
   * Parse JSON timeline file
   */
  async parse(filePath: string, config: TimelineParseConfig): Promise<VideoTimeline> {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    // Validate that this is a timeline JSON
    if (!data.timeline && !data.duration && !data.scenes) {
      throw new Error('Invalid timeline JSON format');
    }
    
    // If it's wrapped in a timeline property, unwrap it
    const timeline = data.timeline || data;
    
    // Ensure required properties exist
    if (!timeline.id) {
      timeline.id = `json_timeline_${Date.now()}`;
    }
    
    if (!timeline.name) {
      timeline.name = 'JSON Timeline';
    }
    
    if (!timeline.scenes) {
      timeline.scenes = [];
    }
    
    if (!timeline.markers) {
      timeline.markers = [];
    }
    
    if (!timeline.audioTracks) {
      timeline.audioTracks = [];
    }
    
    if (!timeline.metadata) {
      timeline.metadata = {};
    }
    
    // Set default values for missing properties
    timeline.format = 'json';
    timeline.framerate = timeline.framerate || 25;
    timeline.duration = timeline.duration || 0;
    
    if (!timeline.timecode) {
      timeline.timecode = {
        dropFrame: false,
        startTimecode: '00:00:00:00',
        frameRate: timeline.framerate
      };
    }
    
    if (!timeline.resolution) {
      timeline.resolution = {
        width: 1920,
        height: 1080,
        aspectRatio: '16:9',
        pixelAspectRatio: 1.0,
        colorSpace: 'Rec.709'
      };
    }
    
    return timeline as VideoTimeline;
  }
}

export default JSONReader;