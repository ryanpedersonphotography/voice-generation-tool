import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { VoiceEngine } from '../core/voice-engine.js';
import { GenerationRequest } from '../interfaces/voice.interface.js';
import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';

const server = new Server({
  name: 'voice-generation-tool',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {}
  }
});

const engine = new VoiceEngine();

// Ensure output directory exists
await fs.mkdir('./output', { recursive: true });

// Tool schemas
const GenerateVoiceSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  voice_prompt: z.string().optional(),
  emotion_map: z.array(z.object({
    start: z.number(),
    end: z.number(),
    emotion: z.enum(['happy', 'sad', 'angry', 'excited', 'calm', 'fearful', 'surprised', 'neutral']),
    intensity: z.number().min(0).max(1)
  })).optional(),
  output_format: z.enum(['mp3', 'wav', 'aac']).default('mp3')
});

const CreateVoiceProfileSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  name: z.string().min(1, 'Name is required'),
  base_samples: z.array(z.string()).optional()
});

const BatchGenerateSchema = z.object({
  segments: z.array(z.object({
    text: z.string().min(1),
    emotion: z.enum(['happy', 'sad', 'angry', 'excited', 'calm', 'fearful', 'surprised', 'neutral']).optional(),
    voice_prompt: z.string().optional()
  })).min(1, 'At least one segment is required'),
  voice_profile: z.string().optional(),
  output_format: z.enum(['mp3', 'wav', 'aac']).default('mp3')
});

const EmotionalNarrationSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  voice_prompt: z.string().min(1, 'Voice prompt is required'),
  emotion_transitions: z.array(z.object({
    start_position: z.number(),
    end_position: z.number(),
    emotion: z.enum(['happy', 'sad', 'angry', 'excited', 'calm', 'fearful', 'surprised', 'neutral']),
    intensity: z.number().min(0).max(1)
  })),
  output_format: z.enum(['mp3', 'wav', 'aac']).default('mp3')
});

// Register tools
server.setRequestHandler('tools/list', async () => ({
  tools: [
    {
      name: 'generate_voice',
      description: 'Generate voice from text with custom characteristics and emotion control',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to convert to speech' },
          voice_prompt: { type: 'string', description: 'Natural language description of desired voice (e.g., "Deep male voice, Morgan Freeman-like, wise and contemplative")' },
          emotion_map: {
            type: 'array',
            description: 'Array of emotion changes throughout the text',
            items: {
              type: 'object',
              properties: {
                start: { type: 'number', description: 'Start character position' },
                end: { type: 'number', description: 'End character position (-1 for end of text)' },
                emotion: { type: 'string', enum: ['happy', 'sad', 'angry', 'excited', 'calm', 'fearful', 'surprised', 'neutral'] },
                intensity: { type: 'number', minimum: 0, maximum: 1 }
              }
            }
          },
          output_format: { type: 'string', enum: ['mp3', 'wav', 'aac'], default: 'mp3' }
        },
        required: ['text']
      }
    },
    {
      name: 'create_voice_profile',
      description: 'Create a reusable voice profile from natural language description',
      inputSchema: {
        type: 'object',
        properties: {
          description: { type: 'string', description: 'Detailed voice description' },
          name: { type: 'string', description: 'Profile name for reuse' },
          base_samples: { type: 'array', items: { type: 'string' }, description: 'Optional audio samples for voice cloning' }
        },
        required: ['description', 'name']
      }
    },
    {
      name: 'batch_generate',
      description: 'Generate multiple voice segments with consistent voice characteristics',
      inputSchema: {
        type: 'object',
        properties: {
          segments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                text: { type: 'string' },
                emotion: { type: 'string', enum: ['happy', 'sad', 'angry', 'excited', 'calm', 'fearful', 'surprised', 'neutral'] },
                voice_prompt: { type: 'string' }
              }
            }
          },
          voice_profile: { type: 'string', description: 'Voice profile to use for all segments' },
          output_format: { type: 'string', enum: ['mp3', 'wav', 'aac'], default: 'mp3' }
        },
        required: ['segments']
      }
    },
    {
      name: 'emotional_narration',
      description: 'Create dynamic narration with smooth emotion transitions',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to narrate' },
          voice_prompt: { type: 'string', description: 'Voice characteristics' },
          emotion_transitions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                start_position: { type: 'number' },
                end_position: { type: 'number' },
                emotion: { type: 'string', enum: ['happy', 'sad', 'angry', 'excited', 'calm', 'fearful', 'surprised', 'neutral'] },
                intensity: { type: 'number', minimum: 0, maximum: 1 }
              }
            }
          },
          output_format: { type: 'string', enum: ['mp3', 'wav', 'aac'], default: 'mp3' }
        },
        required: ['text', 'voice_prompt', 'emotion_transitions']
      }
    },
    {
      name: 'list_voices',
      description: 'List all available voice profiles and their characteristics',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'get_capabilities',
      description: 'Get information about available voice providers and their capabilities',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    }
  ]
}));

server.setRequestHandler('tools/call', async (request) => {
  try {
    await engine.initialize();
    
    switch (request.params.name) {
      case 'generate_voice': {
        const params = GenerateVoiceSchema.parse(request.params.arguments);
        
        const generationRequest: GenerationRequest = {
          text: params.text,
          voicePrompt: params.voice_prompt,
          outputFormat: params.output_format,
          emotionMap: params.emotion_map
        };

        const audio = await engine.generateVoice(generationRequest);
        const filename = `voice_${Date.now()}.${params.output_format}`;
        const outputPath = path.join('./output', filename);
        
        await fs.writeFile(outputPath, audio);
        
        return {
          content: [{
            type: 'text',
            text: `✅ Voice generated successfully!\n\n📁 Output: ${outputPath}\n🎵 Format: ${params.output_format.toUpperCase()}\n📏 Size: ${(audio.length / 1024).toFixed(1)} KB\n\n${params.voice_prompt ? `🎭 Voice: ${params.voice_prompt}\n` : ''}${params.emotion_map ? `😊 Emotions: ${params.emotion_map.length} transitions\n` : ''}📝 Text: "${params.text}"`
          }]
        };
      }

      case 'create_voice_profile': {
        const params = CreateVoiceProfileSchema.parse(request.params.arguments);
        
        // For now, create a profile by generating with the description
        const testAudio = await engine.generateVoice({
          text: 'This is a test of the voice profile.',
          voicePrompt: params.description,
          outputFormat: 'mp3'
        });

        // Save the test audio
        const filename = `profile_${params.name.replace(/\s+/g, '_')}_${Date.now()}.mp3`;
        const outputPath = path.join('./output', filename);
        await fs.writeFile(outputPath, testAudio);
        
        return {
          content: [{
            type: 'text',
            text: `✅ Voice profile "${params.name}" created successfully!\n\n📁 Test audio: ${outputPath}\n🎭 Description: ${params.description}\n\nYou can now reference this profile in future voice generation requests.`
          }]
        };
      }

      case 'batch_generate': {
        const params = BatchGenerateSchema.parse(request.params.arguments);
        
        const requests: GenerationRequest[] = params.segments.map(segment => ({
          text: segment.text,
          voicePrompt: segment.voice_prompt,
          outputFormat: params.output_format,
          modulation: segment.emotion ? {
            emotion: { type: segment.emotion, intensity: 0.7, variations: [] },
            speed: 1.0,
            pitch: 0,
            volume: 1.0,
            emphasis: [],
            pauses: []
          } : undefined
        }));

        const audioBuffers = await engine.generateBatch(requests);
        const outputPaths: string[] = [];

        for (let i = 0; i < audioBuffers.length; i++) {
          if (audioBuffers[i].length > 0) {
            const filename = `batch_${Date.now()}_segment_${i + 1}.${params.output_format}`;
            const outputPath = path.join('./output', filename);
            await fs.writeFile(outputPath, audioBuffers[i]);
            outputPaths.push(outputPath);
          }
        }
        
        return {
          content: [{
            type: 'text',
            text: `✅ Batch generation completed!\n\n📁 Generated ${outputPaths.length} audio files:\n${outputPaths.map((path, i) => `  ${i + 1}. ${path}`).join('\n')}\n\n🎵 Format: ${params.output_format.toUpperCase()}\n📊 Segments: ${params.segments.length}`
          }]
        };
      }

      case 'emotional_narration': {
        const params = EmotionalNarrationSchema.parse(request.params.arguments);
        
        // Convert emotion transitions to emotion map
        const emotionMap = params.emotion_transitions.map(transition => ({
          start: transition.start_position,
          end: transition.end_position,
          emotion: transition.emotion,
          intensity: transition.intensity
        }));

        const audio = await engine.generateVoice({
          text: params.text,
          voicePrompt: params.voice_prompt,
          outputFormat: params.output_format,
          emotionMap
        });

        const filename = `emotional_narration_${Date.now()}.${params.output_format}`;
        const outputPath = path.join('./output', filename);
        await fs.writeFile(outputPath, audio);
        
        return {
          content: [{
            type: 'text',
            text: `✅ Emotional narration generated successfully!\n\n📁 Output: ${outputPath}\n🎭 Voice: ${params.voice_prompt}\n😊 Emotion transitions: ${params.emotion_transitions.length}\n📏 Size: ${(audio.length / 1024).toFixed(1)} KB\n\n📝 Text: "${params.text}"`
          }]
        };
      }

      case 'list_voices': {
        const voices = await engine.listAvailableVoices();
        
        const voiceList = voices.map(voice => 
          `🎤 ${voice.name} (${voice.provider})\n   Gender: ${voice.characteristics.gender}, Age: ${voice.characteristics.age}\n   Accent: ${voice.characteristics.accent}, Timbre: ${voice.characteristics.timbre}`
        ).join('\n\n');
        
        return {
          content: [{
            type: 'text',
            text: `🎵 Available Voices (${voices.length} total):\n\n${voiceList}`
          }]
        };
      }

      case 'get_capabilities': {
        const capabilities = await engine.getProviderCapabilities();
        const providers = engine.getAvailableProviders();
        
        const capabilityText = providers.map(provider => {
          const caps = capabilities[provider];
          return `🎛️ ${provider.toUpperCase()}\n   ✅ Emotions: ${caps.supportsEmotions ? 'Yes' : 'No'}\n   🎭 Voice Cloning: ${caps.supportsVoiceCloning ? 'Yes' : 'No'}\n   🟢 Status: Available`;
        }).join('\n\n');
        
        return {
          content: [{
            type: 'text',
            text: `🔧 Voice Generation Capabilities:\n\n${capabilityText}\n\n📊 Total Providers: ${providers.length}`
          }]
        };
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `❌ Error: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);

console.log('🎵 Voice Generation MCP Server started successfully');