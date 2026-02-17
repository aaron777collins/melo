/**
 * Invite List Component
 * 
 * Displays a list of invites with status, actions, and filtering.
 */

"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Trash2, Calendar, User, Clock, CheckCircle, XCircle } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface AdminInvite {
  id: string;
  invitedUserId: string;
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
  used: boolean;
  usedAt?: string;
  notes?: string;
}

interface InviteListProps {
  invites: AdminInvite[];
  onInviteRevoked: () => void;
  refreshing: boolean;
}

type InviteStatus = "all" | "active" | "used" | "expired";

export function InviteList({ invites, onInviteRevoked, refreshing }: InviteListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<InviteStatus>("all");
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const getInviteStatus = (invite: AdminInvite): "active" | "used" | "expired" => {
    if (invite.used) return "used";
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) return "expired";
    return "active";
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      setRevokingId(inviteId);
      const response = await fetch("/api/admin/invites", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId }),
      });

      const data = await response.json();

      if (data.success) {
        onInviteRevoked();
      } else {
        console.error("Failed to revoke invite:", data.error);
        // TODO: Show toast notification with error
      }
    } catch (error) {
      console.error("Error revoking invite:", error);
      // TODO: Show toast notification with error
    } finally {
      setRevokingId(null);
    }
  };

  // Filter invites based on search term and status
  const filteredInvites = invites.filter((invite) => {
    const matchesSearch = !searchTerm || 
      invite.invitedUserId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invite.createdBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invite.notes?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || getInviteStatus(invite) === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (invite: AdminInvite) => {
    const status = getInviteStatus(invite);
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-blue-500"><Clock className="w-3 h-3 mr-1" />Active</Badge>;
      case "used":
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Used</Badge>;
      case "expired":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Expired</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      absolute: format(date, "MMM dd, yyyy 'at' HH:mm"),
      relative: formatDistanceToNow(date, { addSuffix: true }),
    };
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Invite List</CardTitle>
            <CardDescription>
              Manage invites for external users ({filteredInvites.length} of {invites.length})
            </CardDescription>
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search invites..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={(value: InviteStatus) => setStatusFilter(value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Invites</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="used">Used Only</SelectItem>
              <SelectItem value="expired">Expired Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredInvites.length === 0 ? (
          <div className="text-center py-8">
            <User className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No invites found</h3>
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== "all" 
                ? "Try adjusting your search or filter criteria"
                : "Get started by creating your first invite"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvites.map((invite) => {
                  const status = getInviteStatus(invite);
                  const created = formatDate(invite.createdAt);
                  const expires = invite.expiresAt ? formatDate(invite.expiresAt) : null;
                  const used = invite.usedAt ? formatDate(invite.usedAt) : null;

                  return (
                    <TableRow key={invite.id}>
                      <TableCell>
                        <div className="font-medium">{invite.invitedUserId}</div>
                        {used && (
                          <div className="text-xs text-muted-foreground">
                            Used {used.relative}
                          </div>
                        )}
                      </TableCell>
                      
                      <TableCell>{getStatusBadge(invite)}</TableCell>
                      
                      <TableCell>
                        <div className="text-sm" title={created.absolute}>
                          {created.relative}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {expires ? (
                          <div className="text-sm" title={expires.absolute}>
                            {status === "expired" ? (
                              <span className="text-red-600">
                                Expired {expires.relative}
                              </span>
                            ) : (
                              <span>
                                {expires.relative}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Never</span>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm">
                          {invite.createdBy.split(':')[0].replace('@', '')}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {invite.notes ? (
                          <div className="text-sm max-w-[200px] truncate" title={invite.notes}>
                            {invite.notes}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        {status === "active" && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={revokingId === invite.id}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Revoke Invite</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to revoke the invite for{" "}
                                  <span className="font-medium">{invite.invitedUserId}</span>?{" "}
                                  This action cannot be undone and the user will no longer be able to use this invite.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRevokeInvite(invite.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Revoke Invite
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}