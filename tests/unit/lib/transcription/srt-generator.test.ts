/**
 * Tests for SRT Subtitle Generator
 * BDV2-US-3.4: Transcription Generation
 */

import { 
  SrtGenerator, 
  srtGenerator,
  createSrtGenerator,
  SrtConfig 
} from '@/lib/transcription/srt-generator';
import { TranscriptSegment } from '@/lib/transcription/types';

describe('SrtGenerator', () => {
  let generator: SrtGenerator;

  beforeEach(() => {
    generator = createSrtGenerator();
  });

  describe('formatTime', () => {
    it('should format seconds as SRT timestamp', () => {
      expect(generator.formatTime(0)).toBe('00:00:00,000');
      expect(generator.formatTime(1.5)).toBe('00:00:01,500');
      expect(generator.formatTime(61.234)).toBe('00:01:01,234');
      expect(generator.formatTime(3661.999)).toBe('01:01:01,999');
    });

    it('should handle negative values', () => {
      expect(generator.formatTime(-1)).toBe('00:00:00,000');
    });

    it('should handle large values', () => {
      const result = generator.formatTime(7200); // 2 hours
      expect(result).toBe('02:00:00,000');
    });
  });

  describe('parseTime', () => {
    it('should parse SRT timestamp to seconds', () => {
      expect(generator.parseTime('00:00:00,000')).toBe(0);
      expect(generator.parseTime('00:00:01,500')).toBe(1.5);
      expect(generator.parseTime('00:01:01,234')).toBeCloseTo(61.234, 2);
      expect(generator.parseTime('01:01:01,999')).toBeCloseTo(3661.999, 2);
    });

    it('should return 0 for invalid format', () => {
      expect(generator.parseTime('invalid')).toBe(0);
      expect(generator.parseTime('')).toBe(0);
    });
  });

  describe('generate', () => {
    it('should generate valid SRT content from segments', () => {
      const segments: TranscriptSegment[] = [
        {
          id: 1,
          start: 0,
          end: 2,
          text: 'Hello world',
          words: [
            { word: 'Hello', start: 0, end: 0.5, confidence: 0.9, isFiller: false },
            { word: 'world', start: 0.6, end: 1.0, confidence: 0.85, isFiller: false },
          ],
          avgConfidence: 0.875,
        },
        {
          id: 2,
          start: 2.5,
          end: 4.5,
          text: 'This is a test',
          words: [
            { word: 'This', start: 2.5, end: 2.7, confidence: 0.9, isFiller: false },
            { word: 'is', start: 2.8, end: 2.9, confidence: 0.95, isFiller: false },
            { word: 'a', start: 3.0, end: 3.1, confidence: 0.92, isFiller: false },
            { word: 'test', start: 3.2, end: 3.8, confidence: 0.88, isFiller: false },
          ],
          avgConfidence: 0.9125,
        },
      ];

      const srt = generator.generate(segments);

      // Should have entry indices
      expect(srt).toContain('1\n');
      expect(srt).toContain('2\n');

      // Should have timestamps with --> separator
      expect(srt).toMatch(/\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/);

      // Should have text content
      expect(srt).toContain('Hello');
      expect(srt).toContain('world');
      expect(srt).toContain('This');
      expect(srt).toContain('test');
    });

    it('should handle empty segments', () => {
      const srt = generator.generate([]);
      expect(srt).toBe('');
    });

    it('should handle segment with no words', () => {
      const segments: TranscriptSegment[] = [{
        id: 1,
        start: 0,
        end: 2,
        text: 'Hello world',
        words: [],
        avgConfidence: 0.9,
      }];

      const srt = generator.generate(segments);
      expect(srt).toContain('Hello world');
    });
  });

  describe('line breaking', () => {
    it('should break long lines', () => {
      const longText = 'This is a very long sentence that should be broken into multiple lines for readability';
      const words = longText.split(' ').map((word, i) => ({
        word,
        start: i * 0.3,
        end: i * 0.3 + 0.25,
        confidence: 0.9,
        isFiller: false,
      }));

      const segments: TranscriptSegment[] = [{
        id: 1,
        start: 0,
        end: 10,
        text: longText,
        words,
        avgConfidence: 0.9,
      }];

      const srt = generator.generate(segments);
      
      // Should have line breaks in the content
      const lines = srt.split('\n').filter(l => 
        l && !l.match(/^\d+$/) && !l.match(/-->/)
      );
      
      // At least one line should exist and none should be too long
      expect(lines.length).toBeGreaterThan(0);
      lines.forEach(line => {
        expect(line.length).toBeLessThanOrEqual(50); // reasonable max
      });
    });
  });

  describe('validateSrt', () => {
    it('should validate correct SRT format', () => {
      const validSrt = `1
00:00:00,000 --> 00:00:02,000
Hello world

2
00:00:02,500 --> 00:00:04,500
This is a test
`;

      const result = generator.validateSrt(validSrt);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid timestamp format', () => {
      const invalidSrt = `1
00:00:00.000 --> 00:00:02.000
Hello world
`;

      const result = generator.validateSrt(invalidSrt);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect invalid entry index', () => {
      const invalidSrt = `abc
00:00:00,000 --> 00:00:02,000
Hello world
`;

      const result = generator.validateSrt(invalidSrt);
      expect(result.valid).toBe(false);
    });
  });

  describe('generateWithHighlights', () => {
    it('should highlight filler words', () => {
      const segments: TranscriptSegment[] = [{
        id: 1,
        start: 0,
        end: 3,
        text: 'Um hello um world',
        words: [
          { word: 'Um', start: 0, end: 0.2, confidence: 0.8, isFiller: true },
          { word: 'hello', start: 0.3, end: 0.6, confidence: 0.95, isFiller: false },
          { word: 'um', start: 0.7, end: 0.9, confidence: 0.8, isFiller: true },
          { word: 'world', start: 1.0, end: 1.4, confidence: 0.92, isFiller: false },
        ],
        avgConfidence: 0.87,
      }];

      const srt = generator.generateWithHighlights(segments);

      // Default format wraps in brackets
      expect(srt).toContain('[Um]');
      expect(srt).toContain('[um]');
      expect(srt).toContain('hello'); // not bracketed
      expect(srt).toContain('world'); // not bracketed
    });

    it('should accept custom highlight format', () => {
      const segments: TranscriptSegment[] = [{
        id: 1,
        start: 0,
        end: 2,
        text: 'Um hello',
        words: [
          { word: 'Um', start: 0, end: 0.2, confidence: 0.8, isFiller: true },
          { word: 'hello', start: 0.3, end: 0.6, confidence: 0.95, isFiller: false },
        ],
        avgConfidence: 0.875,
      }];

      const srt = generator.generateWithHighlights(segments, w => `**${w}**`);
      expect(srt).toContain('**Um**');
    });
  });

  describe('configuration', () => {
    it('should respect maxLineWidth config', () => {
      const shortLineGenerator = createSrtGenerator({ maxLineWidth: 20 });
      
      const segments: TranscriptSegment[] = [{
        id: 1,
        start: 0,
        end: 5,
        text: 'This is a moderately long sentence',
        words: 'This is a moderately long sentence'.split(' ').map((word, i) => ({
          word,
          start: i * 0.5,
          end: i * 0.5 + 0.4,
          confidence: 0.9,
          isFiller: false,
        })),
        avgConfidence: 0.9,
      }];

      const srt = shortLineGenerator.generate(segments);
      
      // Check that lines are broken appropriately
      const lines = srt.split('\n');
      const textLines = lines.filter(l => 
        l && !l.match(/^\d+$/) && !l.match(/-->/)
      );
      
      // With 20 char limit, lines should be short
      textLines.forEach(line => {
        expect(line.length).toBeLessThanOrEqual(25); // some tolerance
      });
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(srtGenerator).toBeInstanceOf(SrtGenerator);
    });
  });
});
