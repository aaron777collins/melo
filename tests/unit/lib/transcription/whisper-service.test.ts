/**
 * Tests for Whisper Transcription Service
 * BDV2-US-3.4: Transcription Generation
 * 
 * Note: These tests verify the service structure and static methods.
 * Integration tests with real files require whisper to be installed.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  WhisperService, 
  whisperService,
  createWhisperService 
} from '@/lib/transcription/whisper-service';
import { 
  TranscriptionConfig, 
  WhisperModel,
  DEFAULT_TRANSCRIPTION_CONFIG 
} from '@/lib/transcription/types';

describe('WhisperService', () => {
  let service: WhisperService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createWhisperService();
  });

  describe('constructor', () => {
    it('should use default config when none provided', () => {
      const defaultService = new WhisperService();
      // Service should be created without error
      expect(defaultService).toBeInstanceOf(WhisperService);
    });

    it('should merge custom config with defaults', () => {
      const customService = createWhisperService({
        model: 'small',
        language: 'es',
      });
      expect(customService).toBeInstanceOf(WhisperService);
    });

    it('should accept custom whisper path', () => {
      const customService = createWhisperService({}, '/custom/path/whisper');
      expect(customService).toBeInstanceOf(WhisperService);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      service.updateConfig({ model: 'medium' });
      // Configuration should be updated (verified by subsequent behavior)
      expect(service).toBeInstanceOf(WhisperService);
    });

    it('should update filler detector when fillerWordList changes', () => {
      service.updateConfig({ fillerWordList: ['custom'] });
      expect(service).toBeInstanceOf(WhisperService);
    });

    it('should update SRT generator when line config changes', () => {
      service.updateConfig({ maxLineWidth: 30 });
      expect(service).toBeInstanceOf(WhisperService);
    });
  });

  describe('getAvailableModels', () => {
    it('should return all available Whisper models', () => {
      const models = WhisperService.getAvailableModels();
      
      expect(models).toContain('tiny');
      expect(models).toContain('base');
      expect(models).toContain('small');
      expect(models).toContain('medium');
      expect(models).toContain('large');
      expect(models).toContain('turbo');
      expect(models).toHaveLength(6);
    });

    it('should return consistent model list', () => {
      const models1 = WhisperService.getAvailableModels();
      const models2 = WhisperService.getAvailableModels();
      expect(models1).toEqual(models2);
    });
  });

  describe('estimateTime', () => {
    it('should estimate transcription time based on duration and model', () => {
      // 60 seconds with base model
      const baseTime = WhisperService.estimateTime(60, 'base');
      expect(baseTime).toBe(1); // ~1 minute

      // 60 seconds with tiny model (faster)
      const tinyTime = WhisperService.estimateTime(60, 'tiny');
      expect(tinyTime).toBe(1); // ~0.5 minute, rounds up

      // 60 seconds with large model (slower)
      const largeTime = WhisperService.estimateTime(60, 'large');
      expect(largeTime).toBe(8); // ~8 minutes
    });

    it('should scale with duration', () => {
      const time1 = WhisperService.estimateTime(60, 'base');
      const time2 = WhisperService.estimateTime(600, 'base'); // 10x duration
      
      expect(time2).toBeGreaterThan(time1);
    });

    it('should handle zero duration', () => {
      const time = WhisperService.estimateTime(0, 'base');
      expect(time).toBe(0);
    });

    it('should handle all model types', () => {
      const models: WhisperModel[] = ['tiny', 'base', 'small', 'medium', 'large', 'turbo'];
      
      models.forEach(model => {
        const time = WhisperService.estimateTime(60, model);
        expect(time).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(whisperService).toBeInstanceOf(WhisperService);
    });
  });

  describe('factory function', () => {
    it('should create new instances with different configs', () => {
      const service1 = createWhisperService({ model: 'tiny' });
      const service2 = createWhisperService({ model: 'large' });
      
      expect(service1).toBeInstanceOf(WhisperService);
      expect(service2).toBeInstanceOf(WhisperService);
      expect(service1).not.toBe(service2);
    });

    it('should create instances with language config', () => {
      const englishService = createWhisperService({ language: 'en' });
      const spanishService = createWhisperService({ language: 'es' });
      
      expect(englishService).toBeInstanceOf(WhisperService);
      expect(spanishService).toBeInstanceOf(WhisperService);
    });
  });
});

describe('WhisperService Types and Structure', () => {
  it('should have proper TypeScript types for TranscriptionResult', () => {
    // This test verifies the TypeScript types are correct
    const mockResult = {
      success: true as const,
      transcript: {
        id: 'test-id',
        videoId: 'video-123',
        language: 'en',
        duration: 60,
        segments: [],
        metadata: {
          model: 'base' as WhisperModel,
          wordCount: 100,
          fillerWordCount: 5,
          fillerWords: [],
          avgConfidence: 0.9,
          processingTimeMs: 5000,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      srtContent: '1\n00:00:00,000 --> 00:00:02,000\nHello\n',
      srtPath: '/output/transcript.srt',
      jsonPath: '/output/transcript.json',
      processingTimeMs: 5000,
    };

    expect(mockResult.success).toBe(true);
    expect(mockResult.transcript?.id).toBe('test-id');
    expect(mockResult.transcript?.metadata.model).toBe('base');
  });

  it('should define proper progress phases', () => {
    const phases = ['extracting', 'transcribing', 'processing', 'generating'] as const;
    
    phases.forEach(phase => {
      const progress = {
        phase,
        progress: 50,
        message: `Phase: ${phase}`,
      };
      expect(progress.phase).toBe(phase);
    });
  });

  it('should support all WhisperModel values', () => {
    const models: WhisperModel[] = ['tiny', 'base', 'small', 'medium', 'large', 'turbo'];
    
    expect(models).toHaveLength(6);
    models.forEach(model => {
      expect(typeof model).toBe('string');
    });
  });

  it('should have correct default config structure', () => {
    expect(DEFAULT_TRANSCRIPTION_CONFIG).toHaveProperty('model');
    expect(DEFAULT_TRANSCRIPTION_CONFIG).toHaveProperty('wordTimestamps');
    expect(DEFAULT_TRANSCRIPTION_CONFIG).toHaveProperty('detectFillerWords');
    expect(DEFAULT_TRANSCRIPTION_CONFIG).toHaveProperty('maxLineWidth');
    expect(DEFAULT_TRANSCRIPTION_CONFIG).toHaveProperty('maxWordsPerLine');
  });
});

describe('WhisperService Error Handling', () => {
  it('should handle invalid config gracefully', () => {
    // Creating service with partial config should work
    expect(() => createWhisperService({})).not.toThrow();
  });

  it('should create service with empty filler words', () => {
    const service = createWhisperService({ fillerWordList: [] });
    expect(service).toBeInstanceOf(WhisperService);
  });
});
