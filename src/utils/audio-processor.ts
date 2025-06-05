import { AudioProcessingOptions } from '../interfaces/voice.interface.js';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { promises as fs } from 'fs';
import path from 'path';

// Set the ffmpeg binary path
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

export class AudioProcessor {
  private tempDir = './cache';

  constructor() {
    this.ensureTempDir();
  }

  private async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      // Directory already exists
    }
  }

  async process(audioBuffer: Buffer, options: AudioProcessingOptions): Promise<Buffer> {
    const inputPath = path.join(this.tempDir, `input_${Date.now()}.mp3`);
    const outputPath = path.join(this.tempDir, `output_${Date.now()}.${options.format}`);

    try {
      // Write input buffer to temp file
      await fs.writeFile(inputPath, audioBuffer);

      // Process with ffmpeg
      await this.processWithFFmpeg(inputPath, outputPath, options);

      // Read processed file
      const processedBuffer = await fs.readFile(outputPath);

      // Cleanup temp files
      await this.cleanup([inputPath, outputPath]);

      return processedBuffer;
    } catch (error) {
      // Cleanup on error
      await this.cleanup([inputPath, outputPath]);
      throw new Error(`Audio processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async processWithFFmpeg(inputPath: string, outputPath: string, options: AudioProcessingOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath);

      // Set output format
      command = command.format(options.format);

      // Set bitrate if specified
      if (options.bitrate) {
        command = command.audioBitrate(options.bitrate);
      }

      // Set sample rate if specified
      if (options.sampleRate) {
        command = command.audioFrequency(options.sampleRate);
      }

      // Apply audio filters
      const filters: string[] = [];
      
      if (options.normalize) {
        filters.push('loudnorm');
      }

      if (options.removeNoise) {
        // Simple noise reduction
        filters.push('highpass=f=80');
        filters.push('lowpass=f=8000');
      }

      if (filters.length > 0) {
        command = command.audioFilters(filters);
      }

      command
        .save(outputPath)
        .on('end', () => resolve())
        .on('error', (error: any) => reject(error));
    });
  }

  private async cleanup(files: string[]): Promise<void> {
    await Promise.all(
      files.map(async (file) => {
        try {
          await fs.unlink(file);
        } catch (error) {
          // File might not exist, ignore error
        }
      })
    );
  }

  async convertFormat(audioBuffer: Buffer, fromFormat: string, toFormat: string): Promise<Buffer> {
    return this.process(audioBuffer, {
      format: toFormat as 'mp3' | 'wav' | 'aac',
      normalize: false,
      removeNoise: false
    });
  }

  async normalizeAudio(audioBuffer: Buffer, format: 'mp3' | 'wav' | 'aac'): Promise<Buffer> {
    return this.process(audioBuffer, {
      format,
      normalize: true,
      removeNoise: false
    });
  }

  async enhanceQuality(audioBuffer: Buffer, format: 'mp3' | 'wav' | 'aac'): Promise<Buffer> {
    return this.process(audioBuffer, {
      format,
      normalize: true,
      removeNoise: true,
      bitrate: format === 'mp3' ? 192 : undefined,
      sampleRate: 44100
    });
  }
}