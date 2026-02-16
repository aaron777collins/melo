# Background Job Queue System

A comprehensive background job queue system for HAOS v2, enabling async processing of tasks like email sending, file processing, notifications, and more.

## Features

- ✅ **Redis/Database-backed Job Queue**: Uses PostgreSQL as the job store
- ✅ **Worker Process Management**: Supports multiple concurrent workers
- ✅ **Retry Logic with Exponential Backoff**: Automatic retry with configurable attempts
- ✅ **Admin Interface**: Web-based monitoring and management
- ✅ **Job Types**: Pre-built handlers for common operations
- ✅ **Real-time Monitoring**: Live stats, logs, and worker status
- ✅ **Priority Queuing**: Higher priority jobs are processed first
- ✅ **Scheduled Jobs**: Jobs can be scheduled for future execution

## Architecture

```
┌─────────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   Job Producers     │    │   Job Queue      │    │   Worker Processes  │
│                     │    │                  │    │                     │
│ - API endpoints     │───▶│ - PostgreSQL     │◀───│ - JobWorker         │
│ - Scheduled tasks   │    │ - Job table      │    │ - Job handlers      │
│ - Event handlers    │    │ - JobLog table   │    │ - Retry logic       │
│                     │    │ - Worker table   │    │                     │
└─────────────────────┘    └──────────────────┘    └─────────────────────┘
                                    │
                                    │
                           ┌──────────────────┐
                           │  Admin Interface │
                           │                  │
                           │ - Job monitoring │
                           │ - Worker status  │
                           │ - Statistics     │
                           │ - Manual actions │
                           └──────────────────┘
```

## Database Schema

### Jobs Table
- **Job Management**: ID, type, status, priority, payload, result, error
- **Scheduling**: scheduledAt, startedAt, completedAt
- **Retry Logic**: attempts, maxAttempts, retryAt
- **Worker Tracking**: workerId, workerPid
- **Metadata**: createdBy, tags, timestamps

### JobLog Table
- **Execution Logs**: level, message, metadata, timestamp
- **Debugging**: Detailed execution traces per job

### Worker Table
- **Worker Registry**: workerId, PID, hostname, status
- **Configuration**: concurrency, jobTypes
- **Statistics**: jobsProcessed, success/failure counts
- **Health Monitoring**: lastHeartbeat

## Job Types

### Email Operations
- `email:send` - Send single email
- `email:batch` - Send batch emails with rate limiting
- `email:digest` - Send digest emails with aggregated content

### File Processing
- `file:process-upload` - Process uploaded files (validation, metadata extraction)
- `file:generate-thumbnails` - Generate image/video thumbnails
- `file:compress-media` - Compress images and videos
- `file:virus-scan` - Scan files for malware

### Notifications
- `notification:push` - Send push notifications
- `notification:batch` - Send batch notifications
- `notification:digest` - Send digest notifications

### Matrix Operations
- `matrix:room-cleanup` - Clean up old room data
- `matrix:user-export` - Export user data
- `matrix:sync-profile` - Sync profile between Matrix and HAOS

### System Cleanup
- `cleanup:old-files` - Remove old files from filesystem
- `cleanup:expired-invites` - Remove expired invite codes
- `cleanup:audit-logs` - Clean up old audit logs
- `cleanup:job-logs` - Clean up old job logs

## Usage

### Adding Jobs Programmatically

```typescript
import { jobQueue } from "@/lib/jobs/queue";

// Simple email job
await jobQueue.add("email:send", {
  to: "user@example.com",
  subject: "Welcome!",
  html: "<p>Welcome to HAOS!</p>",
});

// High priority job with retry options
await jobQueue.add("file:process-upload", {
  fileId: "file_123",
  filePath: "/uploads/image.jpg",
  contentType: "image/jpeg",
}, {
  priority: 10,
  maxAttempts: 5,
  tags: ["upload", "important"],
});

// Scheduled job
await jobQueue.add("cleanup:old-files", {
  directory: "/tmp",
  olderThanDays: 30,
}, {
  scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
});
```

### Starting Workers

```bash
# Start a worker with default settings
npx tsx scripts/start-worker.ts

# Start worker with custom concurrency
npx tsx scripts/start-worker.ts --concurrency 5

# Start worker for specific job types
npx tsx scripts/start-worker.ts --types email,notification

# Start worker with custom settings
npx tsx scripts/start-worker.ts \
  --concurrency 10 \
  --types email,file,notification \
  --worker-id prod-worker-1 \
  --poll-interval 500
```

### Admin Interface

Access the admin interface at `/admin/jobs` to:

- **Monitor Jobs**: View job status, logs, and details
- **Manage Workers**: See worker status and performance
- **View Statistics**: Queue stats, job type distribution, performance metrics
- **Manual Actions**: Create jobs, retry failed jobs, cancel jobs

## API Endpoints

### Job Management
- `GET /api/admin/jobs` - List jobs with filtering
- `POST /api/admin/jobs` - Create new job
- `GET /api/admin/jobs/[jobId]` - Get job details
- `DELETE /api/admin/jobs/[jobId]` - Cancel job
- `POST /api/admin/jobs/[jobId]/retry` - Retry failed job
- `GET /api/admin/jobs/[jobId]/logs` - Get job logs
- `GET /api/admin/jobs/stats` - Get queue statistics

### Worker Management
- `GET /api/admin/workers` - List workers
- `POST /api/admin/workers/cleanup` - Cleanup dead workers

## Configuration

### Environment Variables

```env
# Database (required)
DATABASE_URL="postgresql://user:password@localhost:5432/haos"

# Job Queue Settings (optional)
JOB_QUEUE_DEFAULT_CONCURRENCY=1
JOB_QUEUE_POLL_INTERVAL=1000
JOB_QUEUE_HEARTBEAT_INTERVAL=30000
JOB_QUEUE_MAX_ATTEMPTS=3
```

### Worker Configuration

Workers can be configured via:
- **Command line arguments** (see `scripts/start-worker.ts`)
- **Environment variables**
- **Configuration files** (future enhancement)

## Monitoring & Observability

### Real-time Stats
- Queue size by status (pending, processing, completed, failed)
- Worker status and health
- Job type distribution
- Success/failure rates

### Logging
- Structured job logs with levels (info, warn, error, debug)
- Worker lifecycle events
- Performance metrics

### Health Checks
- Worker heartbeat monitoring
- Dead worker detection and cleanup
- Stale job recovery

## Production Deployment

### Multiple Workers
Run multiple worker processes for high availability:

```bash
# Primary worker (all job types)
npx tsx scripts/start-worker.ts --concurrency 5

# Specialized email worker
npx tsx scripts/start-worker.ts --types email --concurrency 10

# File processing worker
npx tsx scripts/start-worker.ts --types file --concurrency 3
```

### Process Management
Use PM2 or similar for production worker management:

```json
// ecosystem.config.js
{
  "apps": [
    {
      "name": "haos-worker-general",
      "script": "npx tsx scripts/start-worker.ts",
      "args": "--concurrency 5",
      "instances": 2,
      "autorestart": true
    },
    {
      "name": "haos-worker-email",
      "script": "npx tsx scripts/start-worker.ts", 
      "args": "--types email --concurrency 10",
      "instances": 1,
      "autorestart": true
    }
  ]
}
```

### Database Maintenance
Set up regular cleanup jobs:

```typescript
// Clean up old completed jobs (daily)
await jobQueue.add("cleanup:job-logs", {
  olderThanDays: 30,
}, {
  scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
});

// Clean up dead workers (hourly)
await cleanupDeadWorkers(5); // 5 minute timeout
```

## Extending the System

### Adding New Job Types

1. **Create a handler**:
```typescript
// lib/jobs/handlers/my-handler.ts
export const myHandler = {
  async processData(payload: any): Promise<any> {
    // Your logic here
    return { success: true };
  }
};
```

2. **Register the handler**:
```typescript
// lib/jobs/handlers/index.ts
import { myHandler } from "./my-handler";

export const jobHandlers = {
  // ... existing handlers
  "my:process-data": myHandler.processData,
};
```

3. **Use the new job type**:
```typescript
await jobQueue.add("my:process-data", { data: "example" });
```

### Custom Worker Logic

Extend the `JobWorker` class for custom behavior:

```typescript
class CustomWorker extends JobWorker {
  async onJobStart(job: Job) {
    // Custom pre-processing
  }
  
  async onJobComplete(job: Job, result: any) {
    // Custom post-processing
  }
}
```

## Troubleshooting

### Common Issues

1. **Jobs stuck in processing**: Use admin interface to check worker status
2. **High failure rate**: Check job logs for error patterns
3. **Performance issues**: Monitor queue size and worker concurrency
4. **Dead workers**: Run cleanup API endpoint

### Debug Mode

Enable detailed logging:
```bash
DEBUG=jobs:* npx tsx scripts/start-worker.ts
```

### Database Queries

Useful queries for debugging:

```sql
-- Jobs by status
SELECT status, COUNT(*) FROM "Job" GROUP BY status;

-- Failed jobs with errors
SELECT type, error FROM "Job" WHERE status = 'failed';

-- Worker performance
SELECT workerId, jobsProcessed, jobsSucceeded, jobsFailed 
FROM "Worker" WHERE status = 'active';
```

## Future Enhancements

- **Redis Support**: Add Redis as an alternative to PostgreSQL
- **Job Scheduling**: Cron-like job scheduling
- **Job Priorities**: More granular priority levels
- **Batch Operations**: Bulk job management
- **Metrics Export**: Prometheus/Grafana integration
- **Job Dependencies**: Job chaining and dependencies
- **Dead Letter Queue**: Failed job quarantine
- **Web Hooks**: Job completion notifications