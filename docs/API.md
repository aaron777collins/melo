# HAOS API Documentation

## Overview

HAOS provides a REST API for interacting with Matrix homeserver functionality, administrative tasks, and real-time communication features. The API follows RESTful conventions and uses JSON for request/response payloads.

## Base URL

```
https://your-haos-domain.com/api
```

## Authentication

Most HAOS API endpoints use Matrix authentication with access tokens stored in HTTP-only cookies. Some endpoints may require additional authorization based on user roles.

### Authentication Flow

1. Login via `/api/auth/login` with Matrix credentials
2. Receive session cookie automatically
3. Include cookie in subsequent requests

### Error Responses

All endpoints follow consistent error response format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  }
}
```

## Rate Limiting

All API endpoints implement rate limiting to prevent abuse:

- **Default Limit**: 100 requests per minute per IP
- **Rate Limit Headers**:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining in window
  - `X-RateLimit-Reset`: Unix timestamp when limit resets
  - `X-RateLimit-Used`: Number of requests used

### Rate Limit Response (HTTP 429)

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again later.",
    "retry_after_ms": 30000
  },
  "rateLimit": {
    "limit": 100,
    "remaining": 0,
    "reset": 1645123456,
    "used": 100
  }
}
```

## API Endpoints

### Health & Status

#### GET /api/health

Check system health and status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-02-16T10:30:00.000Z",
  "uptime": 3600,
  "version": "0.1.0",
  "node": "v20.11.0",
  "memory": {
    "rss": 123456789,
    "heapTotal": 87654321,
    "heapUsed": 76543210,
    "external": 1234567,
    "arrayBuffers": 987654
  },
  "environment": "production"
}
```

#### GET /api/ready

Check if service is ready to accept requests.

**Response:**
```json
{
  "ready": true,
  "timestamp": "2024-02-16T10:30:00.000Z"
}
```

### Authentication

#### POST /api/auth/login

Authenticate user with Matrix homeserver credentials.

**Request Body:**
```json
{
  "username": "alice",
  "password": "secure_password",
  "homeserverUrl": "https://matrix.example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "session": {
      "userId": "@alice:example.com",
      "accessToken": "...",
      "deviceId": "...",
      "homeserverUrl": "https://matrix.example.com"
    },
    "user": {
      "userId": "@alice:example.com",
      "displayName": "Alice",
      "avatarUrl": "mxc://example.com/avatar"
    }
  }
}
```

**Error Responses:**
- `400`: Missing username/password
- `401`: Invalid credentials
- `500`: Login failed

### Administrative APIs

#### GET /api/admin/jobs

List background jobs with filtering options.

**Query Parameters:**
- `status` (optional): Filter by job status
- `type` (optional): Filter by job type
- `limit` (optional): Number of results (max 100, default 50)
- `offset` (optional): Pagination offset (default 0)
- `orderBy` (optional): Sort field (`createdAt`, `scheduledAt`, `priority`)
- `orderDir` (optional): Sort direction (`asc`, `desc`)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "job_123",
      "type": "notification",
      "status": "completed",
      "priority": 0,
      "payload": {...},
      "createdAt": "2024-02-16T10:00:00.000Z",
      "scheduledAt": "2024-02-16T10:01:00.000Z",
      "completedAt": "2024-02-16T10:01:30.000Z"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "orderBy": "createdAt",
    "orderDir": "desc"
  }
}
```

#### POST /api/admin/jobs

Create a new background job.

**Request Body:**
```json
{
  "type": "notification",
  "payload": {
    "userId": "@alice:example.com",
    "message": "Welcome!"
  },
  "options": {
    "priority": 1,
    "delay": 1000
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "job_124",
    "type": "notification",
    "status": "pending",
    "priority": 1,
    "payload": {...},
    "createdAt": "2024-02-16T10:30:00.000Z",
    "scheduledAt": "2024-02-16T10:30:01.000Z"
  }
}
```

#### GET /api/admin/jobs/{jobId}

Get details for a specific job.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "job_123",
    "type": "notification",
    "status": "completed",
    "priority": 0,
    "payload": {...},
    "result": {...},
    "error": null,
    "createdAt": "2024-02-16T10:00:00.000Z",
    "scheduledAt": "2024-02-16T10:01:00.000Z",
    "completedAt": "2024-02-16T10:01:30.000Z"
  }
}
```

#### GET /api/admin/jobs/{jobId}/logs

Get logs for a specific job.

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "timestamp": "2024-02-16T10:01:00.000Z",
        "level": "info",
        "message": "Job started",
        "metadata": {}
      }
    ]
  }
}
```

#### GET /api/admin/jobs/stats

Get job queue statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 1250,
    "by_status": {
      "pending": 45,
      "running": 5,
      "completed": 1150,
      "failed": 50
    },
    "by_type": {
      "notification": 800,
      "cleanup": 300,
      "backup": 150
    }
  }
}
```

#### GET /api/admin/workers

Get worker process status.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "worker_1",
      "status": "active",
      "currentJob": "job_125",
      "processed": 245,
      "failed": 2,
      "lastActive": "2024-02-16T10:29:00.000Z"
    }
  ]
}
```

### Matrix Proxy APIs

**Note:** Many Matrix-related endpoints have been deprecated in favor of direct Matrix SDK usage on the client side.

#### POST /api/servers *(Deprecated)*

**Status**: HTTP 410 Gone

Use Matrix SDK directly to create spaces/servers.

#### PATCH/DELETE/POST /api/channels *(Deprecated)*

**Status**: HTTP 410 Gone

Use Matrix API directly for channel/room operations.

### Live Communication

#### GET /api/live

Get live communication status and active sessions.

**Response:**
```json
{
  "success": true,
  "data": {
    "activeRooms": [
      {
        "roomId": "!room:example.com",
        "participants": 3,
        "type": "voice"
      }
    ],
    "serverStatus": "online"
  }
}
```

### File & Media

#### POST /api/uploadthing

Handle file uploads via UploadThing service.

**Note**: This endpoint uses UploadThing's API format. Refer to UploadThing documentation for request/response format.

### Utility Endpoints

#### GET /api/og-preview

Generate Open Graph preview data for URLs.

**Query Parameters:**
- `url`: URL to generate preview for

**Response:**
```json
{
  "success": true,
  "data": {
    "title": "Page Title",
    "description": "Page description",
    "image": "https://example.com/image.jpg",
    "url": "https://example.com"
  }
}
```

#### GET /api/test-rate-limit

Test endpoint for rate limiting functionality.

**Response:**
```json
{
  "success": true,
  "message": "Rate limit test endpoint",
  "rateLimit": {
    "limit": 100,
    "remaining": 99,
    "reset": 1645123456,
    "used": 1
  }
}
```

#### GET /api/members/{memberId}

Get member information by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "@alice:example.com",
    "displayName": "Alice",
    "avatarUrl": "mxc://example.com/avatar",
    "role": "user",
    "joinedAt": "2024-02-16T10:00:00.000Z"
  }
}
```

#### POST /api/direct-messages

Create or get direct message room.

**Request Body:**
```json
{
  "userId": "@bob:example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "roomId": "!dm_room:example.com",
    "created": false,
    "participants": ["@alice:example.com", "@bob:example.com"]
  }
}
```

#### POST /api/messages

Send message to room.

**Request Body:**
```json
{
  "roomId": "!room:example.com",
  "content": {
    "msgtype": "m.text",
    "body": "Hello, world!"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "eventId": "$event_id:example.com",
    "timestamp": "2024-02-16T10:30:00.000Z"
  }
}
```

## Server Management APIs

### Server Information

#### GET /api/servers/{serverId}

Get server/space details.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "!space:example.com",
    "name": "My Server",
    "topic": "Server description",
    "avatarUrl": "mxc://example.com/avatar",
    "memberCount": 25,
    "roomCount": 5
  }
}
```

### Server Operations

#### POST /api/servers/{serverId}/invite-code

Generate invite code for server.

**Response:**
```json
{
  "success": true,
  "data": {
    "inviteCode": "abc123",
    "inviteUrl": "https://haos.example.com/invite/abc123",
    "expiresAt": "2024-02-17T10:30:00.000Z"
  }
}
```

#### POST /api/servers/{serverId}/leave

Leave a server.

**Response:**
```json
{
  "success": true,
  "message": "Successfully left server"
}
```

#### GET /api/servers/{serverId}/audit-log

Get server audit log.

**Query Parameters:**
- `limit` (optional): Number of entries (default 50)
- `before` (optional): Get entries before this event ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "$audit_1:example.com",
      "action": "member_join",
      "userId": "@alice:example.com",
      "timestamp": "2024-02-16T10:25:00.000Z",
      "metadata": {
        "invitedBy": "@admin:example.com"
      }
    }
  ]
}
```

## WebRTC Integration

HAOS integrates with Matrix's native WebRTC capabilities for voice and video calls. The integration is handled primarily client-side through the Matrix SDK.

### Voice/Video Call Flow

1. Client initiates call through Matrix SDK
2. HAOS UI updates to show call interface
3. WebRTC negotiation handled by Matrix homeserver
4. HAOS tracks call state for UI updates

### Real-time Features

- **Voice Channels**: Persistent voice rooms for server members
- **Direct Calls**: One-on-one voice/video calls
- **Screen Sharing**: Share screen during calls
- **Call Recording**: Server-side call recording (if enabled)

## Error Codes

| Code | Description |
|------|-------------|
| `M_UNAUTHORIZED` | Authentication required or invalid |
| `M_FORBIDDEN` | Insufficient permissions |
| `M_NOT_FOUND` | Resource not found |
| `M_BAD_JSON` | Invalid JSON in request |
| `M_MISSING_PARAM` | Required parameter missing |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `INTERNAL_ERROR` | Server error |

## SDK Usage Examples

### JavaScript/TypeScript

```typescript
import { api } from '@/lib/api-client';

// Get health status
const health = await api.get('/api/health');

// Login user
const login = await api.post('/api/auth/login', {
  username: 'alice',
  password: 'password',
  homeserverUrl: 'https://matrix.example.com'
});

// Create background job
const job = await api.post('/api/admin/jobs', {
  type: 'notification',
  payload: { userId: '@alice:example.com', message: 'Hello!' }
});

// Handle rate limiting
try {
  const response = await api.get('/api/data', {
    retryOnRateLimit: true,
    maxRetries: 3
  });
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log(`Rate limited. Retry after ${error.retryAfter}ms`);
  }
}
```

### cURL Examples

```bash
# Health check
curl -X GET https://haos.example.com/api/health

# Login
curl -X POST https://haos.example.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"password"}'

# Get jobs (with authentication cookie)
curl -X GET https://haos.example.com/api/admin/jobs \
  -H "Cookie: session=..." \
  -G -d "status=pending" -d "limit=10"

# Create job
curl -X POST https://haos.example.com/api/admin/jobs \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{"type":"notification","payload":{"message":"Hello"}}'
```

## Development & Testing

### Running Locally

```bash
# Start development server
npm run dev

# API available at http://localhost:3000/api
```

### API Explorer

When running in development mode, access the interactive API explorer at:
```
http://localhost:3000/docs
```

### Testing Endpoints

Use the built-in test endpoint to verify rate limiting:
```bash
curl http://localhost:3000/api/test-rate-limit
```

## Version History

- **v0.1.0**: Initial API implementation
  - Basic health and auth endpoints
  - Admin job management
  - Matrix integration setup
  - Rate limiting implementation

---

*Last Updated: February 2024*
*API Version: v0.1.0*