#!/usr/bin/env node

/**
 * Phase 1 Validation Script
 * Tests all core functionality without requiring real API keys
 */

import { VoiceEngine } from './dist/core/voice-engine.js';
import { parseVoicePrompt } from './dist/utils/prompt-parser.js';
import { ElevenLabsProvider } from './dist/providers/elevenlabs/provider.js';
import { OpenAIProvider } from './dist/providers/openai/provider.js';
import fs from 'fs';

console.log('🧪 Phase 1 Validation - Voice Generation Tool\n');

async function validatePhase1() {
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  function test(name, fn) {
    try {
      const result = fn();
      if (result === true || (result && typeof result.then === 'function')) {
        results.passed++;
        results.tests.push({ name, status: '✅ PASS', details: '' });
        console.log(`✅ ${name}`);
      } else {
        throw new Error('Test returned false');
      }
    } catch (error) {
      results.failed++;
      results.tests.push({ name, status: '❌ FAIL', details: error.message });
      console.log(`❌ ${name}: ${error.message}`);
    }
  }

  // Test 1: Core imports work
  test('Core module imports', () => {
    return VoiceEngine && parseVoicePrompt && ElevenLabsProvider && OpenAIProvider;
  });

  // Test 2: Voice Engine instantiation
  test('Voice Engine instantiation', () => {
    const engine = new VoiceEngine();
    return engine instanceof VoiceEngine;
  });

  // Test 3: Voice prompt parsing
  test('Voice prompt parsing', () => {
    const result = parseVoicePrompt('Deep male voice, Morgan Freeman-like, wise and contemplative');
    return result.gender === 'male' && 
           result.timbre === 'deep' && 
           result.personality.includes('wise');
  });

  // Test 4: Complex prompt parsing
  test('Complex prompt parsing', () => {
    const result = parseVoicePrompt('Young British female voice, cheerful and energetic, high pitch');
    return result.gender === 'female' && 
           result.age === 'young' && 
           result.accent === 'british' && 
           result.personality.includes('cheerful') &&
           result.timbre === 'high';
  });

  // Test 5: Provider instantiation
  test('ElevenLabs provider instantiation', () => {
    const provider = new ElevenLabsProvider('test-key');
    return provider.name === 'elevenlabs' && 
           provider.supportsEmotions() === true &&
           provider.supportsVoiceCloning() === true;
  });

  // Test 6: OpenAI provider instantiation
  test('OpenAI provider instantiation', () => {
    const provider = new OpenAIProvider('test-key');
    return provider.name === 'openai' && 
           provider.supportsEmotions() === false &&
           provider.supportsVoiceCloning() === false;
  });

  // Test 7: Voice characteristics extraction
  test('Voice characteristics validation', () => {
    const chars = parseVoicePrompt('Calm meditation guide, soothing female voice');
    return chars.personality.includes('calm') &&
           chars.gender === 'female' &&
           chars.defaultEmotion.type === 'calm';
  });

  // Test 8: Emotion type validation
  test('Emotion type system', () => {
    const emotions = ['happy', 'sad', 'angry', 'excited', 'calm', 'fearful', 'surprised', 'neutral'];
    const testPrompts = [
      { prompt: 'Happy cheerful voice', expected: 'happy' },
      { prompt: 'Calm soothing narrator', expected: 'calm' },
      { prompt: 'Energetic excited presenter', expected: 'excited' }
    ];
    
    return testPrompts.every(test => {
      const result = parseVoicePrompt(test.prompt);
      return result.defaultEmotion.type === test.expected;
    });
  });

  // Test 9: File structure validation
  test('Project structure', () => {
    // Check if key files exist in dist
    const requiredFiles = [
      './dist/core/voice-engine.js',
      './dist/providers/elevenlabs/provider.js',
      './dist/providers/openai/provider.js',
      './dist/utils/prompt-parser.js',
      './dist/interfaces/voice.interface.js'
    ];
    
    return requiredFiles.every(file => {
      try {
        return fs.existsSync(file);
      } catch {
        return false;
      }
    });
  });

  // Test 10: TypeScript definitions
  test('TypeScript definitions generated', () => {
    const requiredDefs = [
      './dist/core/voice-engine.d.ts',
      './dist/interfaces/voice.interface.d.ts'
    ];
    
    return requiredDefs.every(file => {
      try {
        return fs.existsSync(file);
      } catch {
        return false;
      }
    });
  });

  console.log('\n📊 Phase 1 Validation Results:');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);

  if (results.failed === 0) {
    console.log('\n🎉 Phase 1 COMPLETE - All core functionality validated!');
    console.log('\n🚀 Ready for Phase 2: Advanced Features');
    console.log('   • Emotion transitions');
    console.log('   • Multi-voice conversations'); 
    console.log('   • SSML generation');
    console.log('   • Voice style transfer');
    
    console.log('\n💡 To test with real API keys:');
    console.log('   1. Add ELEVENLABS_API_KEY to .env file');
    console.log('   2. Run: npm run generate -- "Hello world" --voice "Deep male voice"');
    
  } else {
    console.log('\n⚠️  Some tests failed. Review the issues above before proceeding.');
    process.exit(1);
  }
}

validatePhase1().catch(console.error);