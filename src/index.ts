export { VoiceEngine } from './core/voice-engine.js';
export { VoiceProvider } from './core/provider.base.js';
export { ElevenLabsProvider } from './providers/elevenlabs/provider.js';
export { OpenAIProvider } from './providers/openai/provider.js';
export { AudioProcessor } from './utils/audio-processor.js';
export { parseVoicePrompt } from './utils/prompt-parser.js';

export type {
  VoiceProfile,
  VoiceCharacteristics,
  EmotionProfile,
  VoiceModulation,
  GenerationRequest,
  AudioProcessingOptions,
  EmotionType,
  EmotionVariation,
  EmphasisPoint,
  PausePoint,
  EmotionMapEntry
} from './interfaces/voice.interface.js';

// Main entry point for the voice generation tool
import { VoiceEngine } from './core/voice-engine.js';

export async function createVoiceEngine(): Promise<VoiceEngine> {
  const engine = new VoiceEngine();
  await engine.initialize();
  return engine;
}

export default VoiceEngine;