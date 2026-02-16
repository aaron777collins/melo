#!/usr/bin/env tsx

/**
 * API Documentation Generator
 * 
 * Automatically generates API documentation from route handlers and JSDoc comments.
 * This script analyzes all API route files and extracts endpoint information.
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

interface EndpointInfo {
  path: string;
  method: string;
  summary?: string;
  description?: string;
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses?: Record<string, Response>;
  deprecated?: boolean;
  tags?: string[];
}

interface Parameter {
  name: string;
  in: 'query' | 'path' | 'header';
  required: boolean;
  type: string;
  description?: string;
}

interface RequestBody {
  description?: string;
  required: boolean;
  content: Record<string, { schema: any }>;
}

interface Response {
  description: string;
  content?: Record<string, { schema: any }>;
}

const APP_DIR = path.join(process.cwd(), 'app');
const OUTPUT_DIR = path.join(process.cwd(), 'docs');

/**
 * Extract JSDoc comments from source code
 */
function extractJSDoc(content: string): Record<string, any> {
  const jsDocRegex = /\/\*\*([\s\S]*?)\*\//g;
  const matches = content.match(jsDocRegex);
  
  if (!matches) return {};
  
  const jsdoc: Record<string, any> = {};
  
  matches.forEach(match => {
    const lines = match.split('\n').map(line => line.trim().replace(/^\*\s?/, ''));
    
    let summary = '';
    let description = '';
    const tags: Record<string, string[]> = {};
    
    for (const line of lines) {
      if (line.startsWith('/**') || line.startsWith('*/')) continue;
      
      if (line.startsWith('@')) {
        const [tag, ...rest] = line.slice(1).split(' ');
        if (!tags[tag]) tags[tag] = [];
        tags[tag].push(rest.join(' '));
      } else if (!summary && line) {
        summary = line;
      } else if (line) {
        description += (description ? '\n' : '') + line;
      }
    }
    
    jsdoc.summary = summary || jsdoc.summary;
    jsdoc.description = description || jsdoc.description;
    Object.assign(jsdoc, tags);
  });
  
  return jsdoc;
}

/**
 * Parse route file to extract endpoint information
 */
function parseRouteFile(filePath: string): EndpointInfo[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const endpoints: EndpointInfo[] = [];
  
  // Extract JSDoc information
  const jsdoc = extractJSDoc(content);
  
  // Extract path from file path
  const relativePath = path.relative(APP_DIR, filePath);
  const apiPath = relativePath
    .replace(/\/route\.ts$/, '')
    .replace(/\[(\w+)\]/g, '{$1}') // Convert [param] to {param}
    .replace(/^api/, '/api');
  
  // Extract HTTP methods
  const methodRegex = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(/g;
  let methodMatch;
  
  while ((methodMatch = methodRegex.exec(content)) !== null) {
    const method = methodMatch[1];
    
    // Try to extract method-specific JSDoc
    const methodJSDocRegex = new RegExp(
      `\\/\\*\\*[\\s\\S]*?\\*\\/\\s*export\\s+async\\s+function\\s+${method}`, 
      'g'
    );
    const methodJSDocMatch = methodJSDocRegex.exec(content);
    const methodJSDoc = methodJSDocMatch ? extractJSDoc(methodJSDocMatch[0]) : {};
    
    // Check for deprecation
    const isDeprecated = content.includes('status: 410') || 
                         content.includes('This endpoint is deprecated') ||
                         methodJSDoc.deprecated;
    
    const endpoint: EndpointInfo = {
      path: apiPath,
      method: method.toLowerCase(),
      summary: methodJSDoc.summary || jsdoc.summary,
      description: methodJSDoc.description || jsdoc.description,
      deprecated: isDeprecated,
      tags: determineEndpointTags(apiPath),
    };
    
    // Extract parameters from path
    const pathParams = extractPathParameters(apiPath);
    if (pathParams.length > 0) {
      endpoint.parameters = pathParams;
    }
    
    // Try to extract query parameters from code
    const queryParams = extractQueryParameters(content, method);
    if (queryParams.length > 0) {
      endpoint.parameters = [...(endpoint.parameters || []), ...queryParams];
    }
    
    // Extract request body information
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      const requestBody = extractRequestBody(content, method);
      if (requestBody) {
        endpoint.requestBody = requestBody;
      }
    }
    
    // Extract response information
    const responses = extractResponses(content, method);
    if (Object.keys(responses).length > 0) {
      endpoint.responses = responses;
    }
    
    endpoints.push(endpoint);
  }
  
  return endpoints;
}

/**
 * Extract path parameters from API path
 */
function extractPathParameters(apiPath: string): Parameter[] {
  const paramRegex = /\{(\w+)\}/g;
  const params: Parameter[] = [];
  let match;
  
  while ((match = paramRegex.exec(apiPath)) !== null) {
    params.push({
      name: match[1],
      in: 'path',
      required: true,
      type: 'string',
      description: `${match[1]} identifier`
    });
  }
  
  return params;
}

/**
 * Extract query parameters from route implementation
 */
function extractQueryParameters(content: string, method: string): Parameter[] {
  const params: Parameter[] = [];
  
  // Look for searchParams.get() calls
  const searchParamsRegex = /searchParams\.get\(["'](\w+)["']\)/g;
  let match;
  
  while ((match = searchParamsRegex.exec(content)) !== null) {
    const paramName = match[1];
    params.push({
      name: paramName,
      in: 'query',
      required: false,
      type: 'string',
      description: `${paramName} parameter`
    });
  }
  
  return params;
}

/**
 * Extract request body schema from route implementation
 */
function extractRequestBody(content: string, method: string): RequestBody | null {
  // Look for await req.json() calls
  if (content.includes('await req.json()') || content.includes('await request.json()')) {
    return {
      description: 'Request body',
      required: true,
      content: {
        'application/json': {
          schema: { type: 'object' }
        }
      }
    };
  }
  
  return null;
}

/**
 * Extract response information from route implementation
 */
function extractResponses(content: string, method: string): Record<string, Response> {
  const responses: Record<string, Response> = {};
  
  // Look for NextResponse.json calls with status codes
  const responseRegex = /NextResponse\.json\([^,]+,\s*\{\s*status:\s*(\d+)\s*\}/g;
  let match;
  
  while ((match = responseRegex.exec(content)) !== null) {
    const statusCode = match[1];
    responses[statusCode] = {
      description: getStatusCodeDescription(statusCode),
      content: {
        'application/json': {
          schema: { type: 'object' }
        }
      }
    };
  }
  
  // Add default 200 response if none found
  if (Object.keys(responses).length === 0) {
    responses['200'] = {
      description: 'Success',
      content: {
        'application/json': {
          schema: { type: 'object' }
        }
      }
    };
  }
  
  return responses;
}

/**
 * Get human-readable description for HTTP status codes
 */
function getStatusCodeDescription(statusCode: string): string {
  const descriptions: Record<string, string> = {
    '200': 'Success',
    '201': 'Created',
    '400': 'Bad Request',
    '401': 'Unauthorized', 
    '403': 'Forbidden',
    '404': 'Not Found',
    '409': 'Conflict',
    '410': 'Gone (Deprecated)',
    '429': 'Rate Limited',
    '500': 'Internal Server Error',
    '503': 'Service Unavailable'
  };
  
  return descriptions[statusCode] || `HTTP ${statusCode}`;
}

/**
 * Determine tags for endpoint based on path
 */
function determineEndpointTags(apiPath: string): string[] {
  const tags: string[] = [];
  
  if (apiPath.includes('/admin/')) {
    tags.push('Admin');
  }
  
  if (apiPath.includes('/auth/')) {
    tags.push('Authentication');
  }
  
  if (apiPath.includes('/servers/')) {
    tags.push('Servers');
  }
  
  if (apiPath.includes('/channels/')) {
    tags.push('Channels');
  }
  
  if (apiPath.includes('/members/')) {
    tags.push('Members');
  }
  
  if (apiPath.includes('/health') || apiPath.includes('/ready')) {
    tags.push('System');
  }
  
  if (apiPath.includes('/live')) {
    tags.push('Real-time');
  }
  
  return tags.length > 0 ? tags : ['General'];
}

/**
 * Generate OpenAPI specification
 */
function generateOpenAPISpec(endpoints: EndpointInfo[]): any {
  const spec = {
    openapi: '3.0.0',
    info: {
      title: 'HAOS API',
      version: '0.1.0',
      description: 'Home Assistant for Open Source - Matrix-based communication platform',
      contact: {
        name: 'HAOS Team',
        url: 'https://github.com/aaron777collins/haos-v2'
      }
    },
    servers: [
      {
        url: '{protocol}://{host}/api',
        description: 'HAOS API Server',
        variables: {
          protocol: {
            enum: ['http', 'https'],
            default: 'https'
          },
          host: {
            default: 'localhost:3000',
            description: 'HAOS server host'
          }
        }
      }
    ],
    paths: {} as any,
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'session',
          description: 'Session cookie from login endpoint'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        },
        RateLimitError: {
          allOf: [
            { $ref: '#/components/schemas/Error' },
            {
              type: 'object',
              properties: {
                rateLimit: {
                  type: 'object',
                  properties: {
                    limit: { type: 'integer' },
                    remaining: { type: 'integer' },
                    reset: { type: 'integer' },
                    used: { type: 'integer' }
                  }
                }
              }
            }
          ]
        }
      }
    },
    tags: [
      { name: 'System', description: 'System health and status endpoints' },
      { name: 'Authentication', description: 'User authentication and session management' },
      { name: 'Admin', description: 'Administrative functions (requires admin role)' },
      { name: 'Servers', description: 'Matrix space/server management' },
      { name: 'Channels', description: 'Matrix room/channel operations' },
      { name: 'Members', description: 'User and member management' },
      { name: 'Real-time', description: 'Live communication features' },
      { name: 'General', description: 'General utility endpoints' }
    ]
  };
  
  // Group endpoints by path
  endpoints.forEach(endpoint => {
    const { path: apiPath, method, ...operation } = endpoint;
    
    if (!spec.paths[apiPath]) {
      spec.paths[apiPath] = {};
    }
    
    spec.paths[apiPath][method] = {
      ...operation,
      security: apiPath.includes('/admin/') ? [{ cookieAuth: [] }] : undefined
    };
  });
  
  return spec;
}

/**
 * Generate markdown documentation
 */
function generateMarkdownDocs(endpoints: EndpointInfo[]): string {
  let markdown = `# HAOS API Documentation (Generated)

*This documentation is auto-generated from source code. Last updated: ${new Date().toISOString()}*

## Overview

This document provides detailed information about all HAOS API endpoints, automatically extracted from the source code.

`;

  // Group endpoints by tags
  const endpointsByTag = endpoints.reduce((acc, endpoint) => {
    const tag = endpoint.tags?.[0] || 'General';
    if (!acc[tag]) acc[tag] = [];
    acc[tag].push(endpoint);
    return acc;
  }, {} as Record<string, EndpointInfo[]>);
  
  // Generate sections for each tag
  Object.entries(endpointsByTag).forEach(([tag, tagEndpoints]) => {
    markdown += `## ${tag}\n\n`;
    
    tagEndpoints.forEach(endpoint => {
      const methodUpper = endpoint.method.toUpperCase();
      const deprecated = endpoint.deprecated ? ' *(Deprecated)*' : '';
      
      markdown += `### ${methodUpper} ${endpoint.path}${deprecated}\n\n`;
      
      if (endpoint.summary) {
        markdown += `${endpoint.summary}\n\n`;
      }
      
      if (endpoint.description) {
        markdown += `${endpoint.description}\n\n`;
      }
      
      if (endpoint.deprecated) {
        markdown += `> **⚠️ Deprecated**: This endpoint is deprecated and may be removed in future versions.\n\n`;
      }
      
      // Parameters
      if (endpoint.parameters && endpoint.parameters.length > 0) {
        markdown += `**Parameters:**\n`;
        endpoint.parameters.forEach(param => {
          const required = param.required ? ' *(required)*' : ' *(optional)*';
          markdown += `- \`${param.name}\`${required}: ${param.description || 'No description'}\n`;
        });
        markdown += '\n';
      }
      
      // Request body
      if (endpoint.requestBody) {
        markdown += `**Request Body:**\n`;
        markdown += `\`\`\`json\n{\n  "example": "Request body structure not extracted"\n}\n\`\`\`\n\n`;
      }
      
      // Responses
      if (endpoint.responses) {
        markdown += `**Responses:**\n`;
        Object.entries(endpoint.responses).forEach(([status, response]) => {
          markdown += `- **${status}**: ${response.description}\n`;
        });
        markdown += '\n';
      }
      
      markdown += '---\n\n';
    });
  });
  
  return markdown;
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('🔍 Scanning for API route files...');
    
    // Find all route files
    const routeFiles = await glob('app/api/**/route.ts', { 
      cwd: process.cwd(),
      absolute: true 
    });
    
    console.log(`📄 Found ${routeFiles.length} route files`);
    
    // Parse all endpoints
    const allEndpoints: EndpointInfo[] = [];
    
    for (const file of routeFiles) {
      console.log(`   Parsing: ${path.relative(process.cwd(), file)}`);
      const endpoints = parseRouteFile(file);
      allEndpoints.push(...endpoints);
    }
    
    console.log(`🎯 Extracted ${allEndpoints.length} endpoints`);
    
    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    
    // Generate OpenAPI spec
    const openApiSpec = generateOpenAPISpec(allEndpoints);
    const specPath = path.join(OUTPUT_DIR, 'openapi.json');
    fs.writeFileSync(specPath, JSON.stringify(openApiSpec, null, 2));
    console.log(`📝 Generated OpenAPI spec: ${specPath}`);
    
    // Generate markdown documentation
    const markdownDocs = generateMarkdownDocs(allEndpoints);
    const docsPath = path.join(OUTPUT_DIR, 'API-generated.md');
    fs.writeFileSync(docsPath, markdownDocs);
    console.log(`📚 Generated markdown docs: ${docsPath}`);
    
    console.log('✅ API documentation generation complete!');
    
    // Print summary
    console.log('\n📊 Summary:');
    console.log(`   • Total endpoints: ${allEndpoints.length}`);
    console.log(`   • Deprecated endpoints: ${allEndpoints.filter(e => e.deprecated).length}`);
    
    const methodCounts = allEndpoints.reduce((acc, e) => {
      acc[e.method.toUpperCase()] = (acc[e.method.toUpperCase()] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(methodCounts).forEach(([method, count]) => {
      console.log(`   • ${method}: ${count} endpoints`);
    });
    
  } catch (error) {
    console.error('❌ Error generating API documentation:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { parseRouteFile, generateOpenAPISpec, generateMarkdownDocs };