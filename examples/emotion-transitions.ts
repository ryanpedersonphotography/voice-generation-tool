#!/usr/bin/env tsx

/**
 * Emotion Transitions Example
 * 
 * Demonstrates the new emotion transition system for smooth voice modulation
 * Run with: tsx examples/emotion-transitions.ts
 */

import { VoiceEngine } from '../src/core/voice-engine.js';
import { EmotionTransition } from '../src/interfaces/emotion-transition.interface.js';
import { promises as fs } from 'fs';
import path from 'path';

async function emotionTransitionsDemo() {
  console.log('🎭 Voice Generation Tool - Emotion Transitions Demo\n');

  try {
    // Initialize the voice engine
    const engine = new VoiceEngine();
    
    // Note: This demo doesn't require API keys - it demonstrates the transition logic
    console.log('🎵 Voice Engine ready for emotion transition demos\n');

    // Ensure output directory exists
    await fs.mkdir('./examples/output', { recursive: true });

    // Demo 1: Simple Emotion Transition
    console.log('🎬 Demo 1: Simple Emotion Transition');
    console.log('Text: "I was feeling quite calm, but then I became really excited about the news!"');
    
    const simpleTransitionText = 'I was feeling quite calm, but then I became really excited about the news!';
    const simpleTransitions: EmotionTransition[] = [
      {
        id: 'calm-to-excited',
        fromEmotion: { type: 'calm', intensity: 0.6, variations: [] },
        toEmotion: { type: 'excited', intensity: 0.9, variations: [] },
        duration: 1500, // 1.5 seconds transition
        curve: 'ease-in-out',
        triggers: { word: 'excited' }
      }
    ];

    console.log('🎭 Transition: calm (0.6) → excited (0.9) over 1.5 seconds');
    console.log('📍 Trigger: word "excited"');
    console.log('📈 Curve: ease-in-out\n');

    // Demo 2: Multiple Emotion Transitions
    console.log('🎬 Demo 2: Storytelling with Multiple Emotions');
    const storyText = 'The forest was peaceful and serene. Suddenly, a loud crash echoed through the trees! After the initial shock, I felt a deep sadness. But then, discovering the lost treasure filled me with pure joy!';
    
    const multipleTransitions: EmotionTransition[] = [
      {
        id: 'peaceful-start',
        fromEmotion: { type: 'neutral', intensity: 0.5, variations: [] },
        toEmotion: { type: 'calm', intensity: 0.7, variations: [] },
        duration: 1000,
        curve: 'ease-out',
        triggers: { word: 'peaceful' }
      },
      {
        id: 'sudden-fear',
        fromEmotion: { type: 'calm', intensity: 0.7, variations: [] },
        toEmotion: { type: 'surprised', intensity: 0.9, variations: [] },
        duration: 800,
        curve: 'ease-in',
        triggers: { word: 'crash' }
      },
      {
        id: 'to-sadness',
        fromEmotion: { type: 'surprised', intensity: 0.9, variations: [] },
        toEmotion: { type: 'sad', intensity: 0.6, variations: [] },
        duration: 2000,
        curve: 'ease-out',
        triggers: { word: 'sadness' }
      },
      {
        id: 'discovery-joy',
        fromEmotion: { type: 'sad', intensity: 0.6, variations: [] },
        toEmotion: { type: 'happy', intensity: 0.95, variations: [] },
        duration: 1200,
        curve: 'ease-in-out',
        triggers: { word: 'joy' }
      }
    ];

    console.log('📖 Story: Forest adventure with emotional journey');
    console.log('🎭 Transitions: neutral → calm → surprised → sad → happy');
    console.log('⏱️  4 emotion transitions with different curves and timing\n');

    // Demo 3: Time-Based Transitions
    console.log('🎬 Demo 3: Time-Based Emotion Control');
    const timedText = 'This presentation will demonstrate precise emotion timing. Watch as the energy builds throughout this demonstration.';
    
    const timedTransitions: EmotionTransition[] = [
      {
        id: 'professional-start',
        fromEmotion: { type: 'neutral', intensity: 0.5, variations: [] },
        toEmotion: { type: 'calm', intensity: 0.6, variations: [] },
        duration: 1000,
        curve: 'linear',
        triggers: { time: 500 }
      },
      {
        id: 'building-energy',
        fromEmotion: { type: 'calm', intensity: 0.6, variations: [] },
        toEmotion: { type: 'excited', intensity: 0.8, variations: [] },
        duration: 2000,
        curve: 'ease-in',
        triggers: { time: 4000 }
      },
      {
        id: 'peak-enthusiasm',
        fromEmotion: { type: 'excited', intensity: 0.8, variations: [] },
        toEmotion: { type: 'excited', intensity: 0.95, variations: [] },
        duration: 1500,
        curve: 'ease-out',
        triggers: { time: 7000 }
      }
    ];

    console.log('⏰ Precise timing: 0.5s → 4s → 7s trigger points');
    console.log('📊 Energy progression: neutral → calm → excited → peak excitement\n');

    // Demo 4: Advanced Bezier Curves
    console.log('🎬 Demo 4: Custom Curve Transitions');
    const bezierText = 'Experience the smooth, natural flow of advanced emotion curves in this sophisticated example.';
    
    const bezierTransitions: EmotionTransition[] = [
      {
        id: 'smooth-buildup',
        fromEmotion: { type: 'neutral', intensity: 0.4, variations: [] },
        toEmotion: { type: 'happy', intensity: 0.8, variations: [] },
        duration: 2500,
        curve: 'bezier',
        controlPoints: [[0.25, 0.1], [0.75, 0.9]], // Custom bezier curve
        triggers: { word: 'smooth' }
      },
      {
        id: 'sophisticated-peak',
        fromEmotion: { type: 'happy', intensity: 0.8, variations: [] },
        toEmotion: { type: 'calm', intensity: 0.7, variations: [] },
        duration: 2000,
        curve: 'bezier',
        controlPoints: [[0.1, 0.8], [0.9, 0.2]], // Different curve shape
        triggers: { word: 'sophisticated' }
      }
    ];

    console.log('🎨 Custom bezier curves for natural speech patterns');
    console.log('📐 Control points: [0.25, 0.1], [0.75, 0.9] and [0.1, 0.8], [0.9, 0.2]\n');

    // Demo 5: Rapid Emotion Changes (Dramatic Reading)
    console.log('🎬 Demo 5: Dramatic Performance Style');
    const dramaticText = 'Fear! Anger! Hope! Love! Despair! Victory! - A range of human emotions!';
    
    const dramaticTransitions: EmotionTransition[] = [
      {
        fromEmotion: { type: 'fearful', intensity: 0.9, variations: [] },
        toEmotion: { type: 'angry', intensity: 0.85, variations: [] },
        duration: 500,
        curve: 'ease-in',
        triggers: { word: 'Anger' }
      },
      {
        fromEmotion: { type: 'angry', intensity: 0.85, variations: [] },
        toEmotion: { type: 'calm', intensity: 0.7, variations: [] },
        duration: 600,
        curve: 'ease-out',
        triggers: { word: 'Hope' }
      },
      {
        fromEmotion: { type: 'calm', intensity: 0.7, variations: [] },
        toEmotion: { type: 'happy', intensity: 0.9, variations: [] },
        duration: 700,
        curve: 'ease-in-out',
        triggers: { word: 'Love' }
      },
      {
        fromEmotion: { type: 'happy', intensity: 0.9, variations: [] },
        toEmotion: { type: 'sad', intensity: 0.8, variations: [] },
        duration: 800,
        curve: 'ease-in',
        triggers: { word: 'Despair' }
      },
      {
        fromEmotion: { type: 'sad', intensity: 0.8, variations: [] },
        toEmotion: { type: 'excited', intensity: 0.95, variations: [] },
        duration: 900,
        curve: 'ease-out',
        triggers: { word: 'Victory' }
      }
    ];

    console.log('🎭 Rapid emotional range: fear → anger → hope → love → despair → victory');
    console.log('⚡ Short transition times (0.5-0.9s) for dramatic effect\n');

    // Demonstrate the emotion transition processing (without actual audio generation)
    console.log('🔧 Processing Emotion Transitions...\n');

    const demos = [
      { name: 'Simple Transition', text: simpleTransitionText, transitions: simpleTransitions },
      { name: 'Multiple Transitions', text: storyText, transitions: multipleTransitions },
      { name: 'Time-Based', text: timedText, transitions: timedTransitions },
      { name: 'Bezier Curves', text: bezierText, transitions: bezierTransitions },
      { name: 'Dramatic Performance', text: dramaticText, transitions: dramaticTransitions }
    ];

    for (const demo of demos) {
      console.log(`📊 ${demo.name} Analysis:`);
      console.log(`   Text length: ${demo.text.length} characters`);
      console.log(`   Transitions: ${demo.transitions.length}`);
      console.log(`   Estimated duration: ${Math.round(demo.text.length / 15 * 60)} seconds`);
      
      // Analyze transition triggers
      let triggersFound = 0;
      for (const transition of demo.transitions) {
        if (transition.triggers.word && demo.text.toLowerCase().includes(transition.triggers.word.toLowerCase())) {
          triggersFound++;
        } else if (transition.triggers.time !== undefined) {
          triggersFound++;
        }
      }
      console.log(`   Valid triggers: ${triggersFound}/${demo.transitions.length}`);
      console.log('');
    }

    console.log('✨ Emotion Transition Features Demonstrated:');
    console.log('   • Word-based triggers for natural emotion changes');
    console.log('   • Time-based triggers for precise control');
    console.log('   • Multiple curve types (linear, ease-in/out, bezier)');
    console.log('   • Customizable transition durations');
    console.log('   • Intensity control for subtle or dramatic changes');
    console.log('   • Support for 8 emotion types');
    console.log('   • Validation and error handling');

    console.log('\n🎵 Ready for Audio Generation:');
    console.log('   Add API keys to generate actual audio with these emotion patterns');
    console.log('   Each transition will create smooth voice modulation');
    console.log('   Perfect for storytelling, presentations, and character voices');

    console.log('\n🚀 Next: Try these patterns with real voice generation!');

  } catch (error) {
    console.error('❌ Error in emotion transitions demo:', error instanceof Error ? error.message : String(error));
  }
}

// Run demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  emotionTransitionsDemo().catch(console.error);
}

export { emotionTransitionsDemo };