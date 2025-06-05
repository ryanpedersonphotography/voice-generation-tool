#!/usr/bin/env tsx

/**
 * Basic Usage Examples for Voice Generation Tool
 * 
 * This file demonstrates the core functionality of the voice generation system.
 * Run with: tsx examples/basic-usage.ts
 */

import { VoiceEngine } from '../src/core/voice-engine.js';
import { promises as fs } from 'fs';
import path from 'path';

async function basicUsageExamples() {
  console.log('🎵 Voice Generation Tool - Basic Usage Examples\n');

  try {
    // Initialize the voice engine
    const engine = new VoiceEngine();
    await engine.initialize();

    // Ensure output directory exists
    await fs.mkdir('./examples/output', { recursive: true });

    console.log('📊 Available providers:', engine.getAvailableProviders());
    console.log('🔧 Capabilities:', await engine.getProviderCapabilities());
    console.log();

    // Example 1: Basic text-to-speech
    console.log('🎤 Example 1: Basic Text-to-Speech');
    const basicAudio = await engine.generateVoice({
      text: 'Hello! Welcome to the Voice Generation Tool. This is a basic text-to-speech example.',
      outputFormat: 'mp3'
    });
    
    const basicPath = path.join('./examples/output', 'basic_example.mp3');
    await fs.writeFile(basicPath, basicAudio);
    console.log(`✅ Generated: ${basicPath} (${(basicAudio.length / 1024).toFixed(1)} KB)\n`);

    // Example 2: Voice with custom prompt
    console.log('🎭 Example 2: Custom Voice Characteristics');
    const customVoiceAudio = await engine.generateVoice({
      text: 'This is a demonstration of a deep, wise male voice, similar to Morgan Freeman.',
      voicePrompt: 'Deep male voice, Morgan Freeman-like, wise and contemplative',
      outputFormat: 'mp3'
    });
    
    const customPath = path.join('./examples/output', 'custom_voice_example.mp3');
    await fs.writeFile(customPath, customVoiceAudio);
    console.log(`✅ Generated: ${customPath} (${(customVoiceAudio.length / 1024).toFixed(1)} KB)\n`);

    // Example 3: Emotional speech
    console.log('😊 Example 3: Emotional Speech');
    const emotionalAudio = await engine.generateVoice({
      text: 'I am absolutely thrilled to demonstrate the emotional capabilities of this voice system!',
      voicePrompt: 'Young female voice, energetic and enthusiastic',
      modulation: {
        emotion: { type: 'excited', intensity: 0.9, variations: [] },
        speed: 1.2,
        pitch: 3,
        volume: 1.0,
        emphasis: [
          { word: 'thrilled', strength: 0.8, position: 5 },
          { word: 'amazing', strength: 0.9, position: 25 }
        ],
        pauses: []
      },
      outputFormat: 'mp3'
    });
    
    const emotionalPath = path.join('./examples/output', 'emotional_example.mp3');
    await fs.writeFile(emotionalPath, emotionalAudio);
    console.log(`✅ Generated: ${emotionalPath} (${(emotionalAudio.length / 1024).toFixed(1)} KB)\n`);

    // Example 4: Emotion mapping throughout text
    console.log('🎭 Example 4: Dynamic Emotion Changes');
    const dynamicText = 'The story begins in a peaceful village. Suddenly, danger approaches! But then, everything calms down again.';
    const dynamicAudio = await engine.generateVoice({
      text: dynamicText,
      voicePrompt: 'Professional narrator, clear and expressive',
      emotionMap: [
        { start: 0, end: 35, emotion: 'calm', intensity: 0.6 },      // "The story begins in a peaceful village."
        { start: 36, end: 65, emotion: 'fearful', intensity: 0.8 },  // "Suddenly, danger approaches!"
        { start: 66, end: -1, emotion: 'calm', intensity: 0.7 }      // "But then, everything calms down again."
      ],
      outputFormat: 'mp3'
    });
    
    const dynamicPath = path.join('./examples/output', 'dynamic_emotion_example.mp3');
    await fs.writeFile(dynamicPath, dynamicAudio);
    console.log(`✅ Generated: ${dynamicPath} (${(dynamicAudio.length / 1024).toFixed(1)} KB)\n`);

    // Example 5: Different output formats
    console.log('🎵 Example 5: Multiple Output Formats');
    const multiFormatText = 'This audio will be generated in multiple formats for comparison.';
    
    for (const format of ['mp3', 'wav', 'aac'] as const) {
      const audio = await engine.generateVoice({
        text: multiFormatText,
        voicePrompt: 'Professional female voice, clear and articulate',
        outputFormat: format
      });
      
      const formatPath = path.join('./examples/output', `format_example.${format}`);
      await fs.writeFile(formatPath, audio);
      console.log(`✅ ${format.toUpperCase()}: ${formatPath} (${(audio.length / 1024).toFixed(1)} KB)`);
    }
    console.log();

    // Example 6: Batch generation
    console.log('📦 Example 6: Batch Generation');
    const segments = [
      { text: 'First segment: Introduction to the topic', emotion: 'calm' },
      { text: 'Second segment: Building excitement!', emotion: 'excited' },
      { text: 'Third segment: Concluding thoughts', emotion: 'neutral' }
    ];

    const batchRequests = segments.map(segment => ({
      text: segment.text,
      voicePrompt: 'Professional presenter voice',
      modulation: {
        emotion: { type: segment.emotion as any, intensity: 0.7, variations: [] },
        speed: 1.0,
        pitch: 0,
        volume: 1.0,
        emphasis: [],
        pauses: []
      },
      outputFormat: 'mp3' as const
    }));

    const batchAudio = await engine.generateBatch(batchRequests);
    
    for (let i = 0; i < batchAudio.length; i++) {
      if (batchAudio[i].length > 0) {
        const batchPath = path.join('./examples/output', `batch_segment_${i + 1}.mp3`);
        await fs.writeFile(batchPath, batchAudio[i]);
        console.log(`✅ Segment ${i + 1}: ${batchPath} (${(batchAudio[i].length / 1024).toFixed(1)} KB)`);
      }
    }

    console.log('\n🎉 All examples completed successfully!');
    console.log('📁 Check the ./examples/output/ directory for generated audio files.');
    console.log('\n💡 Tip: You can play these files with any audio player to hear the results.');

  } catch (error) {
    console.error('❌ Error running examples:', error.message);
    process.exit(1);
  }
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  basicUsageExamples().catch(console.error);
}

export { basicUsageExamples };