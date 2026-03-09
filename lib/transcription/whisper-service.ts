/**
 * Whisper Transcription Service
 * BDV2-US-3.4: Transcription Generation
 * 
 * Core service for video/audio transcription using OpenAI Whisper.
 * Features:
 * - Word-level timestamps with confidence scores
 * - Filler word detection
 * - SRT subtitle generation
 * - Progress reporting for long videos
 * - Efficient chunked processing for 60+ minute videos
 */

import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

import {
  Transcript,
  TranscriptSegment,
  TranscriptWord,
  TranscriptionConfig,
  TranscriptionResult,
  TranscriptionProgress,
  ProgressCallback,
  WhisperOutput,
  WhisperSegment,
  WhisperModel,
  TranscriptMetadata,
  DEFAULT_TRANSCRIPTION_CONFIG,
} from './types';
import { FillerWordDetector, createFillerDetector } from './filler-words';
import { SrtGenerator, createSrtGenerator } from './srt-generator';

/**
 * Main transcription service
 */
export class WhisperService {
  private config: TranscriptionConfig;
  private fillerDetector: FillerWordDetector;
  private srtGenerator: SrtGenerator;
  private whisperPath: string;

  constructor(
    config: Partial<TranscriptionConfig> = {},
    whisperPath: string = 'whisper'
  ) {
    this.config = { ...DEFAULT_TRANSCRIPTION_CONFIG, ...config };
    this.fillerDetector = createFillerDetector(this.config.fillerWordList);
    this.srtGenerator = createSrtGenerator({
      maxLineWidth: this.config.maxLineWidth,
      maxWordsPerLine: this.config.maxWordsPerLine,
    });
    this.whisperPath = whisperPath;
  }

  /**
   * Transcribe an audio/video file
   */
  async transcribe(
    inputPath: string,
    outputDir: string,
    progressCallback?: ProgressCallback
  ): Promise<TranscriptionResult> {
    const startTime = Date.now();
    const transcriptId = randomUUID();

    try {
      // Report initial progress
      progressCallback?.({
        phase: 'extracting',
        progress: 0,
        message: 'Preparing audio for transcription...',
      });

      // Ensure output directory exists
      await fs.mkdir(outputDir, { recursive: true });

      // Check if input is video and extract audio if needed
      const audioPath = await this.prepareAudio(inputPath, outputDir, progressCallback);

      // Get audio duration for progress reporting
      const duration = await this.getAudioDuration(audioPath);

      // Run Whisper transcription
      progressCallback?.({
        phase: 'transcribing',
        progress: 10,
        totalTime: duration,
        message: 'Running Whisper transcription...',
      });

      const whisperOutput = await this.runWhisper(
        audioPath,
        outputDir,
        duration,
        progressCallback
      );

      // Process Whisper output
      progressCallback?.({
        phase: 'processing',
        progress: 80,
        message: 'Processing transcript...',
      });

      const segments = this.processWhisperOutput(whisperOutput);

      // Detect filler words
      if (this.config.detectFillerWords) {
        this.fillerDetector.markFillers(segments.flatMap(s => s.words));
      }

      // Calculate metadata
      const metadata = this.calculateMetadata(segments, whisperOutput, startTime);

      // Create transcript object
      const transcript: Transcript = {
        id: transcriptId,
        videoId: path.basename(inputPath, path.extname(inputPath)),
        language: whisperOutput.language || 'en',
        duration,
        segments,
        metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Generate SRT
      progressCallback?.({
        phase: 'generating',
        progress: 90,
        message: 'Generating subtitle file...',
      });

      const srtContent = this.srtGenerator.generate(segments);
      const srtPath = path.join(outputDir, `${transcriptId}.srt`);
      await fs.writeFile(srtPath, srtContent, 'utf-8');

      // Save JSON transcript
      const jsonPath = path.join(outputDir, `${transcriptId}.json`);
      await fs.writeFile(jsonPath, JSON.stringify(transcript, null, 2), 'utf-8');

      progressCallback?.({
        phase: 'generating',
        progress: 100,
        message: 'Transcription complete!',
      });

      return {
        success: true,
        transcript,
        srtContent,
        srtPath,
        jsonPath,
        processingTimeMs: Date.now() - startTime,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Transcription failed:', errorMessage);

      return {
        success: false,
        error: errorMessage,
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Prepare audio for transcription (extract from video if needed)
   */
  private async prepareAudio(
    inputPath: string,
    outputDir: string,
    progressCallback?: ProgressCallback
  ): Promise<string> {
    const ext = path.extname(inputPath).toLowerCase();
    const audioExtensions = ['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.aac'];

    // If already audio, return as-is
    if (audioExtensions.includes(ext)) {
      return inputPath;
    }

    // Extract audio from video using ffmpeg
    progressCallback?.({
      phase: 'extracting',
      progress: 5,
      message: 'Extracting audio from video...',
    });

    const audioPath = path.join(outputDir, 'audio.wav');
    
    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i', inputPath,
        '-vn',                    // No video
        '-acodec', 'pcm_s16le',   // PCM format for best Whisper compatibility
        '-ar', '16000',           // 16kHz sample rate
        '-ac', '1',               // Mono
        '-y',                     // Overwrite
        audioPath,
      ]);

      ffmpeg.on('close', code => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited with code ${code}`));
      });

      ffmpeg.on('error', reject);
    });

    return audioPath;
  }

  /**
   * Get audio duration using ffprobe
   */
  private async getAudioDuration(audioPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'quiet',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        audioPath,
      ]);

      let output = '';
      ffprobe.stdout.on('data', data => {
        output += data.toString();
      });

      ffprobe.on('close', code => {
        if (code === 0) {
          const duration = parseFloat(output.trim());
          resolve(isNaN(duration) ? 0 : duration);
        } else {
          resolve(0); // Default to 0 if ffprobe fails
        }
      });

      ffprobe.on('error', () => resolve(0));
    });
  }

  /**
   * Run Whisper CLI with progress tracking
   */
  private async runWhisper(
    audioPath: string,
    outputDir: string,
    duration: number,
    progressCallback?: ProgressCallback
  ): Promise<WhisperOutput> {
    return new Promise((resolve, reject) => {
      const args = [
        audioPath,
        '--model', this.config.model,
        '--output_dir', outputDir,
        '--output_format', 'json',
        '--word_timestamps', 'True',
        '--verbose', 'False',
      ];

      if (this.config.language) {
        args.push('--language', this.config.language);
      }

      const whisper = spawn(this.whisperPath, args);
      let stderr = '';
      let lastProgress = 10;

      // Parse Whisper progress output
      whisper.stderr.on('data', (data: Buffer) => {
        const output = data.toString();
        stderr += output;

        // Try to parse progress from Whisper output
        // Whisper outputs lines like: "[00:00.000 --> 00:02.000]  Some text"
        const timeMatch = output.match(/\[(\d{2}):(\d{2})\.(\d{3})/);
        if (timeMatch && duration > 0) {
          const currentTime = 
            parseInt(timeMatch[1], 10) * 60 + 
            parseInt(timeMatch[2], 10) + 
            parseInt(timeMatch[3], 10) / 1000;
          
          // Map progress from 10% to 80% during transcription
          const progress = 10 + Math.round((currentTime / duration) * 70);
          
          if (progress > lastProgress) {
            lastProgress = progress;
            progressCallback?.({
              phase: 'transcribing',
              progress,
              currentTime,
              totalTime: duration,
              message: `Transcribing... ${Math.round(currentTime)}s / ${Math.round(duration)}s`,
            });
          }
        }
      });

      whisper.on('close', async code => {
        if (code !== 0) {
          reject(new Error(`Whisper exited with code ${code}: ${stderr}`));
          return;
        }

        try {
          // Find and parse the JSON output
          const baseName = path.basename(audioPath, path.extname(audioPath));
          const jsonPath = path.join(outputDir, `${baseName}.json`);
          const jsonContent = await fs.readFile(jsonPath, 'utf-8');
          const output: WhisperOutput = JSON.parse(jsonContent);
          resolve(output);
        } catch (error) {
          reject(new Error(`Failed to parse Whisper output: ${error}`));
        }
      });

      whisper.on('error', error => {
        reject(new Error(`Failed to start Whisper: ${error.message}`));
      });
    });
  }

  /**
   * Process Whisper output into our transcript format
   */
  private processWhisperOutput(output: WhisperOutput): TranscriptSegment[] {
    return output.segments.map(segment => {
      const words: TranscriptWord[] = (segment.words || []).map(word => ({
        word: word.word.trim(),
        start: word.start,
        end: word.end,
        confidence: word.probability,
        isFiller: false, // Will be set by filler detector
      }));

      // Calculate average confidence for segment
      const avgConfidence = words.length > 0
        ? words.reduce((sum, w) => sum + w.confidence, 0) / words.length
        : Math.exp(segment.avg_logprob); // Convert log prob to probability

      return {
        id: segment.id,
        start: segment.start,
        end: segment.end,
        text: segment.text.trim(),
        words,
        avgConfidence,
      };
    });
  }

  /**
   * Calculate transcript metadata
   */
  private calculateMetadata(
    segments: TranscriptSegment[],
    whisperOutput: WhisperOutput,
    startTime: number
  ): TranscriptMetadata {
    const allWords = segments.flatMap(s => s.words);
    const fillerSummary = this.fillerDetector.generateSummary(segments);

    return {
      model: this.config.model,
      wordCount: allWords.length,
      fillerWordCount: this.fillerDetector.countFillers(segments),
      fillerWords: fillerSummary,
      avgConfidence: allWords.length > 0
        ? allWords.reduce((sum, w) => sum + w.confidence, 0) / allWords.length
        : 0,
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Transcribe in chunks for very long videos (60+ minutes)
   * More memory efficient
   */
  async transcribeLongVideo(
    inputPath: string,
    outputDir: string,
    chunkDurationMinutes: number = 10,
    progressCallback?: ProgressCallback
  ): Promise<TranscriptionResult> {
    const startTime = Date.now();

    try {
      await fs.mkdir(outputDir, { recursive: true });

      // Get total duration
      const duration = await this.getAudioDuration(inputPath);
      const totalChunks = Math.ceil(duration / (chunkDurationMinutes * 60));

      progressCallback?.({
        phase: 'extracting',
        progress: 0,
        totalTime: duration,
        message: `Processing ${totalChunks} chunks...`,
      });

      const allSegments: TranscriptSegment[] = [];
      let segmentIdOffset = 0;

      for (let chunk = 0; chunk < totalChunks; chunk++) {
        const chunkStart = chunk * chunkDurationMinutes * 60;
        const chunkDuration = Math.min(
          chunkDurationMinutes * 60,
          duration - chunkStart
        );

        // Extract chunk audio
        const chunkAudioPath = path.join(outputDir, `chunk_${chunk}.wav`);
        await this.extractAudioChunk(
          inputPath,
          chunkAudioPath,
          chunkStart,
          chunkDuration
        );

        // Transcribe chunk
        const chunkProgress = (chunk / totalChunks) * 80;
        progressCallback?.({
          phase: 'transcribing',
          progress: 10 + chunkProgress,
          currentTime: chunkStart,
          totalTime: duration,
          message: `Transcribing chunk ${chunk + 1}/${totalChunks}...`,
        });

        const chunkResult = await this.transcribe(
          chunkAudioPath,
          path.join(outputDir, `chunk_${chunk}`)
        );

        if (chunkResult.success && chunkResult.transcript) {
          // Adjust timestamps and IDs for chunk offset
          const adjustedSegments = chunkResult.transcript.segments.map(seg => ({
            ...seg,
            id: seg.id + segmentIdOffset,
            start: seg.start + chunkStart,
            end: seg.end + chunkStart,
            words: seg.words.map(w => ({
              ...w,
              start: w.start + chunkStart,
              end: w.end + chunkStart,
            })),
          }));

          allSegments.push(...adjustedSegments);
          segmentIdOffset += chunkResult.transcript.segments.length;
        }

        // Clean up chunk files
        await fs.unlink(chunkAudioPath).catch(() => {});
      }

      // Generate final transcript
      const metadata = this.calculateMetadata(
        allSegments,
        { text: '', segments: [], language: this.config.language || 'en' },
        startTime
      );

      const transcript: Transcript = {
        id: randomUUID(),
        videoId: path.basename(inputPath, path.extname(inputPath)),
        language: this.config.language || 'en',
        duration,
        segments: allSegments,
        metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Generate final SRT
      const srtContent = this.srtGenerator.generate(allSegments);
      const srtPath = path.join(outputDir, `${transcript.id}.srt`);
      await fs.writeFile(srtPath, srtContent, 'utf-8');

      const jsonPath = path.join(outputDir, `${transcript.id}.json`);
      await fs.writeFile(jsonPath, JSON.stringify(transcript, null, 2), 'utf-8');

      progressCallback?.({
        phase: 'generating',
        progress: 100,
        message: 'Transcription complete!',
      });

      return {
        success: true,
        transcript,
        srtContent,
        srtPath,
        jsonPath,
        processingTimeMs: Date.now() - startTime,
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Extract a chunk of audio from a video/audio file
   */
  private async extractAudioChunk(
    inputPath: string,
    outputPath: string,
    startSeconds: number,
    durationSeconds: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-ss', startSeconds.toString(),
        '-i', inputPath,
        '-t', durationSeconds.toString(),
        '-vn',
        '-acodec', 'pcm_s16le',
        '-ar', '16000',
        '-ac', '1',
        '-y',
        outputPath,
      ]);

      ffmpeg.on('close', code => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg chunk extraction failed with code ${code}`));
      });

      ffmpeg.on('error', reject);
    });
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TranscriptionConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.fillerWordList) {
      this.fillerDetector = createFillerDetector(config.fillerWordList);
    }
    
    if (config.maxLineWidth || config.maxWordsPerLine) {
      this.srtGenerator = createSrtGenerator({
        maxLineWidth: this.config.maxLineWidth,
        maxWordsPerLine: this.config.maxWordsPerLine,
      });
    }
  }

  /**
   * Get available Whisper models
   */
  static getAvailableModels(): WhisperModel[] {
    return ['tiny', 'base', 'small', 'medium', 'large', 'turbo'];
  }

  /**
   * Estimate transcription time based on duration and model
   */
  static estimateTime(durationSeconds: number, model: WhisperModel): number {
    // Rough estimates (actual time depends on hardware)
    const modelFactors: Record<WhisperModel, number> = {
      tiny: 0.5,
      base: 1.0,
      small: 2.0,
      medium: 4.0,
      large: 8.0,
      turbo: 1.0,
    };

    // Base: ~1 minute of audio takes ~1 minute to transcribe with 'base' model on CPU
    return Math.ceil(durationSeconds * modelFactors[model] / 60);
  }
}

// Export singleton with default config
export const whisperService = new WhisperService();

// Export factory for custom configs
export function createWhisperService(
  config?: Partial<TranscriptionConfig>,
  whisperPath?: string
): WhisperService {
  return new WhisperService(config, whisperPath);
}
