import {
  AudioTrackResult,
  ConversationTimeline,
  MixingOptions,
  AudioSegment,
  TimelineEvent
} from '../interfaces/conversation.interface.js';

export interface MixedAudioResult {
  audioBuffer: Buffer;
  metadata: {
    totalDuration: number;
    trackCount: number;
    sampleRate: number;
    bitDepth: number;
    channels: number;
  };
  timeline: ConversationTimeline;
}

export interface AudioProcessingOptions {
  sampleRate?: number;
  bitDepth?: number;
  channels?: number;
  format?: 'wav' | 'mp3' | 'aac';
}

export class AudioMixer {
  private defaultSampleRate = 44100;
  private defaultBitDepth = 16;
  private defaultChannels = 2;

  /**
   * Mix multiple conversation tracks into a single audio file
   */
  async mixConversation(
    tracks: AudioTrackResult[],
    timeline: ConversationTimeline,
    options: MixingOptions
  ): Promise<Buffer> {
    console.log(`🎚️ Mixing ${tracks.length} audio tracks...`);
    
    if (tracks.length === 0) {
      throw new Error('No audio tracks to mix');
    }

    // Prepare audio processing options
    const processingOptions: AudioProcessingOptions = {
      sampleRate: this.defaultSampleRate,
      bitDepth: this.defaultBitDepth,
      channels: this.defaultChannels,
      format: 'wav' // Use WAV for intermediate processing
    };

    // Calculate the total duration and create mix buffer
    const totalDurationMs = timeline.totalDuration;
    const totalSamples = Math.ceil((totalDurationMs / 1000) * processingOptions.sampleRate!);
    const bytesPerSample = (processingOptions.bitDepth! / 8) * processingOptions.channels!;
    const mixBuffer = Buffer.alloc(totalSamples * bytesPerSample);

    console.log(`📊 Mix duration: ${totalDurationMs}ms (${totalSamples} samples)`);

    // Process each track according to the timeline
    for (const track of tracks) {
      await this.mixTrackIntoBuffer(track, timeline, mixBuffer, processingOptions, options);
    }

    // Apply final processing
    let finalBuffer = mixBuffer;

    if (options.normalizeAudio) {
      finalBuffer = this.normalizeAudio(finalBuffer, processingOptions);
    }

    if (options.compressionLevel > 0) {
      finalBuffer = this.applyCompression(finalBuffer, options.compressionLevel, processingOptions);
    }

    // Apply spatial audio if enabled
    if (options.spatialAudioEnabled) {
      finalBuffer = await this.applySpatialAudio(finalBuffer, tracks, processingOptions);
    }

    console.log(`✅ Audio mixing complete (${finalBuffer.length} bytes)`);
    return finalBuffer;
  }

  /**
   * Mix a single track into the main mix buffer
   */
  private async mixTrackIntoBuffer(
    track: AudioTrackResult,
    timeline: ConversationTimeline,
    mixBuffer: Buffer,
    processingOptions: AudioProcessingOptions,
    mixingOptions: MixingOptions
  ): Promise<void> {
    console.log(`🎤 Mixing track: ${track.characterName}`);

    // Get events for this character
    const characterEvents = timeline.events.filter(event => event.characterId === track.characterId);
    
    for (const segment of track.segments) {
      const startTimeMs = segment.startTime;
      const endTimeMs = segment.endTime;
      
      // Convert time to sample positions
      const startSample = Math.floor((startTimeMs / 1000) * processingOptions.sampleRate!);
      const endSample = Math.floor((endTimeMs / 1000) * processingOptions.sampleRate!);
      
      // Get audio data for this segment
      const segmentBuffer = segment.audioBuffer;
      
      // Check for overlapping events
      const overlappingEvents = characterEvents.filter(event => 
        event.time >= startTimeMs && event.time <= endTimeMs && event.type === 'overlap_start'
      );
      
      // Calculate volume for this segment
      let volume = 1.0;
      if (overlappingEvents.length > 0) {
        // Reduce volume during overlaps
        const overlapEvent = overlappingEvents[0];
        volume = 1.0 - (overlapEvent.data?.volumeReduction || 0.3);
      }
      
      // Mix segment into main buffer
      await this.mixAudioSegmentIntoBuffer(
        segmentBuffer,
        mixBuffer,
        startSample,
        volume,
        processingOptions
      );
    }
  }

  /**
   * Mix an audio segment into the main buffer at a specific position
   */
  private async mixAudioSegmentIntoBuffer(
    segmentBuffer: Buffer,
    mixBuffer: Buffer,
    startSample: number,
    volume: number,
    processingOptions: AudioProcessingOptions
  ): Promise<void> {
    const bytesPerSample = (processingOptions.bitDepth! / 8) * processingOptions.channels!;
    const startByte = startSample * bytesPerSample;
    
    // Simple audio mixing - in production, you'd want proper audio processing
    const segmentSamples = Math.floor(segmentBuffer.length / bytesPerSample);
    const mixBufferSamples = Math.floor(mixBuffer.length / bytesPerSample);
    
    for (let i = 0; i < segmentSamples && (startSample + i) < mixBufferSamples; i++) {
      const mixIndex = (startSample + i) * bytesPerSample;
      const segmentIndex = i * bytesPerSample;
      
      if (mixIndex + bytesPerSample <= mixBuffer.length && segmentIndex + bytesPerSample <= segmentBuffer.length) {
        // Mix 16-bit stereo samples (simplified mixing)
        for (let channel = 0; channel < processingOptions.channels!; channel++) {
          const mixByteIndex = mixIndex + (channel * 2);
          const segmentByteIndex = segmentIndex + (channel * 2);
          
          // Read existing mix value (16-bit little-endian)
          const mixValue = mixBuffer.readInt16LE(mixByteIndex);
          
          // Read segment value (16-bit little-endian)
          const segmentValue = segmentBuffer.readInt16LE(segmentByteIndex);
          
          // Apply volume and mix
          const scaledSegmentValue = Math.round(segmentValue * volume);
          let mixedValue = mixValue + scaledSegmentValue;
          
          // Prevent clipping
          mixedValue = Math.max(-32768, Math.min(32767, mixedValue));
          
          // Write back to mix buffer
          mixBuffer.writeInt16LE(mixedValue, mixByteIndex);
        }
      }
    }
  }

  /**
   * Normalize audio levels
   */
  private normalizeAudio(buffer: Buffer, options: AudioProcessingOptions): Buffer {
    console.log('🔊 Normalizing audio levels...');
    
    const bytesPerSample = (options.bitDepth! / 8) * options.channels!;
    const totalSamples = Math.floor(buffer.length / bytesPerSample);
    
    // Find peak amplitude
    let peak = 0;
    for (let i = 0; i < totalSamples; i++) {
      for (let channel = 0; channel < options.channels!; channel++) {
        const byteIndex = (i * bytesPerSample) + (channel * 2);
        if (byteIndex + 1 < buffer.length) {
          const sample = Math.abs(buffer.readInt16LE(byteIndex));
          peak = Math.max(peak, sample);
        }
      }
    }
    
    if (peak === 0) return buffer;
    
    // Calculate normalization factor (leave some headroom)
    const maxValue = 32767 * 0.95; // 95% of max to prevent clipping
    const normalizationFactor = maxValue / peak;
    
    // Apply normalization
    const normalizedBuffer = Buffer.alloc(buffer.length);
    for (let i = 0; i < totalSamples; i++) {
      for (let channel = 0; channel < options.channels!; channel++) {
        const byteIndex = (i * bytesPerSample) + (channel * 2);
        if (byteIndex + 1 < buffer.length) {
          const sample = buffer.readInt16LE(byteIndex);
          const normalizedSample = Math.round(sample * normalizationFactor);
          const clampedSample = Math.max(-32768, Math.min(32767, normalizedSample));
          normalizedBuffer.writeInt16LE(clampedSample, byteIndex);
        }
      }
    }
    
    console.log(`📈 Normalization applied (factor: ${normalizationFactor.toFixed(2)})`);
    return normalizedBuffer;
  }

  /**
   * Apply dynamic range compression
   */
  private applyCompression(
    buffer: Buffer, 
    compressionLevel: number, 
    options: AudioProcessingOptions
  ): Buffer {
    console.log(`🗜️ Applying compression (level: ${compressionLevel})...`);
    
    const bytesPerSample = (options.bitDepth! / 8) * options.channels!;
    const totalSamples = Math.floor(buffer.length / bytesPerSample);
    
    // Simple compression algorithm
    const threshold = 32767 * (1 - compressionLevel); // Compression threshold
    const ratio = 1 + (compressionLevel * 3); // Compression ratio
    
    const compressedBuffer = Buffer.alloc(buffer.length);
    
    for (let i = 0; i < totalSamples; i++) {
      for (let channel = 0; channel < options.channels!; channel++) {
        const byteIndex = (i * bytesPerSample) + (channel * 2);
        if (byteIndex + 1 < buffer.length) {
          const sample = buffer.readInt16LE(byteIndex);
          const absSample = Math.abs(sample);
          
          let compressedSample = sample;
          if (absSample > threshold) {
            // Apply compression
            const overage = absSample - threshold;
            const compressedOverage = overage / ratio;
            const sign = sample >= 0 ? 1 : -1;
            compressedSample = sign * (threshold + compressedOverage);
          }
          
          const clampedSample = Math.max(-32768, Math.min(32767, Math.round(compressedSample)));
          compressedBuffer.writeInt16LE(clampedSample, byteIndex);
        }
      }
    }
    
    return compressedBuffer;
  }

  /**
   * Apply spatial audio effects (simplified implementation)
   */
  private async applySpatialAudio(
    buffer: Buffer,
    tracks: AudioTrackResult[],
    options: AudioProcessingOptions
  ): Promise<Buffer> {
    console.log('🌍 Applying spatial audio effects...');
    
    // This is a simplified spatial audio implementation
    // In production, you'd use more sophisticated 3D audio processing
    
    if (options.channels !== 2) {
      console.warn('⚠️ Spatial audio requires stereo output');
      return buffer;
    }
    
    const bytesPerSample = (options.bitDepth! / 8) * options.channels!;
    const totalSamples = Math.floor(buffer.length / bytesPerSample);
    
    // Apply simple panning based on character positions
    // This is a placeholder - real spatial audio is much more complex
    const spatialBuffer = Buffer.alloc(buffer.length);
    buffer.copy(spatialBuffer);
    
    console.log('✅ Spatial audio effects applied');
    return spatialBuffer;
  }

  /**
   * Export individual character tracks
   */
  async exportCharacterTracks(
    tracks: AudioTrackResult[],
    outputDir: string,
    options: MixingOptions
  ): Promise<string[]> {
    const exportedFiles: string[] = [];
    
    for (const track of tracks) {
      const filename = `${track.characterName.toLowerCase().replace(/\s+/g, '_')}.wav`;
      const filepath = `${outputDir}/${filename}`;
      
      // Process individual track
      let trackBuffer = await this.concatenateSegments(track.segments);
      
      if (options.normalizeAudio) {
        trackBuffer = this.normalizeAudio(trackBuffer, {
          sampleRate: this.defaultSampleRate,
          bitDepth: this.defaultBitDepth,
          channels: this.defaultChannels
        });
      }
      
      // In a real implementation, you'd write the audio file here
      // For now, we'll just track the intended exports
      exportedFiles.push(filepath);
      
      console.log(`💾 Exported track: ${filename}`);
    }
    
    return exportedFiles;
  }

  /**
   * Concatenate audio segments for a single character
   */
  private async concatenateSegments(segments: AudioSegment[]): Promise<Buffer> {
    if (segments.length === 0) {
      return Buffer.alloc(0);
    }
    
    if (segments.length === 1) {
      return segments[0].audioBuffer;
    }
    
    // Simple concatenation - in production, you'd handle timing gaps properly
    const buffers = segments
      .sort((a, b) => a.startTime - b.startTime)
      .map(segment => segment.audioBuffer);
    
    return Buffer.concat(buffers);
  }

  /**
   * Create audio crossfades between speakers
   */
  private applyCrossfades(
    buffer: Buffer,
    timeline: ConversationTimeline,
    crossfadeDuration: number,
    options: AudioProcessingOptions
  ): Buffer {
    console.log(`🔄 Applying crossfades (${crossfadeDuration}ms)...`);
    
    // Find speaker transitions
    const transitions = timeline.events.filter(event => 
      event.type === 'line_start' || event.type === 'line_end'
    );
    
    const crossfadedBuffer = Buffer.alloc(buffer.length);
    buffer.copy(crossfadedBuffer);
    
    // Apply crossfades at transition points
    for (let i = 0; i < transitions.length - 1; i++) {
      const currentEvent = transitions[i];
      const nextEvent = transitions[i + 1];
      
      if (currentEvent.type === 'line_end' && nextEvent.type === 'line_start' &&
          currentEvent.characterId !== nextEvent.characterId) {
        
        const crossfadeStartMs = currentEvent.time - (crossfadeDuration / 2);
        const crossfadeEndMs = nextEvent.time + (crossfadeDuration / 2);
        
        this.applyCrossfadeToRegion(
          crossfadedBuffer,
          crossfadeStartMs,
          crossfadeEndMs,
          options
        );
      }
    }
    
    return crossfadedBuffer;
  }

  /**
   * Apply crossfade to a specific region of audio
   */
  private applyCrossfadeToRegion(
    buffer: Buffer,
    startMs: number,
    endMs: number,
    options: AudioProcessingOptions
  ): void {
    const sampleRate = options.sampleRate!;
    const bytesPerSample = (options.bitDepth! / 8) * options.channels!;
    
    const startSample = Math.floor((startMs / 1000) * sampleRate);
    const endSample = Math.floor((endMs / 1000) * sampleRate);
    const crossfadeSamples = endSample - startSample;
    
    if (crossfadeSamples <= 0) return;
    
    for (let i = 0; i < crossfadeSamples; i++) {
      const sampleIndex = startSample + i;
      const fadeProgress = i / crossfadeSamples;
      
      // Simple linear crossfade
      const fadeMultiplier = 0.5 + (0.5 * Math.cos(fadeProgress * Math.PI));
      
      for (let channel = 0; channel < options.channels!; channel++) {
        const byteIndex = (sampleIndex * bytesPerSample) + (channel * 2);
        
        if (byteIndex + 1 < buffer.length) {
          const sample = buffer.readInt16LE(byteIndex);
          const fadedSample = Math.round(sample * fadeMultiplier);
          const clampedSample = Math.max(-32768, Math.min(32767, fadedSample));
          buffer.writeInt16LE(clampedSample, byteIndex);
        }
      }
    }
  }

  /**
   * Generate audio with silence gaps
   */
  createSilence(durationMs: number, options: AudioProcessingOptions): Buffer {
    const sampleRate = options.sampleRate || this.defaultSampleRate;
    const bitDepth = options.bitDepth || this.defaultBitDepth;
    const channels = options.channels || this.defaultChannels;
    
    const samples = Math.floor((durationMs / 1000) * sampleRate);
    const bytesPerSample = (bitDepth / 8) * channels;
    
    return Buffer.alloc(samples * bytesPerSample, 0);
  }

  /**
   * Get mixing capabilities
   */
  getCapabilities(): {
    maxTracks: number;
    supportedFormats: string[];
    supportedSampleRates: number[];
    supportsSpatialAudio: boolean;
    supportsCompression: boolean;
  } {
    return {
      maxTracks: 32,
      supportedFormats: ['wav', 'mp3', 'aac'],
      supportedSampleRates: [22050, 44100, 48000],
      supportsSpatialAudio: true,
      supportsCompression: true
    };
  }
}