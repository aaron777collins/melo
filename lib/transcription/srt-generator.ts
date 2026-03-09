/**
 * SRT Subtitle Generator
 * BDV2-US-3.4: Transcription Generation
 * 
 * Generates properly formatted SRT subtitle files from transcripts.
 */

import { TranscriptSegment, SrtEntry } from './types';

/**
 * Configuration for SRT generation
 */
export interface SrtConfig {
  maxLineWidth: number;      // Maximum characters per line
  maxWordsPerLine: number;   // Maximum words per line
  maxLinesPerEntry: number;  // Maximum lines per subtitle entry
  minDuration: number;       // Minimum subtitle duration in seconds
  maxDuration: number;       // Maximum subtitle duration in seconds
  gapBetweenEntries: number; // Minimum gap between entries in seconds
}

const DEFAULT_SRT_CONFIG: SrtConfig = {
  maxLineWidth: 42,
  maxWordsPerLine: 10,
  maxLinesPerEntry: 2,
  minDuration: 1.0,
  maxDuration: 7.0,
  gapBetweenEntries: 0.1,
};

/**
 * SRT subtitle generator with proper formatting
 */
export class SrtGenerator {
  private config: SrtConfig;

  constructor(config: Partial<SrtConfig> = {}) {
    this.config = { ...DEFAULT_SRT_CONFIG, ...config };
  }

  /**
   * Generate SRT content from transcript segments
   */
  generate(segments: TranscriptSegment[]): string {
    const entries = this.createEntries(segments);
    return this.formatSrt(entries);
  }

  /**
   * Create SRT entries from transcript segments
   * Properly segments text for readability
   */
  private createEntries(segments: TranscriptSegment[]): SrtEntry[] {
    const entries: SrtEntry[] = [];
    let entryIndex = 1;

    for (const segment of segments) {
      // Split segment into properly sized subtitle entries
      const subEntries = this.splitSegment(segment);
      
      for (const subEntry of subEntries) {
        entries.push({
          index: entryIndex++,
          startTime: this.formatTime(subEntry.start),
          endTime: this.formatTime(subEntry.end),
          text: subEntry.text,
        });
      }
    }

    return this.adjustTiming(entries);
  }

  /**
   * Split a segment into multiple subtitle entries if needed
   */
  private splitSegment(segment: TranscriptSegment): Array<{
    start: number;
    end: number;
    text: string;
  }> {
    const words = segment.words;
    if (words.length === 0) {
      return [{
        start: segment.start,
        end: segment.end,
        text: segment.text.trim(),
      }];
    }

    const entries: Array<{ start: number; end: number; text: string }> = [];
    let currentWords: typeof words = [];
    let currentLine = '';
    let lineCount = 0;
    let entryStart: number | null = null;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const wordText = word.word.trim();
      const testLine = currentLine ? `${currentLine} ${wordText}` : wordText;

      // Check if adding this word exceeds limits
      const exceedsWidth = testLine.length > this.config.maxLineWidth;
      const exceedsWords = currentWords.length >= this.config.maxWordsPerLine;

      if (exceedsWidth || exceedsWords) {
        // Start new line
        lineCount++;

        if (lineCount >= this.config.maxLinesPerEntry) {
          // Create entry with current content
          if (currentWords.length > 0) {
            entries.push({
              start: entryStart ?? currentWords[0].start,
              end: currentWords[currentWords.length - 1].end,
              text: this.formatSubtitleText(currentWords),
            });
          }
          
          // Reset for new entry
          currentWords = [word];
          currentLine = wordText;
          lineCount = 1;
          entryStart = word.start;
        } else {
          // Continue with new line in same entry
          currentWords.push(word);
          currentLine = wordText;
        }
      } else {
        // Add word to current line
        if (entryStart === null) {
          entryStart = word.start;
        }
        currentWords.push(word);
        currentLine = testLine;
      }
    }

    // Add remaining content
    if (currentWords.length > 0) {
      entries.push({
        start: entryStart ?? currentWords[0].start,
        end: currentWords[currentWords.length - 1].end,
        text: this.formatSubtitleText(currentWords),
      });
    }

    return entries;
  }

  /**
   * Format words into subtitle text with proper line breaks
   */
  private formatSubtitleText(words: Array<{ word: string }>): string {
    const lines: string[] = [];
    let currentLine = '';
    let wordCount = 0;

    for (const word of words) {
      const wordText = word.word.trim();
      const testLine = currentLine ? `${currentLine} ${wordText}` : wordText;

      if (testLine.length > this.config.maxLineWidth || 
          wordCount >= this.config.maxWordsPerLine) {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = wordText;
        wordCount = 1;
      } else {
        currentLine = testLine;
        wordCount++;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    // Limit to max lines
    return lines.slice(0, this.config.maxLinesPerEntry).join('\n');
  }

  /**
   * Adjust timing to ensure proper gaps and durations
   */
  private adjustTiming(entries: SrtEntry[]): SrtEntry[] {
    return entries.map((entry, index) => {
      const start = this.parseTime(entry.startTime);
      let end = this.parseTime(entry.endTime);

      // Ensure minimum duration
      if (end - start < this.config.minDuration) {
        end = start + this.config.minDuration;
      }

      // Ensure maximum duration
      if (end - start > this.config.maxDuration) {
        end = start + this.config.maxDuration;
      }

      // Ensure gap to next entry
      if (index < entries.length - 1) {
        const nextStart = this.parseTime(entries[index + 1].startTime);
        if (end >= nextStart - this.config.gapBetweenEntries) {
          end = nextStart - this.config.gapBetweenEntries;
        }
      }

      return {
        ...entry,
        endTime: this.formatTime(end),
      };
    });
  }

  /**
   * Format time as SRT timestamp: HH:MM:SS,mmm
   */
  formatTime(seconds: number): string {
    if (seconds < 0) seconds = 0;

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);

    return `${this.pad(hours, 2)}:${this.pad(minutes, 2)}:${this.pad(secs, 2)},${this.pad(ms, 3)}`;
  }

  /**
   * Parse SRT timestamp to seconds
   */
  parseTime(timestamp: string): number {
    const match = timestamp.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
    if (!match) return 0;

    const [, hours, minutes, seconds, ms] = match;
    return (
      parseInt(hours, 10) * 3600 +
      parseInt(minutes, 10) * 60 +
      parseInt(seconds, 10) +
      parseInt(ms, 10) / 1000
    );
  }

  /**
   * Pad a number with leading zeros
   */
  private pad(num: number, width: number): string {
    return num.toString().padStart(width, '0');
  }

  /**
   * Format entries into SRT file content
   */
  private formatSrt(entries: SrtEntry[]): string {
    return entries
      .map(entry => 
        `${entry.index}\n${entry.startTime} --> ${entry.endTime}\n${entry.text}\n`
      )
      .join('\n');
  }

  /**
   * Validate SRT content format
   */
  validateSrt(content: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const lines = content.split('\n');
    let lineIndex = 0;
    let entryCount = 0;

    while (lineIndex < lines.length) {
      // Skip empty lines
      if (lines[lineIndex].trim() === '') {
        lineIndex++;
        continue;
      }

      entryCount++;
      const indexLine = lines[lineIndex];
      
      // Check entry index
      if (!/^\d+$/.test(indexLine.trim())) {
        errors.push(`Line ${lineIndex + 1}: Invalid entry index "${indexLine}"`);
      }

      lineIndex++;
      if (lineIndex >= lines.length) {
        errors.push(`Entry ${entryCount}: Missing timestamp line`);
        break;
      }

      // Check timestamp
      const timestampLine = lines[lineIndex];
      const timestampRegex = /^\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}$/;
      if (!timestampRegex.test(timestampLine.trim())) {
        errors.push(`Line ${lineIndex + 1}: Invalid timestamp format "${timestampLine}"`);
      }

      lineIndex++;
      if (lineIndex >= lines.length) {
        errors.push(`Entry ${entryCount}: Missing text content`);
        break;
      }

      // Skip text lines until empty line
      while (lineIndex < lines.length && lines[lineIndex].trim() !== '') {
        lineIndex++;
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Generate SRT with filler words highlighted (for editor preview)
   */
  generateWithHighlights(
    segments: TranscriptSegment[],
    highlightFormat: (word: string) => string = w => `[${w}]`
  ): string {
    const highlightedSegments = segments.map(segment => ({
      ...segment,
      words: segment.words.map(word => ({
        ...word,
        word: word.isFiller ? highlightFormat(word.word) : word.word,
      })),
    }));

    return this.generate(highlightedSegments);
  }
}

// Export singleton with default config
export const srtGenerator = new SrtGenerator();

// Export factory function for custom configs
export function createSrtGenerator(config?: Partial<SrtConfig>): SrtGenerator {
  return new SrtGenerator(config);
}
