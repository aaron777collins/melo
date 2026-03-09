/**
 * Transcription Types
 * BDV2-US-3.4: Transcription Generation
 * 
 * Types for Whisper integration, word-level timestamps, and filler word detection.
 */

/**
 * A single word with timing and confidence information
 */
export interface TranscriptWord {
  word: string;
  start: number;      // Start time in seconds
  end: number;        // End time in seconds
  confidence: number; // 0-1 confidence score
  isFiller: boolean;  // True if this is a filler word
}

/**
 * A segment of transcript (typically a sentence or phrase)
 */
export interface TranscriptSegment {
  id: number;
  start: number;      // Start time in seconds
  end: number;        // End time in seconds
  text: string;       // Full text of segment
  words: TranscriptWord[];
  avgConfidence: number;
}

/**
 * Complete transcript with metadata
 */
export interface Transcript {
  id: string;
  videoId: string;
  segmentId?: string; // Optional video segment ID
  language: string;
  duration: number;   // Total duration in seconds
  segments: TranscriptSegment[];
  metadata: TranscriptMetadata;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Transcript metadata and statistics
 */
export interface TranscriptMetadata {
  model: WhisperModel;
  wordCount: number;
  fillerWordCount: number;
  fillerWords: FillerWordSummary[];
  avgConfidence: number;
  processingTimeMs: number;
  audioFile?: string;
}

/**
 * Summary of filler word occurrences
 */
export interface FillerWordSummary {
  word: string;
  count: number;
  timestamps: number[]; // Start times of each occurrence
}

/**
 * Whisper model options
 */
export type WhisperModel = 'tiny' | 'base' | 'small' | 'medium' | 'large' | 'turbo';

/**
 * Configuration for transcription
 */
export interface TranscriptionConfig {
  model: WhisperModel;
  language?: string;      // Auto-detect if not specified
  wordTimestamps: boolean;
  maxLineWidth?: number;  // For SRT generation
  maxWordsPerLine?: number;
  detectFillerWords: boolean;
  fillerWordList?: string[]; // Custom filler words to detect
}

/**
 * Progress callback for long transcriptions
 */
export interface TranscriptionProgress {
  phase: 'extracting' | 'transcribing' | 'processing' | 'generating';
  progress: number;     // 0-100
  currentTime?: number; // Current position in video (seconds)
  totalTime?: number;   // Total video duration (seconds)
  message?: string;
}

export type ProgressCallback = (progress: TranscriptionProgress) => void;

/**
 * Result of transcription operation
 */
export interface TranscriptionResult {
  success: boolean;
  transcript?: Transcript;
  srtContent?: string;
  srtPath?: string;
  jsonPath?: string;
  error?: string;
  processingTimeMs: number;
}

/**
 * Raw Whisper JSON output format
 */
export interface WhisperOutput {
  text: string;
  segments: WhisperSegment[];
  language: string;
}

export interface WhisperSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
  words?: WhisperWord[];
}

export interface WhisperWord {
  word: string;
  start: number;
  end: number;
  probability: number;
}

/**
 * SRT subtitle entry
 */
export interface SrtEntry {
  index: number;
  startTime: string;  // HH:MM:SS,mmm format
  endTime: string;
  text: string;
}

/**
 * Transcription job payload (for background processing)
 */
export interface TranscriptionJobPayload {
  videoId: string;
  segmentId?: string;
  audioPath: string;
  outputDir: string;
  config: TranscriptionConfig;
}

/**
 * Transcription job result
 */
export interface TranscriptionJobResult {
  success: boolean;
  transcriptId?: string;
  srtPath?: string;
  jsonPath?: string;
  error?: string;
  metadata?: TranscriptMetadata;
}

/**
 * Default filler words to detect
 */
export const DEFAULT_FILLER_WORDS = [
  // Common English filler words
  'um', 'uh', 'er', 'ah', 'like', 'you know', 'basically',
  'actually', 'literally', 'right', 'so', 'well', 'i mean',
  // Hesitation sounds
  'hmm', 'hm', 'mm', 'mhm', 'uh-huh',
  // Extended forms
  'umm', 'uhh', 'err', 'ahh',
];

/**
 * Default transcription configuration
 */
export const DEFAULT_TRANSCRIPTION_CONFIG: TranscriptionConfig = {
  model: 'base',
  wordTimestamps: true,
  maxLineWidth: 42,
  maxWordsPerLine: 10,
  detectFillerWords: true,
  fillerWordList: DEFAULT_FILLER_WORDS,
};
