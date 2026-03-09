/**
 * Filler Word Detection
 * BDV2-US-3.4: Transcription Generation
 * 
 * Detects and flags filler words in transcripts.
 */

import {
  TranscriptWord,
  TranscriptSegment,
  FillerWordSummary,
  DEFAULT_FILLER_WORDS,
} from './types';

/**
 * Filler word detector with configurable word list
 */
export class FillerWordDetector {
  private fillerWords: Set<string>;
  private multiWordFillers: string[];

  constructor(fillerWords: string[] = DEFAULT_FILLER_WORDS) {
    // Separate single-word and multi-word fillers
    this.multiWordFillers = fillerWords
      .filter(w => w.includes(' '))
      .map(w => w.toLowerCase());
    
    this.fillerWords = new Set(
      fillerWords
        .filter(w => !w.includes(' '))
        .map(w => w.toLowerCase())
    );
  }

  /**
   * Check if a single word is a filler word
   */
  isFiller(word: string): boolean {
    const normalized = this.normalizeWord(word);
    return this.fillerWords.has(normalized);
  }

  /**
   * Normalize a word for comparison
   */
  private normalizeWord(word: string): string {
    // Remove punctuation and convert to lowercase
    return word.toLowerCase().replace(/[.,!?;:'"()-]/g, '').trim();
  }

  /**
   * Process an array of transcript words and mark fillers
   */
  markFillers(words: TranscriptWord[]): TranscriptWord[] {
    return words.map(word => ({
      ...word,
      isFiller: this.isFiller(word.word),
    }));
  }

  /**
   * Process segments and mark filler words within them
   */
  processSegments(segments: TranscriptSegment[]): TranscriptSegment[] {
    return segments.map(segment => {
      const markedWords = this.markFillers(segment.words);
      
      // Also check for multi-word fillers in the full text
      let text = segment.text;
      for (const multiWord of this.multiWordFillers) {
        const regex = new RegExp(`\\b${multiWord}\\b`, 'gi');
        if (regex.test(text)) {
          // Mark individual words that are part of multi-word fillers
          // This is more complex - we'd need to analyze word sequences
        }
      }

      return {
        ...segment,
        words: markedWords,
      };
    });
  }

  /**
   * Generate summary of filler words in a transcript
   */
  generateSummary(segments: TranscriptSegment[]): FillerWordSummary[] {
    const fillerCounts = new Map<string, { count: number; timestamps: number[] }>();

    for (const segment of segments) {
      for (const word of segment.words) {
        if (word.isFiller) {
          const normalized = this.normalizeWord(word.word);
          const existing = fillerCounts.get(normalized);
          
          if (existing) {
            existing.count++;
            existing.timestamps.push(word.start);
          } else {
            fillerCounts.set(normalized, {
              count: 1,
              timestamps: [word.start],
            });
          }
        }
      }
    }

    // Convert to array and sort by count (descending)
    return Array.from(fillerCounts.entries())
      .map(([word, data]) => ({
        word,
        count: data.count,
        timestamps: data.timestamps.sort((a, b) => a - b),
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get total count of filler words
   */
  countFillers(segments: TranscriptSegment[]): number {
    return segments.reduce((total, segment) => {
      return total + segment.words.filter(w => w.isFiller).length;
    }, 0);
  }

  /**
   * Calculate filler word rate (fillers per minute)
   */
  getFillerRate(segments: TranscriptSegment[], durationSeconds: number): number {
    if (durationSeconds === 0) return 0;
    
    const fillerCount = this.countFillers(segments);
    const durationMinutes = durationSeconds / 60;
    
    return Math.round((fillerCount / durationMinutes) * 100) / 100;
  }

  /**
   * Get timestamps of all filler words for editor highlighting
   */
  getFillerTimestamps(segments: TranscriptSegment[]): Array<{
    word: string;
    start: number;
    end: number;
  }> {
    const timestamps: Array<{ word: string; start: number; end: number }> = [];

    for (const segment of segments) {
      for (const word of segment.words) {
        if (word.isFiller) {
          timestamps.push({
            word: word.word,
            start: word.start,
            end: word.end,
          });
        }
      }
    }

    return timestamps.sort((a, b) => a.start - b.start);
  }

  /**
   * Add custom filler words to the detector
   */
  addFillerWords(words: string[]): void {
    for (const word of words) {
      if (word.includes(' ')) {
        this.multiWordFillers.push(word.toLowerCase());
      } else {
        this.fillerWords.add(word.toLowerCase());
      }
    }
  }

  /**
   * Remove words from the filler list
   */
  removeFillerWords(words: string[]): void {
    for (const word of words) {
      const normalized = word.toLowerCase();
      this.fillerWords.delete(normalized);
      this.multiWordFillers = this.multiWordFillers.filter(w => w !== normalized);
    }
  }

  /**
   * Get current list of filler words
   */
  getFillerWordList(): string[] {
    return [
      ...Array.from(this.fillerWords),
      ...this.multiWordFillers,
    ];
  }
}

// Export singleton instance with default filler words
export const fillerWordDetector = new FillerWordDetector();

// Export factory function for custom instances
export function createFillerDetector(customWords?: string[]): FillerWordDetector {
  return new FillerWordDetector(customWords || DEFAULT_FILLER_WORDS);
}
