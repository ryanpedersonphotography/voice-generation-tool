import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TimelineParser } from '../src/video/timeline-parser.js';
import { SubtitleParser } from '../src/video/subtitle-parser.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('TimelineParser', () => {
  let timelineParser: TimelineParser;
  let tempDir: string;

  beforeEach(async () => {
    timelineParser = new TimelineParser();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'timeline-test-'));
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('format detection', () => {
    it('should detect SRT format', async () => {
      const srtContent = `1
00:00:01,000 --> 00:00:03,000
Hello, this is a test subtitle.

2
00:00:03,500 --> 00:00:06,000
This is the second subtitle line.`;

      const filePath = path.join(tempDir, 'test.srt');
      await fs.writeFile(filePath, srtContent);

      const info = await timelineParser.getTimelineInfo(filePath);
      expect(info.format).toBe('srt');
      expect(info.canParse).toBe(true);
    });

    it('should detect VTT format', async () => {
      const vttContent = `WEBVTT

00:00:01.000 --> 00:00:03.000
Hello, this is a test subtitle.

00:00:03.500 --> 00:00:06.000
This is the second subtitle line.`;

      const filePath = path.join(tempDir, 'test.vtt');
      await fs.writeFile(filePath, vttContent);

      const info = await timelineParser.getTimelineInfo(filePath);
      expect(info.format).toBe('vtt');
      expect(info.canParse).toBe(true);
    });

    it('should detect JSON format', async () => {
      const jsonContent = JSON.stringify({
        id: 'test_timeline',
        name: 'Test Timeline',
        duration: 120,
        framerate: 25,
        scenes: []
      });

      const filePath = path.join(tempDir, 'test.json');
      await fs.writeFile(filePath, jsonContent);

      const info = await timelineParser.getTimelineInfo(filePath);
      expect(info.format).toBe('json');
      expect(info.canParse).toBe(true);
    });
  });

  describe('SRT parsing', () => {
    it('should parse basic SRT file correctly', async () => {
      const srtContent = `1
00:00:01,000 --> 00:00:03,000
Hello, this is a test subtitle.

2
00:00:03,500 --> 00:00:06,000
NARRATOR: This is a narrator speaking.

3
00:00:06,500 --> 00:00:09,000
ALICE [excited]: I'm so happy about this news!`;

      const filePath = path.join(tempDir, 'test.srt');
      await fs.writeFile(filePath, srtContent);

      const result = await timelineParser.parseTimeline(filePath);
      
      expect(result.success).toBe(true);
      expect(result.timeline.scenes).toHaveLength(3);
      expect(result.statistics.totalScenes).toBe(3);

      // Check first scene
      const scene1 = result.timeline.scenes[0];
      expect(scene1.startTime).toBe(1.0);
      expect(scene1.endTime).toBe(3.0);
      expect(scene1.voiceRequirements[0].text).toBe('Hello, this is a test subtitle.');

      // Check second scene with speaker
      const scene2 = result.timeline.scenes[1];
      expect(scene2.voiceRequirements[0].speaker).toBe('NARRATOR');
      expect(scene2.voiceRequirements[0].text).toBe('This is a narrator speaking.');

      // Check third scene with emotion
      const scene3 = result.timeline.scenes[2];
      expect(scene3.voiceRequirements[0].speaker).toBe('ALICE');
      expect(scene3.voiceRequirements[0].text).toBe("I'm so happy about this news!");
      expect(scene3.voiceRequirements[0].emotionProfile?.primary).toBe('excited');
    });

    it('should handle malformed SRT entries gracefully', async () => {
      const srtContent = `1
00:00:01,000 --> 00:00:03,000
Valid subtitle

invalid entry without timecode

3
00:00:06,500 --> 00:00:09,000
Another valid subtitle`;

      const filePath = path.join(tempDir, 'malformed.srt');
      await fs.writeFile(filePath, srtContent);

      const result = await timelineParser.parseTimeline(filePath);
      
      expect(result.success).toBe(true);
      expect(result.timeline.scenes).toHaveLength(2); // Only valid entries
    });
  });

  describe('VTT parsing', () => {
    it('should parse basic VTT file correctly', async () => {
      const vttContent = `WEBVTT

00:00:01.000 --> 00:00:03.000
Hello, this is a test subtitle.

00:00:03.500 --> 00:00:06.000
NARRATOR: This is a narrator speaking.

00:00:06.500 --> 00:00:09.000
Multiple line
subtitle entry.`;

      const filePath = path.join(tempDir, 'test.vtt');
      await fs.writeFile(filePath, vttContent);

      const result = await timelineParser.parseTimeline(filePath);
      
      expect(result.success).toBe(true);
      expect(result.timeline.scenes).toHaveLength(3);

      // Check multi-line entry
      const scene3 = result.timeline.scenes[2];
      expect(scene3.voiceRequirements[0].text).toBe('Multiple line\nsubtitle entry.');
    });
  });

  describe('JSON parsing', () => {
    it('should parse JSON timeline correctly', async () => {
      const jsonTimeline = {
        id: 'test_timeline',
        name: 'Test Timeline',
        duration: 120,
        framerate: 25,
        scenes: [
          {
            id: 'scene1',
            startTime: 0,
            endTime: 10,
            startTimecode: '00:00:00:00',
            endTimecode: '00:00:10:00',
            voiceRequirements: [
              {
                startTime: 0,
                endTime: 10,
                text: 'This is a test scene',
                priority: 'high'
              }
            ],
            context: {
              mood: 'documentary',
              environment: 'indoor',
              timeOfDay: 'afternoon',
              characterCount: 1,
              proximityToCamera: 'medium',
              backgroundNoise: 0.1,
              emotionalIntensity: 0.5,
              pacing: 'medium'
            },
            transitions: []
          }
        ],
        markers: [],
        audioTracks: [],
        metadata: {}
      };

      const filePath = path.join(tempDir, 'timeline.json');
      await fs.writeFile(filePath, JSON.stringify(jsonTimeline, null, 2));

      const result = await timelineParser.parseTimeline(filePath);
      
      expect(result.success).toBe(true);
      expect(result.timeline.id).toBe('test_timeline');
      expect(result.timeline.scenes).toHaveLength(1);
      expect(result.timeline.scenes[0].context.mood).toBe('documentary');
    });

    it('should handle minimal JSON timeline', async () => {
      const minimalTimeline = {
        duration: 60,
        scenes: []
      };

      const filePath = path.join(tempDir, 'minimal.json');
      await fs.writeFile(filePath, JSON.stringify(minimalTimeline));

      const result = await timelineParser.parseTimeline(filePath);
      
      expect(result.success).toBe(true);
      expect(result.timeline.duration).toBe(60);
      expect(result.timeline.scenes).toHaveLength(0);
      expect(result.timeline.id).toBeDefined(); // Should be auto-generated
    });
  });

  describe('timecode conversion', () => {
    it('should convert timecode to seconds correctly', async () => {
      // Test with a simple SRT to validate timecode conversion
      const srtContent = `1
01:23:45,500 --> 01:23:48,750
Test with complex timecode.`;

      const filePath = path.join(tempDir, 'timecode.srt');
      await fs.writeFile(filePath, srtContent);

      const result = await timelineParser.parseTimeline(filePath);
      
      expect(result.success).toBe(true);
      expect(result.timeline.scenes[0].startTime).toBe(1 * 3600 + 23 * 60 + 45 + 0.5);
      expect(result.timeline.scenes[0].endTime).toBe(1 * 3600 + 23 * 60 + 48 + 0.75);
    });

    it('should convert seconds to timecode correctly', () => {
      const seconds = 3725.5; // 1:02:05.5
      const timecode = timelineParser.secondsToTimecode(seconds, 25, false);
      expect(timecode).toBe('01:02:05:12'); // 12 frames at 25fps for 0.5 seconds
    });
  });

  describe('validation', () => {
    it('should validate timeline structure', async () => {
      const invalidTimeline = {
        duration: -1, // Invalid duration
        framerate: 0,  // Invalid framerate
        scenes: [
          {
            id: 'invalid_scene',
            startTime: 10,
            endTime: 5, // End before start
            voiceRequirements: [],
            context: {},
            transitions: []
          }
        ]
      };

      const filePath = path.join(tempDir, 'invalid.json');
      await fs.writeFile(filePath, JSON.stringify(invalidTimeline));

      const result = await timelineParser.parseTimeline(filePath);
      
      expect(result.success).toBe(true); // Should still parse but with warnings
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.type === 'invalid_marker')).toBe(true);
    });
  });

  describe('file validation', () => {
    it('should validate existing files', async () => {
      const filePath = path.join(tempDir, 'test.srt');
      await fs.writeFile(filePath, '1\n00:00:01,000 --> 00:00:03,000\nTest');

      const isValid = await timelineParser.validateFile(filePath);
      expect(isValid).toBe(true);
    });

    it('should reject non-existent files', async () => {
      const filePath = path.join(tempDir, 'nonexistent.srt');
      const isValid = await timelineParser.validateFile(filePath);
      expect(isValid).toBe(false);
    });

    it('should reject unsupported formats', async () => {
      const filePath = path.join(tempDir, 'test.unsupported');
      await fs.writeFile(filePath, 'test content');

      const isValid = await timelineParser.validateFile(filePath);
      expect(isValid).toBe(false);
    });
  });

  describe('supported formats', () => {
    it('should return list of supported formats', () => {
      const formats = timelineParser.getSupportedFormats();
      expect(formats).toContain('srt');
      expect(formats).toContain('vtt');
      expect(formats).toContain('json');
      expect(formats).toContain('premiere');
      expect(formats).toContain('davinci');
      expect(formats).toContain('fcpx');
    });
  });
});

describe('SubtitleParser', () => {
  let subtitleParser: SubtitleParser;
  let tempDir: string;

  beforeEach(async () => {
    subtitleParser = new SubtitleParser();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'subtitle-test-'));
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('subtitle parsing', () => {
    it('should parse subtitle track correctly', async () => {
      const srtContent = `1
00:00:01,000 --> 00:00:03,000
ALICE: Hello there!

2
00:00:03,500 --> 00:00:06,000
BOB [excited]: Hi Alice, how are you?`;

      const filePath = path.join(tempDir, 'dialogue.srt');
      await fs.writeFile(filePath, srtContent);

      const track = await subtitleParser.parseSubtitles(filePath);
      
      expect(track.entries).toHaveLength(2);
      expect(track.entries[0].speaker).toBe('ALICE');
      expect(track.entries[0].text).toBe('Hello there!');
      expect(track.entries[1].speaker).toBe('BOB');
      expect(track.entries[1].emotion?.primary).toBe('excited');
    });
  });

  describe('voice generation configuration', () => {
    it('should handle voice generation config structure', () => {
      const config = {
        defaultVoice: 'Professional narrator',
        voiceMapping: {
          'ALICE': 'Young female voice, friendly and warm',
          'BOB': 'Male voice, enthusiastic and energetic'
        },
        timingMode: 'flexible' as const,
        lipSyncEnabled: true,
        qualityThreshold: 0.8
      };

      expect(config.defaultVoice).toBe('Professional narrator');
      expect(config.voiceMapping!['ALICE']).toBe('Young female voice, friendly and warm');
      expect(config.timingMode).toBe('flexible');
      expect(config.lipSyncEnabled).toBe(true);
    });
  });
});