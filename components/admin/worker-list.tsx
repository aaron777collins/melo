/**
 * Worker List Component
 * 
 * Displays active workers and their status.
 */

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Server, Trash2 } from "lucide-react";
import { format, formatDistance } from "date-fns";

interface Worker {
  id: string;
  workerId: string;
  pid?: number;
  hostname: string;
  concurrency: number;
  jobTypes: string[];
  status: string;
  lastHeartbeat: string;
  jobsProcessed: number;
  jobsSucceeded: number;
  jobsFailed: number;
  createdAt: string;
}

export function WorkerList() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const fetchWorkers = async () => {
    try {
      setRefreshing(true);
      const response = await fetch("/api/admin/workers");
      const data = await response.json();
      
      if (data.success) {
        setWorkers(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch workers:", error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };
  
  const handleCleanupDeadWorkers = async () => {
    try {
      const response = await fetch("/api/admin/workers/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeoutMinutes: 5 }),
      });
      
      if (response.ok) {
        fetchWorkers();
      }
    } catch (error) {
      console.error("Failed to cleanup dead workers:", error);
    }
  };
  
  useEffect(() => {
    fetchWorkers();
    const interval = setInterval(fetchWorkers, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);
  
  const getStatusBadgeVariant = (status: string, lastHeartbeat: string) => {
    const heartbeatAge = Date.now() - new Date(lastHeartbeat).getTime();
    const isStale = heartbeatAge > 5 * 60 * 1000; // 5 minutes
    
    if (status === "active" && !isStale) {
      return "default";
    } else if (status === "active" && isStale) {
      return "secondary";
    } else if (status === "stopping") {
      return "outline";
    } else {
      return "destructive";
    }
  };
  
  const getStatusText = (status: string, lastHeartbeat: string) => {
    const heartbeatAge = Date.now() - new Date(lastHeartbeat).getTime();
    const isStale = heartbeatAge > 5 * 60 * 1000; // 5 minutes
    
    if (status === "active" && isStale) {
      return "stale";
    }
    return status;
  };
  
  const calculateSuccessRate = (succeeded: number, failed: number) => {
    const total = succeeded + failed;
    if (total === 0) return 100;
    return Math.round((succeeded / total) * 100);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Workers</CardTitle>
        <CardDescription>
          Active worker processes and their status
        </CardDescription>
        
        <div className="flex items-center space-x-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchWorkers}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleCleanupDeadWorkers}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Cleanup Dead Workers
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-8 w-8 animate-spin" />
          </div>
        ) : workers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No workers are currently running</p>
            <p className="text-sm">Start a worker process to begin processing jobs</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Worker ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Host</TableHead>
                <TableHead>PID</TableHead>
                <TableHead>Concurrency</TableHead>
                <TableHead>Job Types</TableHead>
                <TableHead>Jobs Processed</TableHead>
                <TableHead>Success Rate</TableHead>
                <TableHead>Last Heartbeat</TableHead>
                <TableHead>Uptime</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workers.map((worker) => {
                const heartbeatAge = Date.now() - new Date(worker.lastHeartbeat).getTime();
                const isStale = heartbeatAge > 5 * 60 * 1000;
                const successRate = calculateSuccessRate(worker.jobsSucceeded, worker.jobsFailed);
                
                return (
                  <TableRow key={worker.id}>
                    <TableCell>
                      <code className="text-sm bg-muted px-1 py-0.5 rounded">
                        {worker.workerId.split("-")[0]}...
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={getStatusBadgeVariant(worker.status, worker.lastHeartbeat)}
                      >
                        {getStatusText(worker.status, worker.lastHeartbeat)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Server className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{worker.hostname}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {worker.pid ? (
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {worker.pid}
                        </code>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{worker.concurrency}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {worker.jobTypes.length === 0 ? (
                          <Badge variant="outline" className="text-xs">
                            all
                          </Badge>
                        ) : (
                          worker.jobTypes.slice(0, 3).map((type) => (
                            <Badge key={type} variant="outline" className="text-xs">
                              {type}
                            </Badge>
                          ))
                        )}
                        {worker.jobTypes.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{worker.jobTypes.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{worker.jobsProcessed}</div>
                        <div className="text-xs text-muted-foreground">
                          ✓{worker.jobsSucceeded} ✗{worker.jobsFailed}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className="text-sm">{successRate}%</div>
                        <div
                          className={`w-2 h-2 rounded-full ${
                            successRate >= 95
                              ? "bg-green-500"
                              : successRate >= 80
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className={isStale ? "text-red-600" : "text-green-600"}>
                          {formatDistance(new Date(worker.lastHeartbeat), new Date(), {
                            addSuffix: true,
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(worker.lastHeartbeat), "HH:mm:ss")}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {formatDistance(new Date(worker.createdAt), new Date())}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}