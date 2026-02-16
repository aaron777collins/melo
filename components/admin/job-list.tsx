/**
 * Job List Component
 * 
 * Displays and manages list of jobs with filtering and actions.
 */

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RefreshCw, Eye, RotateCcw, X, AlertCircle, Clock, CheckCircle, Play, Pause } from "lucide-react";
import { JobDetails } from "./job-details";
import { format } from "date-fns";

interface Job {
  id: string;
  type: string;
  status: string;
  priority: number;
  attempts: number;
  maxAttempts: number;
  scheduledAt: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  workerId?: string;
  workerPid?: number;
}

interface JobListProps {
  onStatsChange?: () => void;
}

export function JobList({ onStatsChange }: JobListProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  
  const fetchJobs = async () => {
    try {
      setRefreshing(true);
      
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        orderBy: "createdAt",
        orderDir: "desc",
      });
      
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      
      if (typeFilter) {
        params.append("type", typeFilter);
      }
      
      const response = await fetch(`/api/admin/jobs?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setJobs(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchJobs();
  }, [statusFilter, typeFilter, limit, offset]);
  
  const handleRetryJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/admin/jobs/${jobId}/retry`, {
        method: "POST",
      });
      
      if (response.ok) {
        fetchJobs();
        onStatsChange?.();
      }
    } catch (error) {
      console.error("Failed to retry job:", error);
    }
  };
  
  const handleCancelJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/admin/jobs/${jobId}?reason=Cancelled by admin`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        fetchJobs();
        onStatsChange?.();
      }
    } catch (error) {
      console.error("Failed to cancel job:", error);
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "processing":
        return <Play className="h-4 w-4 text-yellow-500" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "cancelled":
        return <Pause className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };
  
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "secondary";
      case "processing":
        return "default";
      case "completed":
        return "default";
      case "failed":
        return "destructive";
      case "cancelled":
        return "outline";
      default:
        return "secondary";
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Jobs</CardTitle>
        <CardDescription>
          Monitor and manage background jobs
        </CardDescription>
        
        {/* Filters */}
        <div className="flex items-center space-x-4 pt-4">
          <div className="flex-1">
            <Label htmlFor="status-filter">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1">
            <Label htmlFor="type-filter">Type</Label>
            <Input
              id="type-filter"
              placeholder="Filter by type..."
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            />
          </div>
          
          <div className="flex-1">
            <Label htmlFor="limit">Limit</Label>
            <Select value={limit.toString()} onValueChange={(value) => setLimit(parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={fetchJobs}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Worker</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <code className="text-sm bg-muted px-1 py-0.5 rounded">
                        {job.type}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(job.status)}
                        <Badge variant={getStatusBadgeVariant(job.status)}>
                          {job.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{job.priority}</TableCell>
                    <TableCell>
                      <span className={job.attempts > 1 ? "text-yellow-600" : ""}>
                        {job.attempts}/{job.maxAttempts}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(job.createdAt), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(job.scheduledAt), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell>
                      {job.workerId ? (
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {job.workerId.split("-")[0]}...
                          {job.workerPid && ` (${job.workerPid})`}
                        </code>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                              <DialogTitle>Job Details</DialogTitle>
                            </DialogHeader>
                            <JobDetails jobId={job.id} />
                          </DialogContent>
                        </Dialog>
                        
                        {job.status === "failed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRetryJob(job.id)}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {["pending", "processing"].includes(job.status) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelJob(job.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {jobs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No jobs found matching the current filters.
              </div>
            )}
            
            {/* Pagination */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {jobs.length} job{jobs.length !== 1 ? "s" : ""}
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOffset(offset + limit)}
                  disabled={jobs.length < limit}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}