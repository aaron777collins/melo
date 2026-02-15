"use client";

/**
 * Audit Log Component
 * 
 * Displays server audit log with filtering capabilities.
 * Shows moderation actions, role changes, and other admin events.
 */

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { 
  Calendar,
  Filter,
  Search,
  User,
  Shield,
  Ban,
  UserPlus,
  UserMinus,
  Settings,
  Trash2,
  AlertTriangle,
  FileText,
  Clock,
  ChevronDown
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

interface AuditLogEntry {
  id: string;
  action: string;
  actorId: string;
  targetType: string | null;
  targetId: string | null;
  metadata: any;
  ipAddress: string | null;
  createdAt: string;
}

interface AuditLogResponse {
  success: boolean;
  data: {
    auditLogs: AuditLogEntry[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      limit: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
}

interface AuditLogProps {
  serverId: string;
}

// =============================================================================
// Constants
// =============================================================================

const ACTION_TYPES = [
  { value: "member.kick", label: "Member Kicks" },
  { value: "member.ban", label: "Member Bans" },
  { value: "member.unban", label: "Member Unbans" },
  { value: "role.create", label: "Role Created" },
  { value: "role.update", label: "Role Updated" },
  { value: "role.delete", label: "Role Deleted" },
  { value: "role.assign", label: "Role Assigned" },
  { value: "role.remove", label: "Role Removed" },
  { value: "channel.create", label: "Channel Created" },
  { value: "channel.delete", label: "Channel Deleted" },
  { value: "channel.update", label: "Channel Updated" },
  { value: "server.update", label: "Server Settings Updated" },
  { value: "invite.create", label: "Invite Created" },
  { value: "invite.delete", label: "Invite Deleted" },
  { value: "message.delete", label: "Message Deleted" },
  { value: "message.bulk_delete", label: "Messages Bulk Deleted" },
];

/**
 * Get icon for audit log action
 */
function getActionIcon(action: string) {
  if (action.includes("ban")) return Ban;
  if (action.includes("kick")) return UserMinus;
  if (action.includes("role")) return Shield;
  if (action.includes("member") || action.includes("user")) return User;
  if (action.includes("channel")) return FileText;
  if (action.includes("server")) return Settings;
  if (action.includes("message")) return Trash2;
  if (action.includes("invite")) return UserPlus;
  return AlertTriangle;
}

/**
 * Get color variant for audit log action
 */
function getActionVariant(action: string): "default" | "destructive" | "secondary" | "outline" {
  if (action.includes("ban") || action.includes("kick") || action.includes("delete")) {
    return "destructive";
  }
  if (action.includes("create") || action.includes("assign")) {
    return "default";
  }
  return "secondary";
}

/**
 * Format user ID for display
 */
function formatUserId(userId: string): string {
  // Convert @username:domain.com to @username
  return userId.split(":")[0];
}

/**
 * Format action name for display
 */
function formatAction(action: string): string {
  return action
    .split(".")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// =============================================================================
// Component
// =============================================================================

export function AuditLog({ serverId }: AuditLogProps) {
  // State
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Filters
  const [filters, setFilters] = useState({
    action: "",
    actorId: "",
    startDate: "",
    endDate: "",
    search: "",
  });

  // Apply debounced search
  const [searchTerm, setSearchTerm] = useState("");

  /**
   * Fetch audit logs from API
   */
  const fetchAuditLogs = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: "25",
      });

      if (filters.action) params.set("action", filters.action);
      if (filters.actorId) params.set("actorId", filters.actorId);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);

      const response = await fetch(`/api/servers/${serverId}/audit-log?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: AuditLogResponse = await response.json();
      
      if (!result.success) {
        throw new Error("Failed to fetch audit logs");
      }

      setAuditLogs(result.data.auditLogs);
      setPagination({
        currentPage: result.data.pagination.currentPage,
        totalPages: result.data.pagination.totalPages,
        totalCount: result.data.pagination.totalCount,
        hasNextPage: result.data.pagination.hasNextPage,
        hasPrevPage: result.data.pagination.hasPrevPage,
      });

    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
      setError(error instanceof Error ? error.message : "Unknown error occurred");
      toast.error("Failed to load audit log");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle filter changes
   */
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  /**
   * Apply filters and refresh
   */
  const applyFilters = () => {
    fetchAuditLogs(1);
  };

  /**
   * Clear all filters
   */
  const clearFilters = () => {
    setFilters({
      action: "",
      actorId: "",
      startDate: "",
      endDate: "",
      search: "",
    });
    setSearchTerm("");
  };

  // Load initial data
  useEffect(() => {
    fetchAuditLogs();
  }, [serverId]);

  // Auto-apply filters after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      if (filters.action || filters.actorId || filters.startDate || filters.endDate) {
        fetchAuditLogs(1);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [filters]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <CardTitle className="text-base">Filters</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Action Type Filter */}
            <div className="space-y-2">
              <Label htmlFor="action-filter">Action Type</Label>
              <Select 
                value={filters.action} 
                onValueChange={(value) => handleFilterChange("action", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All actions</SelectItem>
                  {ACTION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Actor Filter */}
            <div className="space-y-2">
              <Label htmlFor="actor-filter">User</Label>
              <Input
                id="actor-filter"
                placeholder="@username"
                value={filters.actorId}
                onChange={(e) => handleFilterChange("actorId", e.target.value)}
              />
            </div>

            {/* Start Date Filter */}
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange("startDate", e.target.value)}
              />
            </div>

            {/* End Date Filter */}
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
              />
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex items-center gap-2">
            <Button onClick={applyFilters} size="sm">
              <Search className="h-4 w-4 mr-2" />
              Apply Filters
            </Button>
            <Button onClick={clearFilters} variant="outline" size="sm">
              Clear All
            </Button>
            {pagination.totalCount > 0 && (
              <span className="text-sm text-muted-foreground ml-4">
                {pagination.totalCount} total entries
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Audit Log
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-4 p-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <AlertTriangle className="h-8 w-8 mx-auto text-destructive mb-2" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button onClick={() => fetchAuditLogs()} variant="outline" size="sm" className="mt-2">
                Try Again
              </Button>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="p-6 text-center">
              <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No audit log entries found</p>
            </div>
          ) : (
            <div className="divide-y">
              {auditLogs.map((entry) => {
                const Icon = getActionIcon(entry.action);
                const variant = getActionVariant(entry.action);
                
                return (
                  <div key={entry.id} className="p-6 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-4">
                      {/* Action Icon */}
                      <div className={cn(
                        "p-2 rounded-full flex-shrink-0",
                        variant === "destructive" ? "bg-destructive/10 text-destructive" :
                        variant === "default" ? "bg-primary/10 text-primary" :
                        "bg-muted"
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>

                      {/* Entry Details */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={variant}>
                            {formatAction(entry.action)}
                          </Badge>
                          <span className="text-sm text-muted-foreground">by</span>
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <code className="text-sm">{formatUserId(entry.actorId)}</code>
                          </div>
                        </div>

                        {/* Additional Details */}
                        {(entry.targetId || entry.metadata) && (
                          <div className="text-sm text-muted-foreground space-y-1">
                            {entry.targetId && (
                              <div>Target: <code>{formatUserId(entry.targetId)}</code></div>
                            )}
                            {entry.metadata && entry.metadata.reason && (
                              <div>Reason: {entry.metadata.reason}</div>
                            )}
                            {entry.ipAddress && (
                              <div>IP: <code>{entry.ipAddress}</code></div>
                            )}
                          </div>
                        )}

                        {/* Timestamp */}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(entry.createdAt), "MMM d, yyyy 'at' h:mm a")}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && !loading && (
            <div className="p-4 border-t flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Page {pagination.currentPage} of {pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasPrevPage}
                  onClick={() => fetchAuditLogs(pagination.currentPage - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasNextPage}
                  onClick={() => fetchAuditLogs(pagination.currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AuditLog;