/**
 * Transcription Job Handler
 * BDV2-US-3.4: Transcription Generation
 * 
 * Handles background transcription jobs with progress tracking.
 */

import path from 'path';
import { promises as fs } from 'fs';
import { db } from '@/lib/db';
import { jobQueue } from '../queue';
import { 
  WhisperService,
  TranscriptionJobPayload,
  TranscriptionJobResult,
  TranscriptionConfig,
  DEFAULT_TRANSCRIPTION_CONFIG,
} from '@/lib/transcription';

/**
 * Transcription job handler class
 */
class TranscriptionHandler {
  private whisperService: WhisperService;

  constructor() {
    this.whisperService = new WhisperService();
  }

  /**
   * Process a transcription job
   */
  async processTranscription(
    jobId: string,
    payload: TranscriptionJobPayload
  ): Promise<TranscriptionJobResult> {
    const { videoId, segmentId, audioPath, outputDir, config } = payload;

    console.log(`[Transcription] Starting job ${jobId} for video ${videoId}`);

    try {
      // Verify input file exists
      await fs.access(audioPath);

      // Get file stats for duration estimate
      const stats = await fs.stat(audioPath);
      const isLongVideo = stats.size > 500 * 1024 * 1024; // > 500MB likely long video

      // Update job with initial progress
      await this.logProgress(jobId, 'Starting transcription...', 0);

      // Configure whisper service
      this.whisperService.updateConfig({
        ...DEFAULT_TRANSCRIPTION_CONFIG,
        ...config,
      });

      // Progress callback
      const progressCallback = async (progress: {
        phase: string;
        progress: number;
        message?: string;
      }) => {
        await this.logProgress(
          jobId,
          progress.message || `Phase: ${progress.phase}`,
          progress.progress
        );
      };

      // Run transcription (use chunked processing for long videos)
      const result = isLongVideo
        ? await this.whisperService.transcribeLongVideo(
            audioPath,
            outputDir,
            10, // 10-minute chunks
            progressCallback
          )
        : await this.whisperService.transcribe(
            audioPath,
            outputDir,
            progressCallback
          );

      if (!result.success || !result.transcript) {
        throw new Error(result.error || 'Transcription failed');
      }

      console.log(`[Transcription] Job ${jobId} completed successfully`);

      return {
        success: true,
        transcriptId: result.transcript.id,
        srtPath: result.srtPath,
        jsonPath: result.jsonPath,
        metadata: result.transcript.metadata,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Transcription] Job ${jobId} failed:`, errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Log progress to job queue
   */
  private async logProgress(
    jobId: string,
    message: string,
    progress: number
  ): Promise<void> {
    try {
      await jobQueue.log(jobId, 'info', message, { progress });
    } catch (error) {
      // Non-fatal if logging fails
      console.warn(`Failed to log progress for job ${jobId}:`, error);
    }
  }

  /**
   * Queue a new transcription job
   */
  async queueTranscription(
    videoId: string,
    audioPath: string,
    options: {
      segmentId?: string;
      config?: Partial<TranscriptionConfig>;
      priority?: number;
      createdBy?: string;
    } = {}
  ): Promise<string> {
    const outputDir = path.join(
      process.cwd(),
      'data',
      'transcripts',
      videoId
    );

    const payload: TranscriptionJobPayload = {
      videoId,
      segmentId: options.segmentId,
      audioPath,
      outputDir,
      config: {
        ...DEFAULT_TRANSCRIPTION_CONFIG,
        ...(options.config || {}),
      },
    };

    const job = await jobQueue.add(
      'transcription',
      payload,
      {
        priority: options.priority ?? 0,
        maxAttempts: 3,
        createdBy: options.createdBy,
        tags: ['transcription', videoId],
      }
    );

    console.log(`[Transcription] Queued job ${job.id} for video ${videoId}`);

    return job.id;
  }

  /**
   * Get transcription job status
   */
  async getJobStatus(jobId: string): Promise<{
    status: string;
    progress?: number;
    result?: TranscriptionJobResult;
    error?: string;
  }> {
    const jobs = await jobQueue.getJobs({
      status: undefined,
      limit: 1,
    });

    // This is a simplified lookup - in production, you'd query by ID
    const job = jobs.find(j => j.id === jobId);

    if (!job) {
      return { status: 'not_found' };
    }

    // Get latest log for progress
    const logs = await jobQueue.getLogs(jobId);
    const progressLog = logs.find(l => (l.metadata as any)?.progress !== undefined);
    const progress = progressLog ? (progressLog.metadata as any).progress : undefined;

    return {
      status: job.status,
      progress,
      result: job.result as TranscriptionJobResult | undefined,
      error: job.error ? (job.error as any).message : undefined,
    };
  }

  /**
   * Cancel a pending transcription job
   */
  async cancelJob(jobId: string, reason?: string): Promise<boolean> {
    try {
      await jobQueue.cancel(jobId, reason);
      return true;
    } catch (error) {
      console.error(`Failed to cancel job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Retry a failed transcription job
   */
  async retryJob(jobId: string): Promise<boolean> {
    // Implementation would involve resetting job status
    // For now, just log intent
    console.log(`[Transcription] Retry requested for job ${jobId}`);
    return true;
  }

  /**
   * Get all transcription jobs for a video
   */
  async getJobsForVideo(videoId: string): Promise<Array<{
    id: string;
    status: string;
    createdAt: Date;
    completedAt?: Date;
  }>> {
    const jobs = await jobQueue.getJobs({
      type: 'transcription',
      limit: 100,
    });

    return jobs
      .filter(job => {
        const payload = job.payload as TranscriptionJobPayload;
        return payload.videoId === videoId;
      })
      .map(job => ({
        id: job.id,
        status: job.status,
        createdAt: job.createdAt,
        completedAt: job.completedAt || undefined,
      }));
  }

  /**
   * Clean up old transcription outputs
   */
  async cleanupOldTranscripts(olderThanDays: number = 30): Promise<number> {
    const transcriptsDir = path.join(process.cwd(), 'data', 'transcripts');
    let cleaned = 0;

    try {
      const videos = await fs.readdir(transcriptsDir);
      const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

      for (const videoId of videos) {
        const videoDir = path.join(transcriptsDir, videoId);
        const stats = await fs.stat(videoDir);

        if (stats.mtime.getTime() < cutoff) {
          await fs.rm(videoDir, { recursive: true });
          cleaned++;
        }
      }
    } catch (error) {
      console.error('Failed to cleanup transcripts:', error);
    }

    return cleaned;
  }
}

// Export singleton handler
export const transcriptionHandler = new TranscriptionHandler();

// Export job type constant
export const TRANSCRIPTION_JOB_TYPE = 'transcription';

// Export handler function for job worker
export async function handleTranscriptionJob(
  jobId: string,
  payload: TranscriptionJobPayload
): Promise<TranscriptionJobResult> {
  return transcriptionHandler.processTranscription(jobId, payload);
}
