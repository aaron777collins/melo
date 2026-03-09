/**
 * Tests for Transcription Types
 * BDV2-US-3.4: Transcription Generation
 */

import {
  TranscriptWord,
  TranscriptSegment,
  Transcript,
  TranscriptMetadata,
  FillerWordSummary,
  WhisperModel,
  TranscriptionConfig,
  TranscriptionProgress,
  TranscriptionResult,
  WhisperOutput,
  WhisperSegment,
  WhisperWord,
  SrtEntry,
  TranscriptionJobPayload,
  TranscriptionJobResult,
  DEFAULT_FILLER_WORDS,
  DEFAULT_TRANSCRIPTION_CONFIG,
} from '@/lib/transcription/types';

describe('Transcription Types', () => {
  describe('DEFAULT_FILLER_WORDS', () => {
    it('should include common English filler words', () => {
      expect(DEFAULT_FILLER_WORDS).toContain('um');
      expect(DEFAULT_FILLER_WORDS).toContain('uh');
      expect(DEFAULT_FILLER_WORDS).toContain('like');
      expect(DEFAULT_FILLER_WORDS).toContain('you know');
    });

    it('should include hesitation sounds', () => {
      expect(DEFAULT_FILLER_WORDS).toContain('hmm');
      expect(DEFAULT_FILLER_WORDS).toContain('mhm');
    });

    it('should have no duplicates', () => {
      const unique = new Set(DEFAULT_FILLER_WORDS);
      expect(unique.size).toBe(DEFAULT_FILLER_WORDS.length);
    });
  });

  describe('DEFAULT_TRANSCRIPTION_CONFIG', () => {
    it('should use base model by default', () => {
      expect(DEFAULT_TRANSCRIPTION_CONFIG.model).toBe('base');
    });

    it('should enable word timestamps by default', () => {
      expect(DEFAULT_TRANSCRIPTION_CONFIG.wordTimestamps).toBe(true);
    });

    it('should enable filler word detection by default', () => {
      expect(DEFAULT_TRANSCRIPTION_CONFIG.detectFillerWords).toBe(true);
    });

    it('should have reasonable SRT line width', () => {
      expect(DEFAULT_TRANSCRIPTION_CONFIG.maxLineWidth).toBeLessThanOrEqual(50);
      expect(DEFAULT_TRANSCRIPTION_CONFIG.maxLineWidth).toBeGreaterThanOrEqual(30);
    });
  });

  describe('TranscriptWord type shape', () => {
    it('should accept valid word data', () => {
      const word: TranscriptWord = {
        word: 'hello',
        start: 0.5,
        end: 1.0,
        confidence: 0.95,
        isFiller: false,
      };
      
      expect(word.word).toBe('hello');
      expect(word.start).toBe(0.5);
      expect(word.end).toBe(1.0);
      expect(word.confidence).toBe(0.95);
      expect(word.isFiller).toBe(false);
    });
  });

  describe('TranscriptSegment type shape', () => {
    it('should accept valid segment data', () => {
      const segment: TranscriptSegment = {
        id: 1,
        start: 0.0,
        end: 5.0,
        text: 'Hello world',
        words: [
          { word: 'Hello', start: 0.0, end: 0.5, confidence: 0.9, isFiller: false },
          { word: 'world', start: 0.6, end: 1.0, confidence: 0.85, isFiller: false },
        ],
        avgConfidence: 0.875,
      };

      expect(segment.id).toBe(1);
      expect(segment.words).toHaveLength(2);
    });
  });

  describe('WhisperModel type', () => {
    it('should accept valid model names', () => {
      const models: WhisperModel[] = ['tiny', 'base', 'small', 'medium', 'large', 'turbo'];
      expect(models).toHaveLength(6);
    });
  });

  describe('TranscriptionProgress type shape', () => {
    it('should accept valid progress data', () => {
      const progress: TranscriptionProgress = {
        phase: 'transcribing',
        progress: 50,
        currentTime: 30,
        totalTime: 60,
        message: 'Transcribing... 30s / 60s',
      };

      expect(progress.phase).toBe('transcribing');
      expect(progress.progress).toBe(50);
    });
  });

  describe('SrtEntry type shape', () => {
    it('should accept valid SRT entry data', () => {
      const entry: SrtEntry = {
        index: 1,
        startTime: '00:00:01,000',
        endTime: '00:00:04,500',
        text: 'Hello, this is a subtitle.',
      };

      expect(entry.index).toBe(1);
      expect(entry.startTime).toMatch(/^\d{2}:\d{2}:\d{2},\d{3}$/);
    });
  });
});
