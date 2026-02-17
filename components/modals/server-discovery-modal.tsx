"use client";

import React, { useState } from "react";
import { Users, Search, Hash, Globe, Loader2, CheckCircle, Plus, ExternalLink } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useModal } from "@/hooks/use-modal-store";
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
  {
    id: "#gaming:matrix.org",
    name: "Gaming",
    description: "Discussion about video games, board games, and gaming culture",
    memberCount: 320,
    topic: "Share your gaming experiences and find gaming buddies",
    isPublic: true,
    category: "Gaming",
  },
  {
    id: "#programming:matrix.org",
    name: "Programming",
    description: "Developer discussions, code help, and tech talk",
    memberCount: 580,
    topic: "Programming languages, frameworks, and development best practices",
    isPublic: true,
    category: "Technology",
  },
];

const CATEGORIES = ["All", "Community", "Technology", "Support", "General", "Gaming"];

// =============================================================================
// Component
// =============================================================================

export function ServerDiscoveryModal() {
  const { isOpen, onClose, type } = useModal();
  const matrixClient = useMatrixClient();

  const isModalOpen = isOpen && type === "serverDiscovery";

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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      setSuccessMessage(`Already joined ${server.name}!`);
      setTimeout(() => setSuccessMessage(null), 3000);
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsJoiningServer(server.id);
    
    try {
      const client = matrixClient?.client;
      if (!client) {
        throw new Error("Matrix client not available. Please log in first.");
      }
      
      // Join the room/space
      await client.joinRoom(server.id);
      
      // Mark as joined
      setJoinedServers(prev => new Set(Array.from(prev).concat(server.id)));
      
      setSuccessMessage(`Successfully joined ${server.name}!`);
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (err) {
      console.error("Failed to join server:", err);
      setError(
        err instanceof Error 
          ? `Failed to join ${server.name}: ${err.message}`
          : `Failed to join ${server.name}. Please try again.`
      );
      setTimeout(() => setError(null), 5000);
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
    setSuccessMessage(null);
    setIsJoiningCustom(true);
    
    try {
      const client = matrixClient?.client;
      if (!client) {
        throw new Error("Matrix client not available. Please log in first.");
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
      
      // Mark as joined
      setJoinedServers(prev => new Set(Array.from(prev).concat(roomId)));
      
      setSuccessMessage(`Successfully joined ${roomName}!`);
      setCustomInviteUrl("");
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (err) {
      console.error("Failed to join via invite:", err);
      setError(
        err instanceof Error 
          ? `Failed to join server: ${err.message}`
          : "Failed to join server. Please check the invite link and try again."
      );
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsJoiningCustom(false);
    }
  };

  const handleClose = () => {
    setActiveTab("browse");
    setSelectedCategory("All");
    setSearchQuery("");
    setCustomInviteUrl("");
    setError(null);
    setSuccessMessage(null);
    onClose();
  };

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white text-black max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="pt-8 px-6">
          <DialogTitle className="text-2xl text-center font-bold flex items-center justify-center gap-2">
            <Globe className="w-6 h-6" />
            Explore Servers
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-500">
            Discover and join communities around your interests
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="browse">Browse Communities</TabsTrigger>
              <TabsTrigger value="invite">Join via Invite</TabsTrigger>
            </TabsList>
            
            {/* Browse Communities Tab */}
            <TabsContent value="browse" className="space-y-4 mt-4">
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
              <div className="grid gap-3 max-h-96 overflow-y-auto">
                {filteredServers.map((server) => {
                  const isJoined = joinedServers.has(server.id);
                  const isJoining = isJoiningServer === server.id;
                  
                  return (
                    <Card 
                      key={server.id} 
                      className="hover:border-muted-foreground/30 transition-colors"
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
                              {isJoined && (
                                <CheckCircle className="w-4 h-4 text-green-500 ml-2" />
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
                                <Users className="w-3 h-3 inline mr-1" />
                                {server.memberCount.toLocaleString()} members
                              </p>
                            )}
                          </div>
                          <div className="ml-4 flex-shrink-0">
                            <Button
                              size="sm"
                              variant={isJoined ? "secondary" : "default"}
                              onClick={() => handleJoinServer(server)}
                              disabled={isJoining}
                            >
                              {isJoining ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : isJoined ? (
                                "Joined"
                              ) : (
                                <>
                                  <Plus className="w-4 h-4 mr-1" />
                                  Join
                                </>
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
            <TabsContent value="invite" className="space-y-4 mt-4">
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

          {/* Error Display */}
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Display */}
          {successMessage && (
            <Alert className="mt-4 border-green-200 bg-green-50">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-700">
                {successMessage}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}