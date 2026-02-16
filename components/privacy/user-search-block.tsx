/**
 * User Search and Block Component
 * 
 * Allows searching for users and blocking them with an optional reason.
 */

"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Search, AlertTriangle } from "lucide-react";
import { useBlockedUsers } from "@/hooks/use-privacy-settings";
import { toast } from "sonner";

// Mock user search function - in real implementation this would query the Matrix server
interface UserSearchResult {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  isOnline?: boolean;
}

// For demonstration - replace with actual user search API
const mockSearchUsers = async (query: string): Promise<UserSearchResult[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  if (query.length < 2) return [];
  
  // Mock results
  const mockUsers: UserSearchResult[] = [
    {
      userId: "@alice:matrix.org",
      displayName: "Alice Johnson",
      avatarUrl: undefined,
      isOnline: true,
    },
    {
      userId: "@bob:matrix.org", 
      displayName: "Bob Smith",
      avatarUrl: undefined,
      isOnline: false,
    },
    {
      userId: "@charlie:example.com",
      displayName: "Charlie Brown",
      avatarUrl: undefined,
      isOnline: true,
    },
  ];
  
  return mockUsers.filter(user => 
    user.displayName?.toLowerCase().includes(query.toLowerCase()) ||
    user.userId.toLowerCase().includes(query.toLowerCase())
  );
};

interface UserSearchBlockProps {
  className?: string;
}

export function UserSearchBlock({ className }: UserSearchBlockProps) {
  const { blockUser, isBlocked } = useBlockedUsers();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [isBlocking, setIsBlocking] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true);
        try {
          const results = await mockSearchUsers(searchQuery.trim());
          setSearchResults(results);
        } catch (error) {
          console.error("Search failed:", error);
          toast.error("Failed to search users");
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleBlockUser = async () => {
    if (!selectedUser) return;

    setIsBlocking(true);
    try {
      await blockUser(
        selectedUser.userId,
        blockReason.trim() || undefined,
        selectedUser.displayName,
        selectedUser.avatarUrl
      );
      
      setIsDialogOpen(false);
      setSelectedUser(null);
      setBlockReason("");
      setSearchQuery("");
      setSearchResults([]);
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setIsBlocking(false);
    }
  };

  const openBlockDialog = (user: UserSearchResult) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setSelectedUser(null);
    setBlockReason("");
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Block User
        </CardTitle>
        <CardDescription>
          Search for users to add to your blocked list
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="space-y-2">
          <Label htmlFor="user-search" className="text-sm font-medium">
            Search for users
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="user-search"
              placeholder="Enter username or user ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Search Results */}
        {(isSearching || searchResults.length > 0) && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Search Results</Label>
            <div className="border rounded-lg max-h-64 overflow-y-auto">
              {isSearching ? (
                <div className="p-4 text-center text-muted-foreground">
                  Searching...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No users found matching "{searchQuery}"
                </div>
              ) : (
                searchResults.map((user) => {
                  const userIsBlocked = isBlocked(user.userId);
                  
                  return (
                    <div
                      key={user.userId}
                      className="flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
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
                            <p className="font-medium text-sm">
                              {user.displayName || user.userId}
                            </p>
                            {user.isOnline && (
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            )}
                          </div>
                          
                          {user.displayName && (
                            <Badge variant="secondary" className="text-xs">
                              {user.userId}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {userIsBlocked ? (
                        <Badge variant="destructive" className="text-xs">
                          Blocked
                        </Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openBlockDialog(user)}
                        >
                          Block
                        </Button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Block Confirmation Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Block User
              </DialogTitle>
              <DialogDescription>
                {selectedUser && (
                  <>
                    Are you sure you want to block{" "}
                    <span className="font-medium">
                      {selectedUser.displayName || selectedUser.userId}
                    </span>
                    ? They won't be able to send you messages or interact with you.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {selectedUser && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedUser.avatarUrl} />
                    <AvatarFallback>
                      {selectedUser.displayName
                        ? selectedUser.displayName.charAt(0).toUpperCase()
                        : selectedUser.userId.charAt(1).toUpperCase()
                      }
                    </AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <p className="font-medium">
                      {selectedUser.displayName || selectedUser.userId}
                    </p>
                    {selectedUser.displayName && (
                      <p className="text-sm text-muted-foreground">
                        {selectedUser.userId}
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="block-reason">Reason (optional)</Label>
                <Textarea
                  id="block-reason"
                  placeholder="Enter a reason for blocking this user..."
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="min-h-20 resize-none"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={closeDialog}
                disabled={isBlocking}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleBlockUser}
                disabled={isBlocking}
              >
                {isBlocking ? "Blocking..." : "Block User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}