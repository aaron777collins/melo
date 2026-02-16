/**
 * Job Statistics Component
 * 
 * Displays detailed statistics and analytics about job queue performance.
 */

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, TrendingUp, Clock, Users, BarChart3 } from "lucide-react";

interface JobTypeStats {
  type: string;
  count: number;
}

interface RecentActivity {
  status: string;
  type: string;
  count: number;
}

interface WorkerStats {
  active: number;
  totalProcessed: number;
  totalSucceeded: number;
  totalFailed: number;
}

interface Performance {
  avgProcessingTimeSeconds: number;
}

interface FullStats {
  queue: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    cancelled: number;
    total: number;
  };
  jobTypes: JobTypeStats[];
  recentActivity: RecentActivity[];
  workers: WorkerStats;
  performance: Performance;
}

export function JobStats() {
  const [stats, setStats] = useState<FullStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/jobs/stats");
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (!stats) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Failed to load statistics
      </div>
    );
  }
  
  const calculateSuccessRate = () => {
    const { totalSucceeded, totalFailed } = stats.workers;
    const total = totalSucceeded + totalFailed;
    if (total === 0) return 100;
    return Math.round((totalSucceeded / total) * 100);
  };
  
  const formatDuration = (seconds: number) => {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      return `${Math.round(seconds / 60)}m`;
    } else {
      return `${Math.round(seconds / 3600)}h`;
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{calculateSuccessRate()}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.workers.totalSucceeded} succeeded, {stats.workers.totalFailed} failed
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Processing Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(stats.performance.avgProcessingTimeSeconds)}
            </div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Workers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.workers.active}</div>
            <p className="text-xs text-muted-foreground">
              Currently processing jobs
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Processed</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.workers.totalProcessed}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        {/* Job Types Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Job Types</CardTitle>
            <CardDescription>
              Distribution of job types in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.jobTypes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No job types found
              </div>
            ) : (
              <div className="space-y-4">
                {stats.jobTypes.slice(0, 10).map((jobType, index) => {
                  const percentage = Math.round((jobType.count / stats.queue.total) * 100);
                  return (
                    <div key={jobType.type} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: `hsl(${(index * 137.5) % 360}, 70%, 50%)`
                            }}
                          />
                          <code className="text-sm">{jobType.type}</code>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">{jobType.count}</span>
                          <Badge variant="outline" className="text-xs">
                            {percentage}%
                          </Badge>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: `hsl(${(index * 137.5) % 360}, 70%, 50%)`
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
                {stats.jobTypes.length > 10 && (
                  <p className="text-sm text-muted-foreground text-center pt-2">
                    And {stats.jobTypes.length - 10} more job types...
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Recent Activity (Last 24h) */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Job activity in the last 24 hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No recent activity
              </div>
            ) : (
              <div className="space-y-4">
                {stats.recentActivity.map((activity, index) => (
                  <div key={`${activity.status}-${activity.type}-${index}`} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={
                          activity.status === "completed" ? "default" :
                          activity.status === "failed" ? "destructive" :
                          activity.status === "processing" ? "secondary" :
                          "outline"
                        }
                        className="text-xs"
                      >
                        {activity.status}
                      </Badge>
                      <code className="text-sm">{activity.type}</code>
                    </div>
                    <span className="text-sm font-medium">{activity.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}