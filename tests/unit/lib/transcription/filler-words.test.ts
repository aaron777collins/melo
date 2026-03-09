/**
 * Tests for Filler Word Detection
 * BDV2-US-3.4: Transcription Generation
 */

import { 
  FillerWordDetector, 
  fillerWordDetector,
  createFillerDetector 
} from '@/lib/transcription/filler-words';
import { TranscriptWord, TranscriptSegment } from '@/lib/transcription/types';

describe('FillerWordDetector', () => {
  let detector: FillerWordDetector;

  beforeEach(() => {
    detector = createFillerDetector();
  });

  describe('isFiller', () => {
    it('should detect common filler words', () => {
      expect(detector.isFiller('um')).toBe(true);
      expect(detector.isFiller('uh')).toBe(true);
      expect(detector.isFiller('like')).toBe(true);
      expect(detector.isFiller('basically')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(detector.isFiller('Um')).toBe(true);
      expect(detector.isFiller('UM')).toBe(true);
      expect(detector.isFiller('uM')).toBe(true);
    });

    it('should handle punctuation', () => {
      expect(detector.isFiller('um,')).toBe(true);
      expect(detector.isFiller('uh.')).toBe(true);
      expect(detector.isFiller('"like"')).toBe(true);
    });

    it('should not flag regular words', () => {
      expect(detector.isFiller('hello')).toBe(false);
      expect(detector.isFiller('world')).toBe(false);
      expect(detector.isFiller('transcription')).toBe(false);
    });
  });

  describe('markFillers', () => {
    it('should mark filler words in array', () => {
      const words: TranscriptWord[] = [
        { word: 'So', start: 0, end: 0.2, confidence: 0.9, isFiller: false },
        { word: 'um', start: 0.3, end: 0.5, confidence: 0.8, isFiller: false },
        { word: 'hello', start: 0.6, end: 1.0, confidence: 0.95, isFiller: false },
      ];

      const marked = detector.markFillers(words);

      expect(marked[0].isFiller).toBe(true); // 'so' is a filler
      expect(marked[1].isFiller).toBe(true); // 'um' is a filler
      expect(marked[2].isFiller).toBe(false); // 'hello' is not
    });
  });

  describe('generateSummary', () => {
    it('should generate summary of filler words with counts', () => {
      const segments: TranscriptSegment[] = [{
        id: 1,
        start: 0,
        end: 5,
        text: 'Um so um like hello',
        words: [
          { word: 'Um', start: 0, end: 0.2, confidence: 0.8, isFiller: true },
          { word: 'so', start: 0.3, end: 0.5, confidence: 0.9, isFiller: true },
          { word: 'um', start: 0.6, end: 0.8, confidence: 0.8, isFiller: true },
          { word: 'like', start: 0.9, end: 1.1, confidence: 0.9, isFiller: true },
          { word: 'hello', start: 1.2, end: 1.5, confidence: 0.95, isFiller: false },
        ],
        avgConfidence: 0.87,
      }];

      const summary = detector.generateSummary(segments);

      expect(summary).toBeInstanceOf(Array);
      
      // Should find 'um' with count of 2
      const umEntry = summary.find(s => s.word === 'um');
      expect(umEntry).toBeDefined();
      expect(umEntry?.count).toBe(2);
      expect(umEntry?.timestamps).toHaveLength(2);
    });

    it('should sort by count descending', () => {
      const segments: TranscriptSegment[] = [{
        id: 1,
        start: 0,
        end: 5,
        text: 'um like um um uh',
        words: [
          { word: 'um', start: 0, end: 0.2, confidence: 0.8, isFiller: true },
          { word: 'like', start: 0.3, end: 0.5, confidence: 0.9, isFiller: true },
          { word: 'um', start: 0.6, end: 0.8, confidence: 0.8, isFiller: true },
          { word: 'um', start: 0.9, end: 1.1, confidence: 0.8, isFiller: true },
          { word: 'uh', start: 1.2, end: 1.4, confidence: 0.85, isFiller: true },
        ],
        avgConfidence: 0.83,
      }];

      const summary = detector.generateSummary(segments);

      expect(summary[0].word).toBe('um');
      expect(summary[0].count).toBe(3);
    });
  });

  describe('countFillers', () => {
    it('should count total filler words across segments', () => {
      const segments: TranscriptSegment[] = [
        {
          id: 1,
          start: 0,
          end: 2,
          text: 'Um hello',
          words: [
            { word: 'Um', start: 0, end: 0.2, confidence: 0.8, isFiller: true },
            { word: 'hello', start: 0.3, end: 0.6, confidence: 0.95, isFiller: false },
          ],
          avgConfidence: 0.875,
        },
        {
          id: 2,
          start: 2,
          end: 4,
          text: 'like uh world',
          words: [
            { word: 'like', start: 2, end: 2.2, confidence: 0.9, isFiller: true },
            { word: 'uh', start: 2.3, end: 2.5, confidence: 0.8, isFiller: true },
            { word: 'world', start: 2.6, end: 3.0, confidence: 0.92, isFiller: false },
          ],
          avgConfidence: 0.87,
        },
      ];

      const count = detector.countFillers(segments);
      expect(count).toBe(3);
    });
  });

  describe('getFillerRate', () => {
    it('should calculate fillers per minute', () => {
      const segments: TranscriptSegment[] = [{
        id: 1,
        start: 0,
        end: 60,
        text: 'Test',
        words: [
          { word: 'um', start: 10, end: 10.2, confidence: 0.8, isFiller: true },
          { word: 'um', start: 20, end: 20.2, confidence: 0.8, isFiller: true },
          { word: 'um', start: 30, end: 30.2, confidence: 0.8, isFiller: true },
          { word: 'hello', start: 40, end: 40.5, confidence: 0.95, isFiller: false },
        ],
        avgConfidence: 0.84,
      }];

      const rate = detector.getFillerRate(segments, 60);
      expect(rate).toBe(3); // 3 fillers in 1 minute
    });

    it('should handle zero duration', () => {
      const segments: TranscriptSegment[] = [];
      const rate = detector.getFillerRate(segments, 0);
      expect(rate).toBe(0);
    });
  });

  describe('getFillerTimestamps', () => {
    it('should return sorted timestamps for editor highlighting', () => {
      const segments: TranscriptSegment[] = [{
        id: 1,
        start: 0,
        end: 5,
        text: 'hello um world uh',
        words: [
          { word: 'hello', start: 0, end: 0.5, confidence: 0.95, isFiller: false },
          { word: 'um', start: 1.0, end: 1.2, confidence: 0.8, isFiller: true },
          { word: 'world', start: 1.5, end: 2.0, confidence: 0.92, isFiller: false },
          { word: 'uh', start: 2.5, end: 2.7, confidence: 0.85, isFiller: true },
        ],
        avgConfidence: 0.88,
      }];

      const timestamps = detector.getFillerTimestamps(segments);

      expect(timestamps).toHaveLength(2);
      expect(timestamps[0].word).toBe('um');
      expect(timestamps[0].start).toBe(1.0);
      expect(timestamps[1].word).toBe('uh');
      expect(timestamps[1].start).toBe(2.5);
    });
  });

  describe('custom filler words', () => {
    it('should accept custom filler word list', () => {
      const customDetector = createFillerDetector(['custom', 'words']);
      
      expect(customDetector.isFiller('custom')).toBe(true);
      expect(customDetector.isFiller('words')).toBe(true);
      expect(customDetector.isFiller('um')).toBe(false); // not in custom list
    });

    it('should allow adding filler words', () => {
      detector.addFillerWords(['newfiller']);
      expect(detector.isFiller('newfiller')).toBe(true);
    });

    it('should allow removing filler words', () => {
      expect(detector.isFiller('um')).toBe(true);
      detector.removeFillerWords(['um']);
      expect(detector.isFiller('um')).toBe(false);
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(fillerWordDetector).toBeInstanceOf(FillerWordDetector);
      expect(fillerWordDetector.isFiller('um')).toBe(true);
    });
  });
});
