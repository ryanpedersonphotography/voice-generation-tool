import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { VoiceEngine } from '../core/voice-engine.js';
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
try {
  await fs.mkdir('./output', { recursive: true });
} catch (error) {
  // Directory might already exist
}

// Register tools
server.setRequestHandler('tools/list', async () => ({
  tools: [
    {
      name: 'generate_voice',
      description: 'Generate voice from text with custom characteristics',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to convert to speech' },
          voice_prompt: { type: 'string', description: 'Voice description (e.g., "Deep male voice, Morgan Freeman-like")' },
          output_format: { type: 'string', enum: ['mp3', 'wav', 'aac'], default: 'mp3' }
        },
        required: ['text']
      }
    },
    {
      name: 'list_voices',
      description: 'List all available voice profiles',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'get_capabilities',
      description: 'Get voice provider capabilities',
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
        const args = request.params.arguments as any;
        
        const audio = await engine.generateVoice({
          text: args.text,
          voicePrompt: args.voice_prompt,
          outputFormat: args.output_format || 'mp3'
        });
        
        const filename = `voice_${Date.now()}.${args.output_format || 'mp3'}`;
        const outputPath = path.join('./output', filename);
        
        await fs.writeFile(outputPath, audio);
        
        return {
          content: [{
            type: 'text',
            text: `✅ Voice generated successfully!\n\n📁 Output: ${outputPath}\n📏 Size: ${(audio.length / 1024).toFixed(1)} KB\n\n📝 Text: "${args.text}"`
          }]
        };
      }

      case 'list_voices': {
        const voices = await engine.listAvailableVoices();
        
        const voiceList = voices.map(voice => 
          `🎤 ${voice.name} (${voice.provider})`
        ).join('\n');
        
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
          return `🎛️ ${provider.toUpperCase()}: Emotions=${caps.supportsEmotions ? 'Yes' : 'No'}, Cloning=${caps.supportsVoiceCloning ? 'Yes' : 'No'}`;
        }).join('\n');
        
        return {
          content: [{
            type: 'text',
            text: `🔧 Voice Generation Capabilities:\n\n${capabilityText}`
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