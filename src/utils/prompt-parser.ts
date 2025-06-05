import { VoiceCharacteristics, EmotionType } from '../interfaces/voice.interface.js';

export function parseVoicePrompt(prompt: string): VoiceCharacteristics {
  const lowerPrompt = prompt.toLowerCase();
  
  // Extract gender
  let gender: 'male' | 'female' | 'neutral' = 'neutral';
  if (lowerPrompt.includes('male') && !lowerPrompt.includes('female')) gender = 'male';
  if (lowerPrompt.includes('female')) gender = 'female';
  if (lowerPrompt.includes('woman')) gender = 'female';
  if (lowerPrompt.includes('man') && !lowerPrompt.includes('woman')) gender = 'male';
  
  // Extract age
  let age: 'child' | 'young' | 'adult' | 'senior' = 'adult';
  if (lowerPrompt.includes('child') || lowerPrompt.includes('kid')) age = 'child';
  if (lowerPrompt.includes('young') || lowerPrompt.includes('teen')) age = 'young';
  if (lowerPrompt.includes('old') || lowerPrompt.includes('senior') || lowerPrompt.includes('elderly')) age = 'senior';
  
  // Extract accent
  let accent = 'neutral';
  const accents = {
    'australian': ['australian', 'aussie'],
    'british': ['british', 'uk', 'english', 'london'],
    'american': ['american', 'us', 'usa'],
    'irish': ['irish', 'ireland'],
    'scottish': ['scottish', 'scotland'],
    'southern': ['southern', 'texan', 'georgia'],
    'new york': ['new york', 'brooklyn', 'bronx'],
    'california': ['california', 'valley', 'surfer']
  };
  
  for (const [accentName, keywords] of Object.entries(accents)) {
    if (keywords.some(keyword => lowerPrompt.includes(keyword))) {
      accent = accentName;
      break;
    }
  }
  
  // Extract personality traits
  const personality: string[] = [];
  const personalityMap = {
    'cheerful': ['cheerful', 'happy', 'joyful', 'upbeat'],
    'calm': ['calm', 'peaceful', 'serene', 'relaxed', 'soothing'],
    'energetic': ['energetic', 'excited', 'dynamic', 'lively'],
    'wise': ['wise', 'contemplative', 'thoughtful', 'sage'],
    'friendly': ['friendly', 'warm', 'welcoming', 'kind'],
    'professional': ['professional', 'business', 'corporate', 'formal'],
    'dramatic': ['dramatic', 'theatrical', 'expressive'],
    'mysterious': ['mysterious', 'enigmatic', 'secretive'],
    'confident': ['confident', 'assertive', 'strong'],
    'gentle': ['gentle', 'soft', 'tender', 'caring']
  };
  
  for (const [trait, keywords] of Object.entries(personalityMap)) {
    if (keywords.some(keyword => lowerPrompt.includes(keyword))) {
      personality.push(trait);
    }
  }
  
  // Extract timbre
  let timbre: 'deep' | 'medium' | 'high' = 'medium';
  if (lowerPrompt.includes('deep') || lowerPrompt.includes('low') || lowerPrompt.includes('bass')) {
    timbre = 'deep';
  } else if (lowerPrompt.includes('high') || lowerPrompt.includes('light') || lowerPrompt.includes('soprano')) {
    timbre = 'high';
  }
  
  // Extract pace
  let pace: 'slow' | 'normal' | 'fast' = 'normal';
  if (lowerPrompt.includes('slow') || lowerPrompt.includes('relaxed') || lowerPrompt.includes('leisurely')) {
    pace = 'slow';
  } else if (lowerPrompt.includes('fast') || lowerPrompt.includes('quick') || lowerPrompt.includes('rapid')) {
    pace = 'fast';
  }
  
  // Determine default emotion based on personality
  let defaultEmotionType: EmotionType = 'neutral';
  if (personality.includes('cheerful')) defaultEmotionType = 'happy';
  else if (personality.includes('calm')) defaultEmotionType = 'calm';
  else if (personality.includes('energetic')) defaultEmotionType = 'excited';
  else if (personality.includes('dramatic')) defaultEmotionType = 'excited';
  
  return {
    gender,
    age,
    accent,
    personality,
    defaultEmotion: {
      type: defaultEmotionType,
      intensity: 0.5,
      variations: []
    },
    timbre,
    pace
  };
}