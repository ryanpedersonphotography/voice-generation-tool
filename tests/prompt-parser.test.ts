import { describe, it, expect } from 'vitest';
import { parseVoicePrompt } from '../src/utils/prompt-parser.js';

describe('Voice Prompt Parser', () => {
  it('should parse gender correctly', () => {
    const maleResult = parseVoicePrompt('Deep male voice');
    expect(maleResult.gender).toBe('male');

    const femaleResult = parseVoicePrompt('Young female voice');
    expect(femaleResult.gender).toBe('female');

    const neutralResult = parseVoicePrompt('Professional voice');
    expect(neutralResult.gender).toBe('neutral');
  });

  it('should parse age correctly', () => {
    const youngResult = parseVoicePrompt('Young energetic voice');
    expect(youngResult.age).toBe('young');

    const childResult = parseVoicePrompt('Child voice for animation');
    expect(childResult.age).toBe('child');

    const seniorResult = parseVoicePrompt('Elderly wise narrator');
    expect(seniorResult.age).toBe('senior');

    const adultResult = parseVoicePrompt('Professional business voice');
    expect(adultResult.age).toBe('adult');
  });

  it('should parse accents correctly', () => {
    const britishResult = parseVoicePrompt('British accent, formal');
    expect(britishResult.accent).toBe('british');

    const americanResult = parseVoicePrompt('American narrator voice');
    expect(americanResult.accent).toBe('american');

    const australianResult = parseVoicePrompt('Australian accent guide');
    expect(australianResult.accent).toBe('australian');
  });

  it('should parse personality traits', () => {
    const cheerfulResult = parseVoicePrompt('Cheerful and happy voice');
    expect(cheerfulResult.personality).toContain('cheerful');

    const calmResult = parseVoicePrompt('Calm and peaceful narrator');
    expect(calmResult.personality).toContain('calm');

    const energeticResult = parseVoicePrompt('Energetic and excited presenter');
    expect(energeticResult.personality).toContain('energetic');

    const wiseResult = parseVoicePrompt('Wise contemplative storyteller');
    expect(wiseResult.personality).toContain('wise');
  });

  it('should parse timbre correctly', () => {
    const deepResult = parseVoicePrompt('Deep bass voice');
    expect(deepResult.timbre).toBe('deep');

    const highResult = parseVoicePrompt('High soprano voice');
    expect(deepResult.timbre).toBe('deep');

    const mediumResult = parseVoicePrompt('Regular speaking voice');
    expect(mediumResult.timbre).toBe('medium');
  });

  it('should parse pace correctly', () => {
    const slowResult = parseVoicePrompt('Slow relaxed narration');
    expect(slowResult.pace).toBe('slow');

    const fastResult = parseVoicePrompt('Fast-paced exciting delivery');
    expect(fastResult.pace).toBe('fast');

    const normalResult = parseVoicePrompt('Normal speaking pace');
    expect(normalResult.pace).toBe('normal');
  });

  it('should set appropriate default emotion', () => {
    const happyResult = parseVoicePrompt('Cheerful upbeat voice');
    expect(happyResult.defaultEmotion.type).toBe('happy');

    const calmResult = parseVoicePrompt('Calm soothing voice');
    expect(calmResult.defaultEmotion.type).toBe('calm');

    const excitedResult = parseVoicePrompt('Energetic dynamic presenter');
    expect(excitedResult.defaultEmotion.type).toBe('excited');

    const neutralResult = parseVoicePrompt('Professional business voice');
    expect(neutralResult.defaultEmotion.type).toBe('neutral');
  });

  it('should parse complex prompts', () => {
    const complexResult = parseVoicePrompt(
      'Young British female voice, cheerful and energetic, with a high timbre and fast pace'
    );

    expect(complexResult.gender).toBe('female');
    expect(complexResult.age).toBe('young');
    expect(complexResult.accent).toBe('british');
    expect(complexResult.personality).toContain('cheerful');
    expect(complexResult.personality).toContain('energetic');
    expect(complexResult.timbre).toBe('high');
    expect(complexResult.pace).toBe('fast');
    expect(complexResult.defaultEmotion.type).toBe('happy');
  });

  it('should handle Morgan Freeman-like prompt', () => {
    const morganResult = parseVoicePrompt(
      'Deep male voice, Morgan Freeman-like, wise and contemplative'
    );

    expect(morganResult.gender).toBe('male');
    expect(morganResult.timbre).toBe('deep');
    expect(morganResult.personality).toContain('wise');
    expect(morganResult.defaultEmotion.type).toBe('neutral');
  });
});