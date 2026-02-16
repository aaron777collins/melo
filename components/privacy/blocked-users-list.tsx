/**
 * Blocked Users List Component
 * 
 * Displays list of blocked users with ability to unblock them.
 */

"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { UserX, Search, Calendar } from "lucide-react";
import { useBlockedUsers } from "@/hooks/use-privacy-settings";
import { formatDistanceToNow } from "date-fns";

interface BlockedUsersListProps {
  className?: string;
}

export function BlockedUsersList({ className }: BlockedUsersListProps) {
  const { blockedUsers, isLoading, error, unblockUser } = useBlockedUsers();
  const [searchQuery, setSearchQuery] = useState("");
  const [unblockingUserId, setUnblockingUserId] = useState<string | null>(null);

  // Filter blocked users based on search query
  const filteredUsers = blockedUsers.filter(user =>
    user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.userId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUnblock = async (userId: string) => {
    setUnblockingUserId(userId);
    try {
      await unblockUser(userId);
    } finally {
      setUnblockingUserId(null);
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5" />
            Blocked Users
          </CardTitle>
          <CardDescription>
            Loading blocked users...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <UserX className="h-5 w-5" />
            Error Loading Blocked Users
          </CardTitle>
          <CardDescription>
            {error}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserX className="h-5 w-5" />
          Blocked Users
        </CardTitle>
        <CardDescription>
          {blockedUsers.length === 0 
            ? "You haven't blocked any users yet."
            : `You have blocked ${blockedUsers.length} user${blockedUsers.length === 1 ? '' : 's'}.`
          }
        </CardDescription>
      </CardHeader>
      
      {blockedUsers.length > 0 && (
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="user-search" className="text-sm font-medium">
              Search blocked users
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="user-search"
                placeholder="Search by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Blocked Users List */}
          <div className="space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">
                No blocked users found matching "{searchQuery}"
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.userId}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatarUrl} />
                      <AvatarFallback>
                        {user.displayName
                          ? user.displayName.charAt(0).toUpperCase()
                          : user.userId.charAt(1).toUpperCase()
                        }
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {user.displayName || user.userId}
                        </p>
                        {user.displayName && (
                          <Badge variant="secondary" className="text-xs">
                            {user.userId}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>
                          Blocked {formatDistanceToNow(new Date(user.blockedAt), { addSuffix: true })}
                        </span>
                      </div>
                      
                      {user.reason && (
                        <p className="text-sm text-muted-foreground">
                          Reason: {user.reason}
                        </p>
                      )}
                    </div>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={unblockingUserId === user.userId}
                      >
                        {unblockingUserId === user.userId ? "Unblocking..." : "Unblock"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Unblock User</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to unblock {user.displayName || user.userId}? 
                          They will be able to send you messages and interact with you again.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleUnblock(user.userId)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Unblock User
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}