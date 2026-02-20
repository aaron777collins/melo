"use client";

/**
 * Server Join Step Component
 * 
 * Helps users discover and join their first community/server during onboarding.
 * Shows popular public servers and allows custom server joining via invite links.
 */

import React, { useState, useEffect } from "react";
import { Users, Search, Plus, ExternalLink, Globe, Hash, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMatrixClient } from "@/hooks/use-matrix-client";

// =============================================================================
// Types
// =============================================================================

interface ServerInfo {
  id: string;
  name: string;
  description: string;
  memberCount?: number;
  topic?: string;
  avatarUrl?: string;
  isPublic: boolean;
  category?: string;
}

interface ServerJoinStepProps {
  selectedServer?: {
    id: string;
    name: string;
    description?: string;
  };
  onServerSelect: (server: { id: string; name: string; description?: string }) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip?: () => void;
  className?: string;
}

// =============================================================================
// Sample Data (in a real app, this would come from an API or directory service)
// =============================================================================

const FEATURED_SERVERS: ServerInfo[] = [
  {
    id: "#melo-community:matrix.org",
    name: "Melo Community",
    description: "Official Melo support and community discussions",
    memberCount: 250,
    topic: "Get help, share feedback, and connect with other Melo users",
    isPublic: true,
    category: "Community",
  },
  {
    id: "#matrix-general:matrix.org",
    name: "Matrix General",
    description: "General discussion about the Matrix protocol and ecosystem",
    memberCount: 1420,
    topic: "Welcome to Matrix! General discussion and support",
    isPublic: true,
    category: "Technology",
  },
  {
    id: "#new-users:matrix.org",
    name: "New Users",
    description: "Help and support for people new to Matrix",
    memberCount: 890,
    topic: "Questions? Need help? This is the place for Matrix beginners",
    isPublic: true,
    category: "Support",
  },
  {
    id: "#off-topic:matrix.org",
    name: "Off Topic",
    description: "Casual conversations about anything and everything",
    memberCount: 650,
    topic: "General chat room for discussions about life, the universe, and everything",
    isPublic: true,
    category: "General",
  },
];

const CATEGORIES = ["All", "Community", "Technology", "Support", "General"];

// =============================================================================
// Component
// =============================================================================

export function ServerJoinStep({
  selectedServer,
  onServerSelect,
  onNext,
  onBack,
  onSkip,
  className,
}: ServerJoinStepProps) {
  const matrixClient = useMatrixClient();
  
  // State
  const [activeTab, setActiveTab] = useState("browse");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [customInviteUrl, setCustomInviteUrl] = useState("");
  const [joinedServers, setJoinedServers] = useState<Set<string>>(new Set());
  
  // Loading states
  const [isJoiningServer, setIsJoiningServer] = useState<string | null>(null);
  const [isJoiningCustom, setIsJoiningCustom] = useState(false);
  
  // Error state
  const [error, setError] = useState<string | null>(null);

  // Filtered servers
  const filteredServers = FEATURED_SERVERS.filter((server) => {
    const matchesCategory = selectedCategory === "All" || server.category === selectedCategory;
    const matchesSearch = searchQuery === "" || 
      server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      server.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  // =============================================================================
  // Handlers
  // =============================================================================

  /**
   * Handle joining a featured server
   */
  const handleJoinServer = async (server: ServerInfo) => {
    if (joinedServers.has(server.id)) {
      // Already joined, just select it
      onServerSelect({
        id: server.id,
        name: server.name,
        description: server.description,
      });
      return;
    }

    setError(null);
    setIsJoiningServer(server.id);
    
    try {
      const client = matrixClient?.client;
      if (!client) {
        throw new Error("Matrix client not available");
      }
      
      // Join the room/space
      await client.joinRoom(server.id);
      
      // Mark as joined
      setJoinedServers(prev => new Set(Array.from(prev).concat(server.id)));
      
      // Select this server
      onServerSelect({
        id: server.id,
        name: server.name,
        description: server.description,
      });
      
    } catch (err) {
      console.error("Failed to join server:", err);
      setError(
        err instanceof Error 
          ? `Failed to join ${server.name}: ${err.message}`
          : `Failed to join ${server.name}. Please try again.`
      );
    } finally {
      setIsJoiningServer(null);
    }
  };

  /**
   * Handle joining via custom invite URL
   */
  const handleJoinCustom = async () => {
    if (!customInviteUrl.trim()) {
      setError("Please enter an invite link");
      return;
    }
    
    setError(null);
    setIsJoiningCustom(true);
    
    try {
      const client = matrixClient?.client;
      if (!client) {
        throw new Error("Matrix client not available");
      }
      
      // Extract room ID from various invite formats
      let roomId = customInviteUrl.trim();
      
      // Handle matrix.to URLs
      if (roomId.includes("matrix.to")) {
        const match = roomId.match(/#([^?]+)/);
        if (match) {
          roomId = `#${match[1]}`;
        }
      }
      
      // Handle direct room addresses or IDs
      if (!roomId.startsWith("#") && !roomId.startsWith("!")) {
        roomId = `#${roomId}`;
      }
      
      // Join the room
      await client.joinRoom(roomId);
      
      // Try to get room name for display
      const room = client.getRoom(roomId);
      const roomName = room?.name || roomId;
      
      // Mark as joined and select
      setJoinedServers(prev => new Set(Array.from(prev).concat(roomId)));
      onServerSelect({
        id: roomId,
        name: roomName,
        description: "Joined via invite link",
      });
      
      // Switch to browse tab to show selection
      setActiveTab("browse");
      setCustomInviteUrl("");
      
    } catch (err) {
      console.error("Failed to join via invite:", err);
      setError(
        err instanceof Error 
          ? `Failed to join server: ${err.message}`
          : "Failed to join server. Please check the invite link and try again."
      );
    } finally {
      setIsJoiningCustom(false);
    }
  };

  /**
   * Handle server selection (for already joined servers)
   */
  const handleSelectServer = (server: ServerInfo) => {
    onServerSelect({
      id: server.id,
      name: server.name,
      description: server.description,
    });
  };

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <div className={`space-y-6 max-w-3xl mx-auto ${className || ""}`}>
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
          <Users className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold">Join Your First Community</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Servers are like Discord servers - they contain multiple channels organized around topics or communities
        </p>
      </div>

      {/* Server Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Choose a Community
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="browse">Browse Communities</TabsTrigger>
              <TabsTrigger value="invite">Join via Invite</TabsTrigger>
            </TabsList>
            
            {/* Browse Communities Tab */}
            <TabsContent value="browse" className="space-y-4">
              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search communities..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {CATEGORIES.map((category) => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Server List */}
              <div className="grid gap-3">
                {filteredServers.map((server) => {
                  const isJoined = joinedServers.has(server.id);
                  const isSelected = selectedServer?.id === server.id;
                  const isJoining = isJoiningServer === server.id;
                  
                  return (
                    <Card 
                      key={server.id} 
                      className={`cursor-pointer transition-colors ${
                        isSelected 
                          ? "border-green-500 bg-green-50 dark:bg-green-950/20" 
                          : "hover:border-muted-foreground/30"
                      }`}
                      onClick={() => isJoined ? handleSelectServer(server) : undefined}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Hash className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <h3 className="font-semibold">{server.name}</h3>
                              {server.category && (
                                <Badge variant="secondary" className="text-xs">
                                  {server.category}
                                </Badge>
                              )}
                              {isSelected && (
                                <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {server.description}
                            </p>
                            {server.topic && (
                              <p className="text-xs text-muted-foreground italic">
                                {server.topic}
                              </p>
                            )}
                            {server.memberCount && (
                              <p className="text-xs text-muted-foreground">
                                {server.memberCount.toLocaleString()} members
                              </p>
                            )}
                          </div>
                          <div className="ml-4 flex-shrink-0">
                            <Button
                              size="sm"
                              variant={isJoined ? (isSelected ? "default" : "outline") : "default"}
                              onClick={(e) => {
                                e.stopPropagation();
                                isJoined ? handleSelectServer(server) : handleJoinServer(server);
                              }}
                              disabled={isJoining}
                            >
                              {isJoining ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : isJoined ? (
                                isSelected ? "Selected" : "Select"
                              ) : (
                                "Join"
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                
                {filteredServers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No communities found matching your search.</p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            {/* Join via Invite Tab */}
            <TabsContent value="invite" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="invite-url">Invite Link or Room Address</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="invite-url"
                      placeholder="https://matrix.to/#/!room:server.com or #room:server.com"
                      value={customInviteUrl}
                      onChange={(e) => setCustomInviteUrl(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleJoinCustom}
                      disabled={isJoiningCustom || !customInviteUrl.trim()}
                    >
                      {isJoiningCustom ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Join
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Enter a Matrix room address (#room:server.com) or a matrix.to invite link
                  </p>
                </div>
                
                <Alert>
                  <ExternalLink className="w-4 h-4" />
                  <AlertDescription>
                    <strong>Got an invite from a friend?</strong> Paste the link here to join their community directly.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Selected Server Display */}
      {selectedServer && (
        <Alert>
          <CheckCircle className="w-4 h-4" />
          <AlertDescription>
            <strong>Selected:</strong> {selectedServer.name}
            {selectedServer.description && ` - ${selectedServer.description}`}
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onBack} className="order-2 sm:order-1">
          Back
        </Button>
        
        <Button 
          onClick={onNext}
          disabled={!selectedServer}
          className="order-1 sm:order-2 flex-1"
        >
          Continue to Chat Tutorial
        </Button>
        
        {onSkip && (
          <Button 
            type="button" 
            variant="ghost" 
            onClick={onSkip}
            className="order-3 text-muted-foreground"
          >
            Skip Server Joining
          </Button>
        )}
      </div>

      {/* Help Text */}
      <div className="text-center pt-2">
        <p className="text-xs text-muted-foreground">
          Don&apos;t worry - you can join more communities anytime from the main interface
        </p>
      </div>
    </div>
  );
}