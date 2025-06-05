#!/usr/bin/env tsx

import { VoiceEngine } from './core/voice-engine.js';
import { promises as fs } from 'fs';
import path from 'path';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
🎵 Voice Generation Tool CLI

Usage:
  npm run generate -- "Hello world" --voice "Deep male voice" --format mp3
  npm run generate -- "Hello world" --emotion happy --intensity 0.8
  npm run generate -- --list-voices
  npm run generate -- --capabilities

Options:
  --voice <prompt>      Voice description (e.g., "Young female, cheerful")
  --format <format>     Output format: mp3, wav, aac (default: mp3)
  --emotion <emotion>   Emotion: happy, sad, angry, excited, calm, fearful, surprised, neutral
  --intensity <0-1>     Emotion intensity (default: 0.7)
  --output <path>       Output file path (default: auto-generated)
  --list-voices         List all available voices
  --capabilities        Show provider capabilities

Examples:
  npm run generate -- "Hello world" --voice "Morgan Freeman-like narrator"
  npm run generate -- "I'm so excited!" --emotion excited --intensity 0.9
  npm run generate -- "Calm meditation guide" --voice "Soothing female" --emotion calm
    `);
    return;
  }

  try {
    const engine = new VoiceEngine();
    await engine.initialize();

    // Parse arguments
    let text = '';
    let voicePrompt = '';
    let outputFormat: 'mp3' | 'wav' | 'aac' = 'mp3';
    let emotion: any = undefined;
    let intensity = 0.7;
    let outputPath = '';
    let listVoices = false;
    let showCapabilities = false;

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      if (arg === '--voice' && i + 1 < args.length) {
        voicePrompt = args[++i];
      } else if (arg === '--format' && i + 1 < args.length) {
        outputFormat = args[++i] as 'mp3' | 'wav' | 'aac';
      } else if (arg === '--emotion' && i + 1 < args.length) {
        emotion = args[++i];
      } else if (arg === '--intensity' && i + 1 < args.length) {
        intensity = parseFloat(args[++i]);
      } else if (arg === '--output' && i + 1 < args.length) {
        outputPath = args[++i];
      } else if (arg === '--list-voices') {
        listVoices = true;
      } else if (arg === '--capabilities') {
        showCapabilities = true;
      } else if (!arg.startsWith('--')) {
        text = arg;
      }
    }

    // Handle special commands
    if (listVoices) {
      const voices = await engine.listAvailableVoices();
      console.log(`\n🎵 Available Voices (${voices.length} total):\n`);
      voices.forEach(voice => {
        console.log(`🎤 ${voice.name} (${voice.provider})`);
        console.log(`   Gender: ${voice.characteristics.gender}, Age: ${voice.characteristics.age}`);
        console.log(`   Accent: ${voice.characteristics.accent}, Timbre: ${voice.characteristics.timbre}\n`);
      });
      return;
    }

    if (showCapabilities) {
      const capabilities = await engine.getProviderCapabilities();
      const providers = engine.getAvailableProviders();
      
      console.log('\n🔧 Voice Generation Capabilities:\n');
      providers.forEach(provider => {
        const caps = capabilities[provider];
        console.log(`🎛️ ${provider.toUpperCase()}`);
        console.log(`   ✅ Emotions: ${caps.supportsEmotions ? 'Yes' : 'No'}`);
        console.log(`   🎭 Voice Cloning: ${caps.supportsVoiceCloning ? 'Yes' : 'No'}`);
        console.log(`   🟢 Status: Available\n`);
      });
      return;
    }

    // Generate voice
    if (!text) {
      console.error('❌ Error: Text is required');
      return;
    }

    console.log('🎵 Generating voice...');
    console.log(`📝 Text: "${text}"`);
    if (voicePrompt) console.log(`🎭 Voice: ${voicePrompt}`);
    if (emotion) console.log(`😊 Emotion: ${emotion} (intensity: ${intensity})`);
    console.log(`🎵 Format: ${outputFormat.toUpperCase()}\n`);

    const modulation = emotion ? {
      emotion: { type: emotion, intensity, variations: [] },
      speed: 1.0,
      pitch: 0,
      volume: 1.0,
      emphasis: [],
      pauses: []
    } : undefined;

    const audio = await engine.generateVoice({
      text,
      voicePrompt: voicePrompt || undefined,
      outputFormat,
      modulation
    });

    // Save file
    if (!outputPath) {
      await fs.mkdir('./output', { recursive: true });
      outputPath = path.join('./output', `voice_${Date.now()}.${outputFormat}`);
    }

    await fs.writeFile(outputPath, audio);

    console.log('✅ Voice generated successfully!');
    console.log(`📁 Output: ${outputPath}`);
    console.log(`📏 Size: ${(audio.length / 1024).toFixed(1)} KB`);

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}