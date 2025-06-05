# Voice Generation Tool

A sophisticated voice generation tool that creates custom voices from text prompts with advanced emotion control, multi-character conversations, and flexible integration capabilities.

[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue?logo=github)](https://github.com/ryanpedersonphotography/voice-generation-tool)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-75%2B%20passing-green)](./tests/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](./LICENSE)

## 🎵 Features

### Core Capabilities
- **Multi-Provider Support**: ElevenLabs, OpenAI TTS (Google Cloud TTS, Amazon Polly planned)
- **Custom Voice Creation**: Generate voices from natural language descriptions
- **Emotion Control**: Dynamic emotion mapping and smooth transitions throughout text
- **Multi-Character Conversations**: Generate dialogues with distinct character voices
- **Advanced SSML Generation**: Sophisticated markup with prosody controls
- **Batch Processing**: Generate multiple audio segments efficiently
- **Multiple Formats**: MP3, WAV, AAC output support

### Integration & Development
- **MCP Integration**: Model Context Protocol server for Claude Desktop
- **CLI Interface**: Command-line tool for quick generation
- **TypeScript**: Full type safety and modern development
- **Comprehensive Testing**: 75+ tests with emotion transitions and conversation validation

## 🚀 Quick Start

### 1. Installation

```bash
# Clone or create the project
cd voice-generation-tool

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Add your API keys to .env
# ELEVENLABS_API_KEY=sk_your_key_here
# OPENAI_API_KEY=sk-your_key_here
```

### 2. Basic Usage

```bash
# Generate basic voice
npm run generate -- "Hello world!" --voice "Deep male voice, Morgan Freeman-like"

# Generate with emotion
npm run generate -- "I'm so excited!" --emotion excited --intensity 0.9

# List available voices
npm run generate -- --list-voices

# Show capabilities
npm run generate -- --capabilities
```

### 3. Programmatic Usage

```typescript
import { VoiceEngine } from './src/core/voice-engine.js';

const engine = new VoiceEngine();
await engine.initialize();

const audio = await engine.generateVoice({
  text: 'Hello, this is a test of the voice generation system.',
  voicePrompt: 'Young female voice, cheerful and energetic',
  outputFormat: 'mp3'
});
```

## 📖 Usage Examples

### Multi-Character Conversations (NEW in Phase 2)

```typescript
import { ConversationManager } from './src/core/conversation-manager.js';

const conversationManager = new ConversationManager();

// Generate a dialogue between characters
const script = `
  Alice: Hey Bob, how's the project going?
  Bob [excited]: It's amazing! We just finished the voice system.
  Alice [curious]: Really? Tell me more about it.
  Bob [explaining]: We can now do emotion transitions and multi-character dialogues!
`;

const result = await conversationManager.generateConversation(script, {
  characters: [
    {
      id: 'alice',
      name: 'Alice',
      voiceProfile: { provider: 'elevenlabs', voiceId: 'alice-voice' },
      personality: { traits: ['friendly', 'curious'], speakingStyle: 'conversational' }
    },
    {
      id: 'bob', 
      name: 'Bob',
      voiceProfile: { provider: 'elevenlabs', voiceId: 'bob-voice' },
      personality: { traits: ['enthusiastic', 'technical'], speakingStyle: 'excited' }
    }
  ]
});
```

### Emotion Transitions (NEW in Phase 2)

```typescript
import { EmotionTransitionEngine } from './src/core/emotion-transition-engine.js';

const transitionEngine = new EmotionTransitionEngine();

// Smooth emotion changes during speech
await engine.generateVoice({
  text: "I started calm, but then became really excited about this breakthrough!",
  emotionTransitions: [
    {
      fromEmotion: { primary: 'calm', intensity: 0.6 },
      toEmotion: { primary: 'excited', intensity: 0.9 },
      duration: 2000,
      curve: 'ease-in',
      triggers: { word: 'excited' }
    }
  ]
});
```

### Advanced SSML Generation (NEW in Phase 2)

```typescript
import { SSMLGenerator } from './src/utils/ssml-generator.js';

const ssmlGenerator = new SSMLGenerator();

// Generate sophisticated SSML with prosody controls
const ssml = ssmlGenerator.generateSSML(
  "This is *really* important information!",
  character,
  { primary: 'serious', intensity: 0.8 }
);
// Output includes emphasis, breaks, and emotion-aware prosody
```

### Voice Customization

```typescript
// Create voice from natural language description
await engine.generateVoice({
  text: 'Welcome to our podcast',
  voicePrompt: 'Professional female podcaster, warm and friendly, slight American accent',
  outputFormat: 'mp3'
});
```

### Emotion Control

```typescript
// Single emotion
await engine.generateVoice({
  text: 'This is amazing news!',
  modulation: {
    emotion: { type: 'excited', intensity: 0.8 },
    speed: 1.2,
    pitch: 3
  }
});

// Dynamic emotion changes
await engine.generateVoice({
  text: 'The story begins peacefully. Suddenly, danger appears! Then everything calms down.',
  emotionMap: [
    { start: 0, end: 25, emotion: 'calm', intensity: 0.6 },
    { start: 26, end: 50, emotion: 'fearful', intensity: 0.9 },
    { start: 51, end: -1, emotion: 'calm', intensity: 0.7 }
  ]
});
```

### Batch Generation

```typescript
const segments = [
  { text: 'Introduction', voicePrompt: 'Professional narrator' },
  { text: 'Main content', voicePrompt: 'Enthusiastic presenter' },
  { text: 'Conclusion', voicePrompt: 'Calm summarizer' }
];

const audioFiles = await engine.generateBatch(segments);
```

## 🛠 MCP Integration

The tool includes a Model Context Protocol server for integration with Claude Desktop.

### Setup MCP Server

```bash
# Build the project
npm run build

# Start MCP server
npm run mcp
```

### Claude Desktop Configuration

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "voice-generation-tool": {
      "command": "node",
      "args": ["/path/to/voice-generation-tool/dist/mcp/server.js"],
      "description": "Advanced voice generation with emotion control"
    }
  }
}
```

### Available MCP Tools

- `generate_voice`: Generate voice with custom characteristics
- `create_voice_profile`: Create reusable voice profiles
- `batch_generate`: Generate multiple segments
- `emotional_narration`: Dynamic emotion transitions
- `list_voices`: Show available voices
- `get_capabilities`: Provider information

## 🎭 Voice Prompt Examples

### Character Voices

```typescript
// Narrator voices
"Deep male voice, Morgan Freeman-like, wise and contemplative"
"Professional female broadcaster, clear American accent, authoritative"
"Warm storyteller, middle-aged, gentle and engaging"

// Character voices
"Young energetic female, valley girl accent, bubbly personality"
"Gruff old sailor, weathered voice, slight British accent"
"Mysterious villain, deep and menacing, theatrical delivery"

// Specific use cases
"Meditation guide, soothing female voice, very calm and peaceful"
"Sports announcer, excited male voice, fast-paced delivery"
"Children's book narrator, friendly and animated, clear pronunciation"
```

### Emotion Mapping

```typescript
// Tutorial with varying engagement
{
  text: "Welcome to the lesson. Now let's dive into the exciting part! Finally, let's review what we learned.",
  emotionMap: [
    { start: 0, end: 20, emotion: 'calm', intensity: 0.6 },      // Welcome
    { start: 21, end: 55, emotion: 'excited', intensity: 0.8 },  // Exciting part
    { start: 56, end: -1, emotion: 'neutral', intensity: 0.5 }   // Review
  ]
}
```

## 🔧 Development

### Project Structure

```
voice-generation-tool/
├── src/
│   ├── core/           # Core engine and base classes
│   ├── providers/      # Voice provider implementations
│   ├── interfaces/     # TypeScript interfaces
│   ├── utils/          # Utilities and helpers
│   ├── mcp/           # MCP server implementation
│   └── api/           # REST API (future)
├── tests/             # Test suites
├── examples/          # Usage examples
├── docs/             # Documentation
└── output/           # Generated audio files
```

### Running Tests

```bash
npm test                 # Run all tests
npm run test:coverage   # Run with coverage
npm run test -- voice-engine.test.ts  # Run specific test
```

### Building

```bash
npm run build           # Compile TypeScript
npm run dev            # Development mode with watching
```

## 🎯 Voice Providers

### ElevenLabs
- ✅ Emotion control
- ✅ Voice cloning
- ✅ High quality synthesis
- 🎭 Best for: Character voices, emotional content

### OpenAI TTS
- ❌ Limited emotion control
- ❌ No voice cloning
- ✅ Reliable and fast
- 🎭 Best for: General narration, consistent quality

### Google Cloud TTS (Planned)
- ✅ 300+ voices
- ✅ SSML support
- ✅ Multiple languages
- 🎭 Best for: Multilingual content

### Amazon Polly (Planned)
- ✅ Neural voices
- ✅ Custom lexicons
- ✅ Speech marks
- 🎭 Best for: Long-form content

## 📊 Performance

- Voice generation: <2 seconds for 30-second audio
- Batch processing: Parallel generation support
- Memory usage: Optimized for large batches
- Caching: Audio processing cache for efficiency

## 🔐 Security

- API keys stored in environment variables
- No logging of sensitive data
- Audio files stored locally only
- Optional cleanup of temporary files

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Troubleshooting

### Common Issues

**No providers available**: Check your `.env` file has valid API keys.

**Audio quality issues**: Try different providers or adjust emotion intensity.

**Large file sizes**: Use MP3 format and consider shorter segments.

**MCP connection issues**: Ensure the server is built and path is correct.

### Debug Mode

```bash
LOG_LEVEL=debug npm run generate -- "test text"
```

## 🚀 Development Status

### ✅ Phase 1: Foundation (COMPLETED)
- Multi-provider voice synthesis system
- Natural language voice prompt parsing  
- Dynamic emotion control system
- Professional audio processing
- CLI interface and MCP server integration

### ✅ Phase 2: Advanced Features (COMPLETED)
- Multi-character conversation system
- Smooth emotion transitions during speech
- Advanced SSML generation with prosody controls
- Character voice management and dialogue parsing
- Audio mixing for multi-track conversations

### 🔄 Upcoming Features (Phase 3-5)
- [ ] Video timeline integration and synchronization
- [ ] Real-time voice generation and modulation
- [ ] Voice style transfer capabilities  
- [ ] REST API with WebSocket support
- [ ] Performance optimization and caching
- [ ] Custom voice training and cloning enhancements

---

Built with ❤️ for advanced voice generation workflows.