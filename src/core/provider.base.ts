import { VoiceProfile, GenerationRequest, VoiceModulation } from '../interfaces/voice.interface.js';

export abstract class VoiceProvider {
  abstract name: string;
  abstract initialize(): Promise<void>;
  abstract generateSpeech(request: GenerationRequest): Promise<Buffer>;
  abstract listVoices(): Promise<VoiceProfile[]>;
  abstract createVoiceProfile(prompt: string): Promise<VoiceProfile>;
  abstract supportsEmotions(): boolean;
  abstract supportsVoiceCloning(): boolean;
  
  protected convertToSSML(text: string, modulation?: VoiceModulation): string {
    if (!modulation) {
      return `<speak>${text}</speak>`;
    }

    let ssml = '<speak>';
    
    // Apply speed modulation
    if (modulation.speed !== 1.0) {
      ssml += `<prosody rate="${modulation.speed * 100}%">`;
    }
    
    // Apply pitch modulation
    if (modulation.pitch !== 0) {
      const pitchValue = modulation.pitch > 0 ? `+${modulation.pitch}st` : `${modulation.pitch}st`;
      ssml += `<prosody pitch="${pitchValue}">`;
    }
    
    // Apply volume modulation
    if (modulation.volume !== 1.0) {
      const volumeDb = Math.round((modulation.volume - 1) * 20); // Convert to dB
      ssml += `<prosody volume="${volumeDb}dB">`;
    }

    // Process text with emphasis and pauses
    let processedText = text;
    
    // Add emphasis
    modulation.emphasis.forEach(emphasis => {
      const word = emphasis.word;
      const strength = emphasis.strength > 0.7 ? 'strong' : emphasis.strength > 0.3 ? 'moderate' : 'reduced';
      processedText = processedText.replace(
        new RegExp(`\\b${word}\\b`, 'gi'),
        `<emphasis level="${strength}">${word}</emphasis>`
      );
    });
    
    // Add pauses
    modulation.pauses.sort((a, b) => b.position - a.position); // Sort in reverse order
    modulation.pauses.forEach(pause => {
      const pauseTime = `${pause.duration}ms`;
      processedText = 
        processedText.slice(0, pause.position) + 
        `<break time="${pauseTime}"/>` + 
        processedText.slice(pause.position);
    });

    ssml += processedText;
    
    // Close prosody tags
    if (modulation.volume !== 1.0) ssml += '</prosody>';
    if (modulation.pitch !== 0) ssml += '</prosody>';
    if (modulation.speed !== 1.0) ssml += '</prosody>';
    
    ssml += '</speak>';
    
    return ssml;
  }

  protected extractCharacteristics(voiceData: any): any {
    // Default implementation - should be overridden by providers
    return {
      gender: 'neutral',
      age: 'adult',
      accent: 'neutral',
      personality: [],
      defaultEmotion: {
        type: 'neutral',
        intensity: 0.5,
        variations: []
      },
      timbre: 'medium',
      pace: 'normal'
    };
  }
}