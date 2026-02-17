"use client";

/**
 * Interactive API Explorer Component
 * 
 * Development-only component that provides an interactive interface for exploring
 * and testing Melo API endpoints. Uses Swagger UI for documentation display
 * and includes custom functionality for testing with session authentication.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRight, Play, Book, Settings, AlertCircle } from "lucide-react";

interface Endpoint {
  path: string;
  method: string;
  summary?: string;
  description?: string;
  tags?: string[];
  deprecated?: boolean;
  parameters?: Parameter[];
  requestBody?: any;
  responses?: any;
}

interface Parameter {
  name: string;
  in: 'query' | 'path' | 'header';
  required: boolean;
  type: string;
  description?: string;
}

interface TestResult {
  status: number;
  statusText: string;
  data: any;
  headers: Record<string, string>;
  duration: number;
}

const API_EXPLORER_ENDPOINTS: Endpoint[] = [
  {
    path: "/api/health",
    method: "GET",
    summary: "System Health Check",
    description: "Returns system health status, memory usage, and uptime information",
    tags: ["System"],
    responses: {
      200: { description: "System is healthy" },
      503: { description: "System is unhealthy" }
    }
  },
  {
    path: "/api/ready",
    method: "GET", 
    summary: "Readiness Check",
    description: "Checks if the service is ready to accept requests",
    tags: ["System"],
    responses: {
      200: { description: "Service is ready" }
    }
  },
  {
    path: "/api/auth/login",
    method: "POST",
    summary: "Matrix Authentication",
    description: "Login with Matrix credentials and establish session",
    tags: ["Authentication"],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              username: { type: "string", example: "alice" },
              password: { type: "string", example: "password" },
              homeserverUrl: { type: "string", example: "https://matrix.example.com" }
            }
          }
        }
      }
    },
    responses: {
      200: { description: "Login successful" },
      400: { description: "Missing credentials" },
      401: { description: "Invalid credentials" }
    }
  },
  {
    path: "/api/admin/jobs",
    method: "GET",
    summary: "List Background Jobs", 
    description: "Retrieve paginated list of background jobs with filtering",
    tags: ["Admin"],
    parameters: [
      { name: "status", in: "query", required: false, type: "string", description: "Filter by job status" },
      { name: "type", in: "query", required: false, type: "string", description: "Filter by job type" },
      { name: "limit", in: "query", required: false, type: "integer", description: "Maximum results" },
      { name: "offset", in: "query", required: false, type: "integer", description: "Pagination offset" }
    ],
    responses: {
      200: { description: "Jobs retrieved successfully" },
      401: { description: "Authentication required" }
    }
  },
  {
    path: "/api/admin/jobs",
    method: "POST",
    summary: "Create Background Job",
    description: "Create a new background job for async processing",
    tags: ["Admin"],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              type: { type: "string", example: "notification" },
              payload: { type: "object", example: { message: "Hello!" } },
              options: { 
                type: "object", 
                properties: {
                  priority: { type: "integer", example: 1 },
                  delay: { type: "integer", example: 0 }
                }
              }
            }
          }
        }
      }
    },
    responses: {
      200: { description: "Job created successfully" },
      400: { description: "Invalid job data" }
    }
  },
  {
    path: "/api/test-rate-limit",
    method: "GET",
    summary: "Test Rate Limiting",
    description: "Test endpoint to verify rate limiting functionality",
    tags: ["Utilities"],
    responses: {
      200: { description: "Request successful" },
      429: { description: "Rate limit exceeded" }
    }
  }
];

export function ApiExplorer() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null);
  const [testParams, setTestParams] = useState<Record<string, string>>({});
  const [testBody, setTestBody] = useState<string>("");
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Group endpoints by tags
  const endpointsByTag = API_EXPLORER_ENDPOINTS.reduce((acc, endpoint) => {
    const tag = endpoint.tags?.[0] || "General";
    if (!acc[tag]) acc[tag] = [];
    acc[tag].push(endpoint);
    return acc;
  }, {} as Record<string, Endpoint[]>);

  const handleEndpointSelect = (endpoint: Endpoint) => {
    setSelectedEndpoint(endpoint);
    setTestParams({});
    setTestBody("");
    setTestResult(null);
    setError(null);

    // Pre-populate request body example
    if (endpoint.requestBody?.content?.["application/json"]?.schema?.properties) {
      const example = endpoint.requestBody.content["application/json"].schema.properties;
      const exampleObj: any = {};
      Object.entries(example).forEach(([key, value]: [string, any]) => {
        if (value.example !== undefined) {
          exampleObj[key] = value.example;
        }
      });
      if (Object.keys(exampleObj).length > 0) {
        setTestBody(JSON.stringify(exampleObj, null, 2));
      }
    }
  };

  const handleParameterChange = (paramName: string, value: string) => {
    setTestParams(prev => ({
      ...prev,
      [paramName]: value
    }));
  };

  const executeTest = async () => {
    if (!selectedEndpoint) return;

    setIsLoading(true);
    setError(null);
    const startTime = Date.now();

    try {
      // Build URL with path and query parameters
      let url = selectedEndpoint.path;
      
      // Replace path parameters
      selectedEndpoint.parameters?.forEach(param => {
        if (param.in === "path" && testParams[param.name]) {
          url = url.replace(`{${param.name}}`, testParams[param.name]);
        }
      });

      // Add query parameters
      const queryParams = new URLSearchParams();
      selectedEndpoint.parameters?.forEach(param => {
        if (param.in === "query" && testParams[param.name]) {
          queryParams.append(param.name, testParams[param.name]);
        }
      });

      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }

      // Prepare request options
      const requestOptions: RequestInit = {
        method: selectedEndpoint.method,
        credentials: 'include', // Include session cookies
        headers: {
          'Content-Type': 'application/json',
        }
      };

      // Add request body for POST/PUT/PATCH
      if (['POST', 'PUT', 'PATCH'].includes(selectedEndpoint.method) && testBody) {
        try {
          JSON.parse(testBody); // Validate JSON
          requestOptions.body = testBody;
        } catch (e) {
          throw new Error('Invalid JSON in request body');
        }
      }

      const response = await fetch(url, requestOptions);
      const duration = Date.now() - startTime;

      // Extract response headers
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      // Parse response data
      const contentType = response.headers.get('content-type');
      let data;
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      setTestResult({
        status: response.status,
        statusText: response.statusText,
        data,
        headers,
        duration
      });

    } catch (err: any) {
      setError(err.message || 'Request failed');
    } finally {
      setIsLoading(false);
    }
  };

  const getMethodColor = (method: string) => {
    const colors = {
      GET: "bg-blue-500",
      POST: "bg-green-500", 
      PUT: "bg-yellow-500",
      PATCH: "bg-orange-500",
      DELETE: "bg-red-500"
    };
    return colors[method as keyof typeof colors] || "bg-gray-500";
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return "text-green-600";
    if (status >= 400 && status < 500) return "text-orange-600";
    if (status >= 500) return "text-red-600";
    return "text-gray-600";
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Melo API Explorer</h1>
        <p className="text-muted-foreground">Interactive development tool for testing Melo API endpoints</p>
        <Badge variant="secondary" className="mt-2">Development Only</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Endpoint List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Book className="h-5 w-5" />
              API Endpoints
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              {Object.entries(endpointsByTag).map(([tag, endpoints]) => (
                <div key={tag} className="mb-6">
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2 uppercase tracking-wider">
                    {tag}
                  </h3>
                  <div className="space-y-2">
                    {endpoints.map((endpoint, idx) => (
                      <Button
                        key={`${endpoint.method}-${endpoint.path}`}
                        variant={selectedEndpoint === endpoint ? "default" : "ghost"}
                        className="w-full justify-start text-left h-auto p-3"
                        onClick={() => handleEndpointSelect(endpoint)}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <Badge 
                            className={`${getMethodColor(endpoint.method)} text-white text-xs px-2 py-1`}
                          >
                            {endpoint.method}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <div className="font-mono text-sm truncate">{endpoint.path}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {endpoint.summary}
                            </div>
                          </div>
                          {endpoint.deprecated && (
                            <AlertCircle className="h-4 w-4 text-orange-500" />
                          )}
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Endpoint Details & Testing */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {selectedEndpoint ? (
                <span className="flex items-center gap-2">
                  <Badge className={`${getMethodColor(selectedEndpoint.method)} text-white`}>
                    {selectedEndpoint.method}
                  </Badge>
                  <code>{selectedEndpoint.path}</code>
                </span>
              ) : (
                "Select an endpoint"
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedEndpoint ? (
              <Tabs defaultValue="test" className="w-full">
                <TabsList>
                  <TabsTrigger value="test">Test</TabsTrigger>
                  <TabsTrigger value="docs">Documentation</TabsTrigger>
                </TabsList>
                
                <TabsContent value="test" className="space-y-4">
                  {/* Parameters */}
                  {selectedEndpoint.parameters && selectedEndpoint.parameters.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold">Parameters</h4>
                      {selectedEndpoint.parameters.map((param) => (
                        <div key={param.name} className="grid grid-cols-4 gap-2 items-center">
                          <Label className="text-sm">
                            {param.name}
                            {param.required && <span className="text-red-500 ml-1">*</span>}
                          </Label>
                          <Badge variant="outline" className="text-xs justify-center">
                            {param.in}
                          </Badge>
                          <Input
                            placeholder={param.description || `Enter ${param.name}`}
                            value={testParams[param.name] || ""}
                            onChange={(e) => handleParameterChange(param.name, e.target.value)}
                            className="col-span-2"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Request Body */}
                  {['POST', 'PUT', 'PATCH'].includes(selectedEndpoint.method) && (
                    <div className="space-y-2">
                      <Label>Request Body</Label>
                      <Textarea
                        placeholder="Enter JSON request body"
                        value={testBody}
                        onChange={(e) => setTestBody(e.target.value)}
                        className="font-mono text-sm h-32"
                      />
                    </div>
                  )}

                  {/* Test Button */}
                  <Button 
                    onClick={executeTest} 
                    disabled={isLoading}
                    className="w-full"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {isLoading ? "Testing..." : "Test Request"}
                  </Button>

                  {/* Error Display */}
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Test Results */}
                  {testResult && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">Response</h4>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(testResult.status)}>
                            {testResult.status} {testResult.statusText}
                          </Badge>
                          <Badge variant="outline">
                            {testResult.duration}ms
                          </Badge>
                        </div>
                      </div>
                      
                      <Tabs defaultValue="body" className="w-full">
                        <TabsList>
                          <TabsTrigger value="body">Body</TabsTrigger>
                          <TabsTrigger value="headers">Headers</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="body">
                          <pre className="bg-muted p-4 rounded-md text-sm overflow-auto max-h-96">
                            {typeof testResult.data === 'string' 
                              ? testResult.data 
                              : JSON.stringify(testResult.data, null, 2)
                            }
                          </pre>
                        </TabsContent>
                        
                        <TabsContent value="headers">
                          <div className="bg-muted p-4 rounded-md text-sm overflow-auto max-h-96">
                            {Object.entries(testResult.headers).map(([key, value]) => (
                              <div key={key} className="flex gap-2">
                                <span className="font-semibold min-w-0 flex-shrink-0">{key}:</span>
                                <span className="break-all">{value}</span>
                              </div>
                            ))}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="docs" className="space-y-4">
                  {selectedEndpoint.deprecated && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        This endpoint is deprecated and may be removed in future versions.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div>
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedEndpoint.description || "No description available."}
                    </p>
                  </div>

                  {selectedEndpoint.parameters && (
                    <div>
                      <h4 className="font-semibold mb-2">Parameters</h4>
                      <div className="space-y-2">
                        {selectedEndpoint.parameters.map((param) => (
                          <div key={param.name} className="border rounded p-3 text-sm">
                            <div className="flex items-center gap-2 mb-1">
                              <code className="font-mono">{param.name}</code>
                              <Badge variant="outline">{param.in}</Badge>
                              {param.required && <Badge variant="destructive">required</Badge>}
                            </div>
                            <p className="text-muted-foreground">
                              {param.description || "No description"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedEndpoint.responses && (
                    <div>
                      <h4 className="font-semibold mb-2">Responses</h4>
                      <div className="space-y-2">
                        {Object.entries(selectedEndpoint.responses).map(([status, response]: [string, any]) => (
                          <div key={status} className="border rounded p-3 text-sm">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={getStatusColor(parseInt(status))}>
                                {status}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground">
                              {response.description || "No description"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  Select an endpoint from the list to start testing
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Start Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Start Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-semibold">1. Authentication</h4>
              <p className="text-muted-foreground">
                Start by testing the <code>/api/auth/login</code> endpoint with your Matrix credentials to establish a session.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">2. Explore APIs</h4>
              <p className="text-muted-foreground">
                Browse endpoints by category. System endpoints don't require authentication, while Admin endpoints do.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">3. Test & Debug</h4>
              <p className="text-muted-foreground">
                Use the interactive tester to send requests and inspect responses, including headers and timing.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}