import { DialogueParseResult, ParsedDialogueLine } from '../interfaces/conversation.interface.js';

export class DialogueParser {
  /**
   * Parse script text into structured dialogue format
   */
  parseScript(script: string): DialogueParseResult {
    const lines = script.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Detect format type
    const formatType = this.detectScriptFormat(script);
    
    console.log(`📜 Detected script format: ${formatType}`);
    
    switch (formatType) {
      case 'screenplay':
        return this.parseScreenplay(lines);
      case 'script':
        return this.parsePlayScript(lines);
      case 'novel':
        return this.parseNovelDialogue(lines);
      case 'chat':
        return this.parseChatFormat(lines);
      default:
        return this.parsePlayScript(lines); // Default fallback
    }
  }

  /**
   * Detect the format of the script
   */
  private detectScriptFormat(script: string): 'script' | 'novel' | 'chat' | 'screenplay' {
    const text = script.toLowerCase();
    
    // Check for screenplay format indicators
    if (text.includes('fade in:') || text.includes('int.') || text.includes('ext.') || 
        /^\s*[A-Z\s]+\n\s*\(/m.test(script)) {
      return 'screenplay';
    }
    
    // Check for chat format (NAME: message)
    if (/^\w+:\s+/m.test(script) && script.split('\n').filter(line => /^\w+:\s+/.test(line)).length > 2) {
      return 'chat';
    }
    
    // Check for novel format (dialogue in quotes)
    if (text.includes('"') && text.includes('said') && text.includes('replied')) {
      return 'novel';
    }
    
    // Default to script format
    return 'script';
  }

  /**
   * Parse screenplay format
   * Example:
   * CHARACTER NAME
   *     (emotion or action)
   * Dialogue text here
   */
  private parseScreenplay(lines: string[]): DialogueParseResult {
    const characters = new Set<string>();
    const parsedLines: ParsedDialogueLine[] = [];
    
    let currentCharacter = '';
    let lineNumber = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      lineNumber++;
      
      // Skip scene headers and action lines
      if (line.match(/^(FADE|INT\.|EXT\.|CUT TO|DISSOLVE)/i)) {
        continue;
      }
      
      // Character name (all caps, centered or left-aligned)
      if (line.match(/^[A-Z\s]{2,}$/) && !line.includes('.') && line.length < 30) {
        currentCharacter = line.trim();
        characters.add(currentCharacter);
        continue;
      }
      
      // Parenthetical (emotion/action)
      if (line.match(/^\s*\([^)]+\)\s*$/)) {
        const emotion = this.extractEmotionFromParenthetical(line);
        // Store emotion for next dialogue line
        continue;
      }
      
      // Dialogue line
      if (currentCharacter && line.length > 0 && !line.match(/^[A-Z\s]{2,}$/)) {
        parsedLines.push({
          character: currentCharacter,
          text: line.trim(),
          emotion: this.extractImpliedEmotion(line),
          line_number: lineNumber
        });
      }
    }
    
    return {
      characters,
      lines: parsedLines,
      formatType: 'screenplay'
    };
  }

  /**
   * Parse play script format
   * Example:
   * CHARACTER: Dialogue text here
   * ANOTHER: More dialogue
   */
  private parsePlayScript(lines: string[]): DialogueParseResult {
    const characters = new Set<string>();
    const parsedLines: ParsedDialogueLine[] = [];
    
    let lineNumber = 0;
    
    for (const line of lines) {
      lineNumber++;
      
      // Skip stage directions (usually in brackets or parentheses)
      if (line.match(/^\s*[\[\(].*[\]\)]\s*$/)) {
        continue;
      }
      
      // Character dialogue format: "CHARACTER: dialogue"
      const dialogueMatch = line.match(/^([A-Z\s]+):\s*(.+)$/i);
      if (dialogueMatch) {
        const character = dialogueMatch[1].trim().toUpperCase();
        const text = dialogueMatch[2].trim();
        
        characters.add(character);
        parsedLines.push({
          character,
          text,
          emotion: this.extractImpliedEmotion(text),
          line_number: lineNumber
        });
        continue;
      }
      
      // Alternative format: Character name on its own line, dialogue follows
      const characterMatch = line.match(/^([A-Z\s]{2,})$/);
      if (characterMatch && lines[lineNumber] && !lines[lineNumber].match(/^[A-Z\s]+:/) && !lines[lineNumber].match(/^[A-Z\s]{2,}$/)) {
        const character = characterMatch[1].trim();
        const nextLine = lines[lineNumber];
        
        if (nextLine) {
          characters.add(character);
          parsedLines.push({
            character,
            text: nextLine.trim(),
            emotion: this.extractImpliedEmotion(nextLine),
            line_number: lineNumber + 1
          });
        }
      }
    }
    
    return {
      characters,
      lines: parsedLines,
      formatType: 'script'
    };
  }

  /**
   * Parse novel dialogue format
   * Example:
   * "Hello there," said John with excitement.
   * "How are you?" Mary replied nervously.
   */
  private parseNovelDialogue(lines: string[]): DialogueParseResult {
    const characters = new Set<string>();
    const parsedLines: ParsedDialogueLine[] = [];
    
    let lineNumber = 0;
    
    for (const line of lines) {
      lineNumber++;
      
      // Match quoted dialogue with attribution
      const dialoguePattern = /"([^"]+)"\s*,?\s*(\w+)\s+(said|replied|asked|exclaimed|whispered|shouted|muttered|declared)(\s+(\w+ly))?/gi;
      let match;
      
      while ((match = dialoguePattern.exec(line)) !== null) {
        const text = match[1];
        const character = this.normalizeCharacterName(match[2]);
        const verb = match[3];
        const adverb = match[5];
        
        characters.add(character);
        
        const emotion = this.extractEmotionFromDialogueTag(verb, adverb) || this.extractImpliedEmotion(text);
        
        parsedLines.push({
          character,
          text,
          emotion,
          line_number: lineNumber
        });
      }
      
      // Also check for simple quoted dialogue without attribution
      const simpleQuotePattern = /"([^"]+)"/g;
      let quoteMatch;
      
      while ((quoteMatch = simpleQuotePattern.exec(line)) !== null) {
        // Only if we haven't already processed this quote
        if (!parsedLines.some(pl => pl.text === quoteMatch![1] && pl.line_number === lineNumber)) {
          parsedLines.push({
            character: 'UNKNOWN_SPEAKER',
            text: quoteMatch[1],
            emotion: this.extractImpliedEmotion(quoteMatch[1]),
            line_number: lineNumber
          });
        }
      }
    }
    
    return {
      characters,
      lines: parsedLines,
      formatType: 'novel'
    };
  }

  /**
   * Parse chat format
   * Example:
   * Alice: Hey, how's it going?
   * Bob: Pretty good! How about you?
   */
  private parseChatFormat(lines: string[]): DialogueParseResult {
    const characters = new Set<string>();
    const parsedLines: ParsedDialogueLine[] = [];
    
    let lineNumber = 0;
    
    for (const line of lines) {
      lineNumber++;
      
      // Match chat format: "Name: message"
      const chatMatch = line.match(/^(\w+):\s*(.+)$/);
      if (chatMatch) {
        const character = this.normalizeCharacterName(chatMatch[1]);
        const text = chatMatch[2].trim();
        
        characters.add(character);
        parsedLines.push({
          character,
          text,
          emotion: this.extractImpliedEmotion(text),
          line_number: lineNumber
        });
      }
    }
    
    return {
      characters,
      lines: parsedLines,
      formatType: 'chat'
    };
  }

  /**
   * Extract emotion from parenthetical stage direction
   */
  private extractEmotionFromParenthetical(parenthetical: string): string | undefined {
    const text = parenthetical.toLowerCase().replace(/[()]/g, '');
    
    // Common emotional states in parentheticals
    const emotionMap: Record<string, string> = {
      'angry': 'angry',
      'angrily': 'angry',
      'furious': 'angry',
      'mad': 'angry',
      'happy': 'happy',
      'happily': 'happy',
      'joyful': 'happy',
      'excited': 'excited',
      'excitedly': 'excited',
      'enthusiastic': 'excited',
      'sad': 'sad',
      'sadly': 'sad',
      'mournful': 'sad',
      'depressed': 'sad',
      'calm': 'calm',
      'calmly': 'calm',
      'peaceful': 'calm',
      'nervous': 'fearful',
      'nervously': 'fearful',
      'scared': 'fearful',
      'afraid': 'fearful',
      'surprised': 'surprised',
      'shocked': 'surprised',
      'amazed': 'surprised'
    };
    
    for (const [key, emotion] of Object.entries(emotionMap)) {
      if (text.includes(key)) {
        return emotion;
      }
    }
    
    return undefined;
  }

  /**
   * Extract emotion from dialogue tag (verb and adverb)
   */
  private extractEmotionFromDialogueTag(verb: string, adverb?: string): string | undefined {
    const verbEmotions: Record<string, string> = {
      'shouted': 'angry',
      'yelled': 'angry',
      'screamed': 'angry',
      'whispered': 'calm',
      'muttered': 'sad',
      'exclaimed': 'excited',
      'laughed': 'happy',
      'cried': 'sad',
      'sobbed': 'sad'
    };
    
    const adverbEmotions: Record<string, string> = {
      'angrily': 'angry',
      'furiously': 'angry',
      'happily': 'happy',
      'joyfully': 'happy',
      'sadly': 'sad',
      'nervously': 'fearful',
      'excitedly': 'excited',
      'calmly': 'calm',
      'quietly': 'calm'
    };
    
    if (adverb && adverbEmotions[adverb]) {
      return adverbEmotions[adverb];
    }
    
    if (verbEmotions[verb]) {
      return verbEmotions[verb];
    }
    
    return undefined;
  }

  /**
   * Extract implied emotion from dialogue text
   */
  private extractImpliedEmotion(text: string): string | undefined {
    const lowerText = text.toLowerCase();
    
    // Exclamation and question patterns
    if (text.includes('!') || lowerText.includes('wow') || lowerText.includes('amazing')) {
      return 'excited';
    }
    
    if (text.includes('?') && (lowerText.includes('what') || lowerText.includes('how') || lowerText.includes('why'))) {
      return 'surprised';
    }
    
    // Emotional keywords
    if (lowerText.includes('hate') || lowerText.includes('angry') || lowerText.includes('mad')) {
      return 'angry';
    }
    
    if (lowerText.includes('love') || lowerText.includes('happy') || lowerText.includes('great')) {
      return 'happy';
    }
    
    if (lowerText.includes('sad') || lowerText.includes('sorry') || lowerText.includes('terrible')) {
      return 'sad';
    }
    
    if (lowerText.includes('scared') || lowerText.includes('afraid') || lowerText.includes('worried')) {
      return 'fearful';
    }
    
    // Punctuation patterns
    if (text.endsWith('...')) {
      return 'sad';
    }
    
    if (text.includes('!!!') || (text.match(/!/g) || []).length > 1) {
      return 'excited';
    }
    
    return undefined;
  }

  /**
   * Normalize character names to consistent format
   */
  private normalizeCharacterName(name: string): string {
    return name.trim().toUpperCase().replace(/\s+/g, '_');
  }

  /**
   * Parse complex dialogue with stage directions
   */
  parseComplexDialogue(script: string): DialogueParseResult {
    // First, remove common stage directions and formatting
    const cleanedScript = script
      .replace(/^\s*\[.*?\]\s*$/gm, '') // Remove bracketed stage directions
      .replace(/^\s*\(.*?\)\s*$/gm, '') // Remove parenthetical stage directions on their own lines
      .replace(/\*\*.*?\*\*/g, '') // Remove bold formatting
      .replace(/\*.*?\*/g, '') // Remove italic formatting
      .replace(/_{2,}/g, '') // Remove underlines
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    return this.parseScript(cleanedScript);
  }

  /**
   * Extract character list from script
   */
  extractCharacters(script: string): string[] {
    const result = this.parseScript(script);
    return Array.from(result.characters);
  }

  /**
   * Validate parsed dialogue
   */
  validateParsedDialogue(result: DialogueParseResult): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (result.characters.size === 0) {
      errors.push('No characters found in script');
    }
    
    if (result.lines.length === 0) {
      errors.push('No dialogue lines found in script');
    }
    
    // Check for unnamed speakers
    const unnamedLines = result.lines.filter(line => 
      line.character === 'UNKNOWN_SPEAKER' || line.character === '');
    
    if (unnamedLines.length > 0) {
      errors.push(`${unnamedLines.length} dialogue lines have unknown speakers`);
    }
    
    // Check for very short dialogue
    const shortLines = result.lines.filter(line => line.text.trim().length < 3);
    if (shortLines.length > result.lines.length * 0.5) {
      errors.push('Many dialogue lines are very short - parsing may be incorrect');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get dialogue statistics
   */
  getDialogueStatistics(result: DialogueParseResult): {
    characterCount: number;
    lineCount: number;
    averageLineLength: number;
    wordCount: number;
    mostActiveCharacter: string;
  } {
    const characterLineCounts = new Map<string, number>();
    let totalWords = 0;
    let totalChars = 0;
    
    for (const line of result.lines) {
      characterLineCounts.set(line.character, (characterLineCounts.get(line.character) || 0) + 1);
      totalWords += line.text.split(/\s+/).length;
      totalChars += line.text.length;
    }
    
    let mostActiveCharacter = '';
    let maxLines = 0;
    
    for (const [character, count] of characterLineCounts) {
      if (count > maxLines) {
        maxLines = count;
        mostActiveCharacter = character;
      }
    }
    
    return {
      characterCount: result.characters.size,
      lineCount: result.lines.length,
      averageLineLength: result.lines.length > 0 ? totalChars / result.lines.length : 0,
      wordCount: totalWords,
      mostActiveCharacter
    };
  }
}