/**
 * Job Details Component
 * 
 * Shows detailed information about a specific job including logs.
 */

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Clock, User, Settings, FileText } from "lucide-react";
import { format } from "date-fns";

interface Job {
  id: string;
  type: string;
  status: string;
  priority: number;
  payload: any;
  result?: any;
  error?: any;
  attempts: number;
  maxAttempts: number;
  scheduledAt: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  workerId?: string;
  workerPid?: number;
  createdBy?: string;
  tags: string[];
}

interface JobLog {
  id: string;
  level: string;
  message: string;
  metadata?: any;
  createdAt: string;
}

interface JobDetailsProps {
  jobId: string;
}

export function JobDetails({ jobId }: JobDetailsProps) {
  const [job, setJob] = useState<Job | null>(null);
  const [logs, setLogs] = useState<JobLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  const fetchJobDetails = async () => {
    try {
      const [jobResponse, logsResponse] = await Promise.all([
        fetch(`/api/admin/jobs/${jobId}`),
        fetch(`/api/admin/jobs/${jobId}/logs`),
      ]);
      
      const jobData = await jobResponse.json();
      const logsData = await logsResponse.json();
      
      if (jobData.success) {
        setJob(jobData.data);
      }
      
      if (logsData.success) {
        setLogs(logsData.data);
      }
    } catch (error) {
      console.error("Failed to fetch job details:", error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchJobDetails();
  }, [jobId]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (!job) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Job not found
      </div>
    );
  }
  
  const getLogLevelColor = (level: string) => {
    switch (level) {
      case "error":
        return "text-red-600";
      case "warn":
        return "text-yellow-600";
      case "info":
        return "text-blue-600";
      case "debug":
        return "text-gray-600";
      default:
        return "text-gray-600";
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Job Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Job Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">ID:</span>
              <code className="text-sm bg-muted px-2 py-1 rounded">{job.id}</code>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="font-medium">Type:</span>
              <code className="text-sm bg-muted px-2 py-1 rounded">{job.type}</code>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="font-medium">Status:</span>
              <Badge variant={job.status === "failed" ? "destructive" : "default"}>
                {job.status}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="font-medium">Priority:</span>
              <span>{job.priority}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="font-medium">Attempts:</span>
              <span className={job.attempts > 1 ? "text-yellow-600 font-medium" : ""}>
                {job.attempts}/{job.maxAttempts}
              </span>
            </div>
            
            {job.tags.length > 0 && (
              <div>
                <span className="font-medium block mb-2">Tags:</span>
                <div className="flex flex-wrap gap-1">
                  {job.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Timing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Created:</span>
              <span className="text-sm">
                {format(new Date(job.createdAt), "MMM d, yyyy HH:mm:ss")}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="font-medium">Scheduled:</span>
              <span className="text-sm">
                {format(new Date(job.scheduledAt), "MMM d, yyyy HH:mm:ss")}
              </span>
            </div>
            
            {job.startedAt && (
              <div className="flex items-center justify-between">
                <span className="font-medium">Started:</span>
                <span className="text-sm">
                  {format(new Date(job.startedAt), "MMM d, yyyy HH:mm:ss")}
                </span>
              </div>
            )}
            
            {job.completedAt && (
              <div className="flex items-center justify-between">
                <span className="font-medium">Completed:</span>
                <span className="text-sm">
                  {format(new Date(job.completedAt), "MMM d, yyyy HH:mm:ss")}
                </span>
              </div>
            )}
            
            {job.startedAt && job.completedAt && (
              <div className="flex items-center justify-between">
                <span className="font-medium">Duration:</span>
                <span className="text-sm">
                  {Math.round(
                    (new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()) / 1000
                  )}s
                </span>
              </div>
            )}
          </CardContent>
        </Card>
        
        {(job.workerId || job.createdBy) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Worker & User</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {job.workerId && (
                <div className="flex items-center justify-between">
                  <span className="font-medium">Worker ID:</span>
                  <code className="text-sm bg-muted px-2 py-1 rounded">
                    {job.workerId}
                  </code>
                </div>
              )}
              
              {job.workerPid && (
                <div className="flex items-center justify-between">
                  <span className="font-medium">Worker PID:</span>
                  <span>{job.workerPid}</span>
                </div>
              )}
              
              {job.createdBy && (
                <div className="flex items-center justify-between">
                  <span className="font-medium">Created By:</span>
                  <code className="text-sm bg-muted px-2 py-1 rounded">
                    {job.createdBy}
                  </code>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Job Data */}
      <Tabs defaultValue="payload" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payload">Payload</TabsTrigger>
          {job.result && <TabsTrigger value="result">Result</TabsTrigger>}
          {job.error && <TabsTrigger value="error">Error</TabsTrigger>}
          <TabsTrigger value="logs">Logs ({logs.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="payload">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Job Payload</CardTitle>
              <CardDescription>
                Input data provided when the job was created
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <pre className="text-sm bg-muted p-4 rounded whitespace-pre-wrap">
                  {JSON.stringify(job.payload, null, 2)}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        {job.result && (
          <TabsContent value="result">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Job Result</CardTitle>
                <CardDescription>
                  Output data returned by the job handler
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <pre className="text-sm bg-muted p-4 rounded whitespace-pre-wrap">
                    {JSON.stringify(job.result, null, 2)}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        )}
        
        {job.error && (
          <TabsContent value="error">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Job Error</CardTitle>
                <CardDescription>
                  Error information from failed job execution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <pre className="text-sm bg-red-50 text-red-900 p-4 rounded whitespace-pre-wrap">
                    {JSON.stringify(job.error, null, 2)}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        )}
        
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Job Logs</CardTitle>
              <CardDescription>
                Execution logs from job processing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {logs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No logs available for this job
                  </div>
                ) : (
                  <div className="space-y-2">
                    {logs.map((log) => (
                      <div key={log.id} className="border-l-2 border-muted pl-4 py-2">
                        <div className="flex items-center justify-between mb-1">
                          <Badge
                            variant="outline"
                            className={`text-xs ${getLogLevelColor(log.level)}`}
                          >
                            {log.level.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(log.createdAt), "MMM d, HH:mm:ss")}
                          </span>
                        </div>
                        <p className="text-sm">{log.message}</p>
                        {log.metadata && (
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer">
                              Metadata
                            </summary>
                            <pre className="text-xs bg-muted p-2 rounded mt-1 whitespace-pre-wrap">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}