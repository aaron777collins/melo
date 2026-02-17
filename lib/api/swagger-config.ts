/**
 * OpenAPI/Swagger Configuration for Melo API
 * 
 * This file provides configuration and utilities for OpenAPI documentation
 * and Swagger UI integration.
 */

export interface SwaggerConfig {
  definition: any;
  apis: string[];
}

/**
 * OpenAPI 3.0 specification for Melo API
 */
export const openApiDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Melo API',
    version: '0.1.0',
    description: `
# Home Assistant for Open Source (Melo) API

Melo provides a comprehensive REST API for managing Matrix-based communication,
administrative tasks, and real-time features.

## Features

- **Matrix Integration**: Direct integration with Matrix homeserver
- **Real-time Communication**: Voice, video, and text messaging
- **Administrative Tools**: Background job management, user administration
- **Rate Limiting**: Built-in protection against API abuse
- **Authentication**: Matrix-based authentication with session management

## Rate Limiting

All endpoints implement rate limiting:
- **Default**: 100 requests per minute per IP
- **Headers**: X-RateLimit-* headers provide limit information
- **Error**: HTTP 429 when limit exceeded

## Authentication

Most endpoints require authentication via Matrix session cookies.
Use the \`/api/auth/login\` endpoint to obtain a session.

## Error Handling

All errors follow a consistent format:
\`\`\`json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
\`\`\`
    `.trim(),
    termsOfService: 'https://melo.example.com/terms',
    contact: {
      name: 'Melo Support',
      url: 'https://github.com/aaron777collins/melo-v2',
      email: 'support@melo.example.com'
    },
    license: {
      name: 'MIT',
      url: 'https://github.com/aaron777collins/melo-v2/blob/main/LICENSE'
    }
  },
  externalDocs: {
    description: 'Melo Documentation',
    url: 'https://github.com/aaron777collins/melo-v2/blob/main/README.md'
  },
  servers: [
    {
      url: '{protocol}://{host}/api',
      description: 'Melo API Server',
      variables: {
        protocol: {
          enum: ['http', 'https'],
          default: 'https',
          description: 'API protocol'
        },
        host: {
          default: 'localhost:3000',
          description: 'Melo server hostname and port'
        }
      }
    }
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'session',
        description: 'Matrix session cookie obtained from login endpoint'
      },
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'Matrix Access Token',
        description: 'Matrix access token for direct API access'
      }
    },
    parameters: {
      limitParam: {
        name: 'limit',
        in: 'query',
        description: 'Maximum number of items to return',
        required: false,
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 50
        }
      },
      offsetParam: {
        name: 'offset', 
        in: 'query',
        description: 'Number of items to skip for pagination',
        required: false,
        schema: {
          type: 'integer',
          minimum: 0,
          default: 0
        }
      },
      orderByParam: {
        name: 'orderBy',
        in: 'query',
        description: 'Field to sort by',
        required: false,
        schema: {
          type: 'string',
          default: 'createdAt'
        }
      },
      orderDirParam: {
        name: 'orderDir',
        in: 'query', 
        description: 'Sort direction',
        required: false,
        schema: {
          type: 'string',
          enum: ['asc', 'desc'],
          default: 'desc'
        }
      }
    },
    responses: {
      Success: {
        description: 'Successful operation',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: {
                  type: 'boolean',
                  example: true
                },
                data: {
                  type: 'object',
                  description: 'Response data'
                }
              },
              required: ['success']
            }
          }
        }
      },
      Error: {
        description: 'Error response',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      },
      RateLimited: {
        description: 'Rate limit exceeded',
        headers: {
          'X-RateLimit-Limit': {
            description: 'Request limit per window',
            schema: { type: 'integer' }
          },
          'X-RateLimit-Remaining': {
            description: 'Remaining requests in window',
            schema: { type: 'integer' }
          },
          'X-RateLimit-Reset': {
            description: 'Unix timestamp when limit resets',
            schema: { type: 'integer' }
          },
          'X-RateLimit-Used': {
            description: 'Number of requests used',
            schema: { type: 'integer' }
          }
        },
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/RateLimitError'
            }
          }
        }
      },
      Unauthorized: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            },
            example: {
              success: false,
              error: {
                code: 'M_UNAUTHORIZED',
                message: 'Authentication required'
              }
            }
          }
        }
      },
      Forbidden: {
        description: 'Insufficient permissions',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            },
            example: {
              success: false,
              error: {
                code: 'M_FORBIDDEN',
                message: 'Access denied'
              }
            }
          }
        }
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            },
            example: {
              success: false,
              error: {
                code: 'M_NOT_FOUND',
                message: 'Resource not found'
              }
            }
          }
        }
      }
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: 'Machine-readable error code',
                example: 'M_UNAUTHORIZED'
              },
              message: {
                type: 'string',
                description: 'Human-readable error message',
                example: 'Authentication required'
              }
            },
            required: ['code', 'message']
          }
        },
        required: ['success', 'error']
      },
      RateLimitError: {
        allOf: [
          { $ref: '#/components/schemas/ErrorResponse' },
          {
            type: 'object',
            properties: {
              error: {
                type: 'object',
                properties: {
                  code: {
                    type: 'string',
                    example: 'RATE_LIMIT_EXCEEDED'
                  },
                  message: {
                    type: 'string',
                    example: 'Rate limit exceeded. Try again later.'
                  },
                  retry_after_ms: {
                    type: 'integer',
                    description: 'Milliseconds to wait before retry',
                    example: 30000
                  }
                }
              },
              rateLimit: {
                type: 'object',
                properties: {
                  limit: {
                    type: 'integer',
                    description: 'Maximum requests per window',
                    example: 100
                  },
                  remaining: {
                    type: 'integer',
                    description: 'Requests remaining in window',
                    example: 0
                  },
                  reset: {
                    type: 'integer', 
                    description: 'Unix timestamp when limit resets',
                    example: 1645123456
                  },
                  used: {
                    type: 'integer',
                    description: 'Number of requests used',
                    example: 100
                  }
                },
                required: ['limit', 'remaining', 'reset', 'used']
              }
            }
          }
        ]
      },
      HealthStatus: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['healthy', 'unhealthy'],
            example: 'healthy'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            example: '2024-02-16T10:30:00.000Z'
          },
          uptime: {
            type: 'number',
            description: 'Server uptime in seconds',
            example: 3600
          },
          version: {
            type: 'string',
            example: '0.1.0'
          },
          node: {
            type: 'string',
            example: 'v20.11.0'
          },
          memory: {
            type: 'object',
            properties: {
              rss: { type: 'integer' },
              heapTotal: { type: 'integer' },
              heapUsed: { type: 'integer' },
              external: { type: 'integer' },
              arrayBuffers: { type: 'integer' }
            }
          },
          environment: {
            type: 'string',
            example: 'production'
          }
        },
        required: ['status', 'timestamp']
      },
      MatrixSession: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            format: 'matrix-user-id',
            example: '@alice:example.com'
          },
          accessToken: {
            type: 'string',
            description: 'Matrix access token'
          },
          deviceId: {
            type: 'string',
            example: 'ABCDEFG'
          },
          homeserverUrl: {
            type: 'string',
            format: 'uri',
            example: 'https://matrix.example.com'
          },
          refreshToken: {
            type: 'string',
            description: 'Matrix refresh token (optional)'
          }
        },
        required: ['userId', 'accessToken', 'deviceId', 'homeserverUrl']
      },
      MatrixUser: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            format: 'matrix-user-id',
            example: '@alice:example.com'
          },
          displayName: {
            type: 'string',
            example: 'Alice Smith'
          },
          avatarUrl: {
            type: 'string',
            format: 'matrix-content-uri',
            example: 'mxc://example.com/avatar123'
          }
        },
        required: ['userId']
      },
      BackgroundJob: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: 'job_123456'
          },
          type: {
            type: 'string',
            example: 'notification'
          },
          status: {
            type: 'string',
            enum: ['pending', 'running', 'completed', 'failed'],
            example: 'completed'
          },
          priority: {
            type: 'integer',
            minimum: 0,
            maximum: 10,
            example: 1
          },
          payload: {
            type: 'object',
            description: 'Job-specific data'
          },
          result: {
            type: 'object',
            description: 'Job execution result (if completed)'
          },
          error: {
            type: 'string',
            description: 'Error message (if failed)'
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          },
          scheduledAt: {
            type: 'string',
            format: 'date-time'
          },
          completedAt: {
            type: 'string',
            format: 'date-time'
          }
        },
        required: ['id', 'type', 'status', 'priority', 'payload', 'createdAt']
      }
    }
  },
  tags: [
    {
      name: 'System',
      description: 'System health, status, and monitoring endpoints'
    },
    {
      name: 'Authentication', 
      description: 'User authentication and session management'
    },
    {
      name: 'Admin',
      description: 'Administrative functions (requires admin privileges)'
    },
    {
      name: 'Servers',
      description: 'Matrix space/server management and operations'
    },
    {
      name: 'Channels',
      description: 'Matrix room/channel operations'
    },
    {
      name: 'Members',
      description: 'User and member management'
    },
    {
      name: 'Messages',
      description: 'Message sending and management'
    },
    {
      name: 'Real-time',
      description: 'Live communication features (voice, video, WebRTC)'
    },
    {
      name: 'Files',
      description: 'File upload and media management'
    },
    {
      name: 'Utilities',
      description: 'General utility and helper endpoints'
    }
  ],
  paths: {
    // Paths will be populated by the auto-generation script
    // or can be manually defined here for static documentation
  }
} as const;

/**
 * Swagger UI configuration options
 */
export const swaggerUiConfig = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #1f2937; }
    .swagger-ui .scheme-container { background: #f9fafb; padding: 10px; border-radius: 4px; }
  `,
  customSiteTitle: 'Melo API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    tryItOutEnabled: true,
    filter: true,
    showExtensions: false,
    showCommonExtensions: false,
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
    docExpansion: 'list',
    deepLinking: true,
    displayOperationId: false,
    defaultModelRendering: 'model',
    showRequestHeaders: true,
    supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
    validatorUrl: null
  }
};

/**
 * Generate paths for auto-documentation
 */
export function generateApiPaths() {
  // This would be called by the generation script
  return {};
}

/**
 * Merge auto-generated paths with the base definition
 */
export function mergeApiDocumentation(autoPaths: any) {
  return {
    ...openApiDefinition,
    paths: {
      ...openApiDefinition.paths,
      ...autoPaths
    }
  };
}

/**
 * Get the complete Swagger configuration
 */
export function getSwaggerConfig(): SwaggerConfig {
  return {
    definition: openApiDefinition,
    apis: [
      './app/api/**/*.ts',
      './lib/**/*.ts'
    ]
  };
}

/**
 * JSDoc annotations for common patterns
 */
export const jsdocExamples = {
  /**
   * Example JSDoc comment for API endpoints
   * 
   * @swagger
   * /api/example:
   *   get:
   *     summary: Example endpoint
   *     description: This is an example of how to document an endpoint
   *     tags: [Example]
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *         description: Maximum number of items
   *     responses:
   *       200:
   *         description: Success
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Success'
   *       429:
   *         $ref: '#/components/responses/RateLimited'
   */
  exampleEndpoint: null as any,

  /**
   * Example of documenting request body
   * 
   * @swagger
   * components:
   *   schemas:
   *     CreateJobRequest:
   *       type: object
   *       required:
   *         - type
   *         - payload
   *       properties:
   *         type:
   *           type: string
   *           example: notification
   *         payload:
   *           type: object
   *         options:
   *           type: object
   *           properties:
   *             priority:
   *               type: integer
   *               minimum: 0
   *               maximum: 10
   */
  exampleSchema: null as any
};

export default openApiDefinition;