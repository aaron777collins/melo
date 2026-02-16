# HAOS API Documentation (Generated)

*This documentation is auto-generated from source code. Last updated: 2026-02-16T23:11:22.212Z*

## Overview

This document provides detailed information about all HAOS API endpoints, automatically extracted from the source code.

## Real-time

### GET /api/_disabled/livekit

**Parameters:**
- `room` *(optional)*: room parameter
- `username` *(optional)*: username parameter

**Responses:**
- **400**: Bad Request
- **500**: Internal Server Error

---

### GET /api/live

**Responses:**
- **200**: Success

---

## Admin

### GET /api/admin/jobs/{jobId}/logs

Job Logs API

Provides endpoints for job log management.
/

**Parameters:**
- `jobId` *(required)*: jobId identifier

**Responses:**
- **200**: Success

---

### GET /api/admin/jobs/{jobId}

Individual Job Management API

Provides endpoints for managing specific jobs.
/

**Parameters:**
- `jobId` *(required)*: jobId identifier
- `reason` *(optional)*: reason parameter

**Responses:**
- **200**: Success

---

### DELETE /api/admin/jobs/{jobId}

Individual Job Management API

Provides endpoints for managing specific jobs.
/

**Parameters:**
- `jobId` *(required)*: jobId identifier
- `reason` *(optional)*: reason parameter

**Responses:**
- **200**: Success

---

### POST /api/admin/jobs/{jobId}

Individual Job Management API

Provides endpoints for managing specific jobs.
/

**Parameters:**
- `jobId` *(required)*: jobId identifier
- `reason` *(optional)*: reason parameter

**Responses:**
- **200**: Success

---

### GET /api/admin/jobs

List Background Jobs

Retrieves a paginated list of background jobs with optional filtering by status and type.
Supports sorting and limiting results.
/api/admin/jobs:
  get:
    summary: List background jobs
    description: Get paginated list of jobs with filtering and sorting options
    tags: [Admin]
    security:
      - cookieAuth: []
    parameters:
      - in: query
        name: status
        schema:
          type: string
          enum: [pending, running, completed, failed]
        description: Filter jobs by status
      - in: query
        name: type
        schema:
          type: string
        description: Filter jobs by type
      - $ref: '#/components/parameters/limitParam'
      - $ref: '#/components/parameters/offsetParam'
      - $ref: '#/components/parameters/orderByParam'
      - $ref: '#/components/parameters/orderDirParam'
    responses:
      200:
        description: List of jobs retrieved successfully
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                  example: true
                data:
                  type: array
                  items:
                    $ref: '#/components/schemas/BackgroundJob'
                pagination:
                  type: object
                  properties:
                    limit:
                      type: integer
                    offset:
                      type: integer
                    orderBy:
                      type: string
                    orderDir:
                      type: string
      401:
        $ref: '#/components/responses/Unauthorized'
      500:
        $ref: '#/components/responses/Error'
/

**Parameters:**
- `status` *(optional)*: status parameter
- `type` *(optional)*: type parameter
- `limit` *(optional)*: limit parameter
- `offset` *(optional)*: offset parameter
- `orderBy` *(optional)*: orderBy parameter
- `orderDir` *(optional)*: orderDir parameter

**Responses:**
- **200**: Success

---

### POST /api/admin/jobs

Create Background Job

Creates a new background job with the specified type and payload.
Jobs are executed asynchronously by worker processes.
/api/admin/jobs:
  post:
    summary: Create new background job
    description: Add a new job to the background processing queue
    tags: [Admin]
    security:
      - cookieAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - type
              - payload
            properties:
              type:
                type: string
                description: Job type (must be a registered job handler)
                example: notification
              payload:
                type: object
                description: Job-specific data
                example:
                  userId: "@alice:example.com"
                  message: "Welcome to HAOS!"
              options:
                type: object
                description: Job execution options
                properties:
                  priority:
                    type: integer
                    minimum: 0
                    maximum: 10
                    description: Job priority (higher numbers = higher priority)
                    example: 1
                  delay:
                    type: integer
                    description: Delay before execution in milliseconds
                    example: 5000
                  retries:
                    type: integer
                    description: Maximum retry attempts
                    example: 3
    responses:
      200:
        description: Job created successfully
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                  example: true
                data:
                  $ref: '#/components/schemas/BackgroundJob'
      400:
        description: Invalid job type or missing required fields
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
      401:
        $ref: '#/components/responses/Unauthorized'
      500:
        $ref: '#/components/responses/Error'
/

**Parameters:**
- `status` *(optional)*: status parameter
- `type` *(optional)*: type parameter
- `limit` *(optional)*: limit parameter
- `offset` *(optional)*: offset parameter
- `orderBy` *(optional)*: orderBy parameter
- `orderDir` *(optional)*: orderDir parameter

**Request Body:**
```json
{
  "example": "Request body structure not extracted"
}
```

**Responses:**
- **200**: Success

---

### GET /api/admin/jobs/stats

Job Queue Statistics API

Provides job queue statistics and metrics.
/

**Responses:**
- **200**: Success

---

### GET /api/admin/workers

Workers Management API

Provides endpoints for worker process management and monitoring.
/

**Responses:**
- **200**: Success

---

### POST /api/admin/workers

Workers Management API

Provides endpoints for worker process management and monitoring.
/

**Request Body:**
```json
{
  "example": "Request body structure not extracted"
}
```

**Responses:**
- **200**: Success

---

## Authentication

### POST /api/auth/login

Matrix Authentication Login

Authenticates a user with Matrix homeserver credentials and establishes a session.
Returns user information and sets HTTP-only session cookies.
/api/auth/login:
  post:
    summary: Login with Matrix credentials
    description: Authenticate user with Matrix homeserver and create session
    tags: [Authentication]
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - username
              - password
            properties:
              username:
                type: string
                description: Matrix username (without @ or homeserver)
                example: alice
              password:
                type: string
                description: Matrix account password
                example: secure_password123
              homeserverUrl:
                type: string
                format: uri
                description: Matrix homeserver URL (optional, uses default if not provided)
                example: https://matrix.example.com
    responses:
      200:
        description: Login successful
        headers:
          Set-Cookie:
            description: HTTP-only session cookie
            schema:
              type: string
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                  example: true
                data:
                  type: object
                  properties:
                    session:
                      $ref: '#/components/schemas/MatrixSession'
                    user:
                      $ref: '#/components/schemas/MatrixUser'
      400:
        description: Missing required fields
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                  example: false
                error:
                  type: object
                  properties:
                    code:
                      type: string
                      example: M_BAD_JSON
                    message:
                      type: string
                      example: Username and password are required
      401:
        description: Invalid credentials
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
      500:
        description: Login failed
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorResponse'
/

**Request Body:**
```json
{
  "example": "Request body structure not extracted"
}
```

**Responses:**
- **200**: Success

---

## General

### PATCH /api/channels *(Deprecated)*

> **⚠️ Deprecated**: This endpoint is deprecated and may be removed in future versions.

**Responses:**
- **410**: Gone (Deprecated)

---

### DELETE /api/channels *(Deprecated)*

> **⚠️ Deprecated**: This endpoint is deprecated and may be removed in future versions.

**Responses:**
- **410**: Gone (Deprecated)

---

### POST /api/channels *(Deprecated)*

> **⚠️ Deprecated**: This endpoint is deprecated and may be removed in future versions.

**Responses:**
- **410**: Gone (Deprecated)

---

### GET /api/direct-messages *(Deprecated)*

> **⚠️ Deprecated**: This endpoint is deprecated and may be removed in future versions.

**Responses:**
- **410**: Gone (Deprecated)

---

### POST /api/direct-messages *(Deprecated)*

> **⚠️ Deprecated**: This endpoint is deprecated and may be removed in future versions.

**Responses:**
- **410**: Gone (Deprecated)

---

### POST /api/messages

POST /api/messages

Send a message to a Matrix room
Query params:
- channelId: Matrix room ID to send message to
- serverId: Parent space ID (for logging/validation)
Body:
- content: Message text
/

**Parameters:**
- `channelId` *(optional)*: channelId parameter
- `serverId` *(optional)*: serverId parameter

**Request Body:**
```json
{
  "example": "Request body structure not extracted"
}
```

**Responses:**
- **400**: Bad Request
- **401**: Unauthorized
- **500**: Internal Server Error

---

### GET /api/og-preview

API route handler for OpenGraph metadata extraction

/

**Parameters:**
- `url` *(optional)*: url parameter

**Responses:**
- **400**: Bad Request
- **408**: HTTP 408
- **413**: HTTP 413
- **500**: Internal Server Error

---

### POST /api/servers *(Deprecated)*

Server (Space) API

Creating servers is now handled client-side via Matrix SDK in InitialModal.
This API route is deprecated.
/

> **⚠️ Deprecated**: This endpoint is deprecated and may be removed in future versions.

**Responses:**
- **410**: Gone (Deprecated)

---

### GET /api/test-rate-limit

Test endpoint for verifying rate limiting functionality

/

**Responses:**
- **200**: Success

---

### POST /api/test-rate-limit

Test endpoint for verifying rate limiting functionality

/

**Responses:**
- **200**: Success

---

## System

### GET /api/health

Health Check Endpoint

Returns system health status including memory usage, uptime, and environment info.
This endpoint is used by monitoring systems and load balancers.
/api/health:
  get:
    summary: Check system health
    description: Returns detailed system health information including memory usage, uptime, and version
    tags: [System]
    responses:
      200:
        description: System is healthy
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/HealthStatus'
      503:
        description: System is unhealthy
        content:
          application/json:
            schema:
              type: object
              properties:
                status:
                  type: string
                  example: unhealthy
                timestamp:
                  type: string
                  format: date-time
                error:
                  type: string
                  example: Health check failed
/

**Responses:**
- **200**: Success

---

### GET /api/ready

**Responses:**
- **200**: Success

---

## Members

### PATCH /api/members/{memberId} *(Deprecated)*

> **⚠️ Deprecated**: This endpoint is deprecated and may be removed in future versions.

**Parameters:**
- `memberId` *(required)*: memberId identifier

**Responses:**
- **410**: Gone (Deprecated)

---

### DELETE /api/members/{memberId} *(Deprecated)*

> **⚠️ Deprecated**: This endpoint is deprecated and may be removed in future versions.

**Parameters:**
- `memberId` *(required)*: memberId identifier

**Responses:**
- **410**: Gone (Deprecated)

---

### POST /api/members/{memberId} *(Deprecated)*

> **⚠️ Deprecated**: This endpoint is deprecated and may be removed in future versions.

**Parameters:**
- `memberId` *(required)*: memberId identifier

**Responses:**
- **410**: Gone (Deprecated)

---

## Servers

### GET /api/servers/{serverId}/audit-log

GET /api/servers/[serverId]/audit-log

Fetches audit log entries for a server with filtering and pagination.
Requires moderator+ permissions.
/

**Parameters:**
- `serverId` *(required)*: serverId identifier
- `page` *(optional)*: page parameter
- `limit` *(optional)*: limit parameter
- `action` *(optional)*: action parameter
- `actorId` *(optional)*: actorId parameter
- `startDate` *(optional)*: startDate parameter
- `endDate` *(optional)*: endDate parameter

**Responses:**
- **401**: Unauthorized
- **500**: Internal Server Error

---

### POST /api/servers/{serverId}/audit-log

POST /api/servers/[serverId]/audit-log

Creates a new audit log entry.
Used internally by other parts of the system to log actions.
/

**Parameters:**
- `serverId` *(required)*: serverId identifier
- `page` *(optional)*: page parameter
- `limit` *(optional)*: limit parameter
- `action` *(optional)*: action parameter
- `actorId` *(optional)*: actorId parameter
- `startDate` *(optional)*: startDate parameter
- `endDate` *(optional)*: endDate parameter

**Request Body:**
```json
{
  "example": "Request body structure not extracted"
}
```

**Responses:**
- **401**: Unauthorized
- **500**: Internal Server Error

---

### PATCH /api/servers/{serverId}/invite-code *(Deprecated)*

> **⚠️ Deprecated**: This endpoint is deprecated and may be removed in future versions.

**Parameters:**
- `serverId` *(required)*: serverId identifier

**Responses:**
- **410**: Gone (Deprecated)

---

### DELETE /api/servers/{serverId}/invite-code *(Deprecated)*

> **⚠️ Deprecated**: This endpoint is deprecated and may be removed in future versions.

**Parameters:**
- `serverId` *(required)*: serverId identifier

**Responses:**
- **410**: Gone (Deprecated)

---

### POST /api/servers/{serverId}/invite-code *(Deprecated)*

> **⚠️ Deprecated**: This endpoint is deprecated and may be removed in future versions.

**Parameters:**
- `serverId` *(required)*: serverId identifier

**Responses:**
- **410**: Gone (Deprecated)

---

### PATCH /api/servers/{serverId}/leave *(Deprecated)*

> **⚠️ Deprecated**: This endpoint is deprecated and may be removed in future versions.

**Parameters:**
- `serverId` *(required)*: serverId identifier

**Responses:**
- **410**: Gone (Deprecated)

---

### DELETE /api/servers/{serverId}/leave *(Deprecated)*

> **⚠️ Deprecated**: This endpoint is deprecated and may be removed in future versions.

**Parameters:**
- `serverId` *(required)*: serverId identifier

**Responses:**
- **410**: Gone (Deprecated)

---

### POST /api/servers/{serverId}/leave *(Deprecated)*

> **⚠️ Deprecated**: This endpoint is deprecated and may be removed in future versions.

**Parameters:**
- `serverId` *(required)*: serverId identifier

**Responses:**
- **410**: Gone (Deprecated)

---

### PATCH /api/servers/{serverId} *(Deprecated)*

> **⚠️ Deprecated**: This endpoint is deprecated and may be removed in future versions.

**Parameters:**
- `serverId` *(required)*: serverId identifier

**Responses:**
- **410**: Gone (Deprecated)

---

### DELETE /api/servers/{serverId} *(Deprecated)*

> **⚠️ Deprecated**: This endpoint is deprecated and may be removed in future versions.

**Parameters:**
- `serverId` *(required)*: serverId identifier

**Responses:**
- **410**: Gone (Deprecated)

---

