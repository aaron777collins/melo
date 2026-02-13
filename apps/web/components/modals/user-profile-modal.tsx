"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  MessageCircle,
  UserPlus,
  Shield,
  Clock,
  Calendar,
  Activity,
  Crown,
  MapPin,
  Globe
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";

import { useModal } from "@/hooks/use-modal-store";
import { getOrCreateDM } from "@/apps/web/services/matrix-dm";
import { 
  getMembers, 
  getMemberRole, 
  type Member, 
  type MemberRole 
} from "@/apps/web/services/matrix-member";
import { getClient } from "@/lib/matrix/client";

// =============================================================================
// Types and Constants
// =============================================================================

/**
 * User profile information
 */
interface UserProfile {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio?: string | null;
  homeserver?: string;
  isOnline: boolean;
  lastActiveAt: Date | null;
  joinedAt: Date | null;
  // Role information (if in a space context)
  role?: MemberRole;
  powerLevel?: number;
  // Additional Matrix profile info
  presenceStatus?: 'online' | 'offline' | 'unavailable';
  statusMessage?: string;
}

const ROLE_CONFIGS = {
  owner: {
    name: 'Owner',
    color: 'bg-red-500 text-white',
    icon: Crown,
    description: 'Full server control'
  },
  admin: {
    name: 'Admin', 
    color: 'bg-orange-500 text-white',
    icon: Shield,
    description: 'Manage server and members'
  },
  moderator: {
    name: 'Moderator',
    color: 'bg-blue-500 text-white', 
    icon: Shield,
    description: 'Moderate members and channels'
  },
  member: {
    name: 'Member',
    color: 'bg-gray-500 text-white',
    icon: User,
    description: 'Standard member'
  },
  restricted: {
    name: 'Restricted',
    color: 'bg-red-700 text-white',
    icon: Shield,
    description: 'Limited permissions'
  }
} as const;

// =============================================================================
// Component
// =============================================================================

export function UserProfileModal() {
  const router = useRouter();
  const { isOpen, onClose, type, data } = useModal();
  const isModalOpen = isOpen && type === "userProfile";
  const { userId, spaceId } = data;

  // State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDMLoading, setIsDMLoading] = useState(false);

  // Load user profile data
  useEffect(() => {
    if (!isModalOpen || !userId) {
      setProfile(null);
      setError(null);
      return;
    }

    const loadProfile = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const client = getClient();
        if (!client) {
          throw new Error('Matrix client not available');
        }

        // Get basic Matrix profile info
        const profileInfo = await client.getProfileInfo(userId);
        
        let memberInfo: Member | null = null;
        
        // Get member info if we have a space context
        if (spaceId) {
          try {
            const members = await getMembers(spaceId);
            memberInfo = members.find(member => member.userId === userId) || null;
          } catch (err) {
            // User might not be in this space, that's ok
            console.warn('Could not get member info for user:', err);
          }
        }

        // Get presence information if available
        const user = client.getUser(userId);
        const presenceState = user?.presence as 'online' | 'offline' | 'unavailable' | undefined;
        const lastActiveAgo = user?.lastActiveAgo;
        
        // Extract homeserver from user ID
        const homeserver = userId.split(':')[1] || undefined;
        
        const userProfile: UserProfile = {
          userId,
          displayName: profileInfo.displayname || null,
          avatarUrl: profileInfo.avatar_url || null,
          homeserver,
          isOnline: memberInfo?.isOnline ?? (presenceState === 'online' || presenceState === 'unavailable'),
          lastActiveAt: lastActiveAgo ? new Date(Date.now() - lastActiveAgo) : memberInfo?.lastActiveAt || null,
          joinedAt: memberInfo?.joinedAt || null,
          role: memberInfo?.role,
          powerLevel: memberInfo?.powerLevel,
          presenceStatus: presenceState,
          statusMessage: user?.presenceStatusMsg || undefined
        };

        setProfile(userProfile);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load user profile');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [isModalOpen, userId, spaceId]);

  // Handle starting a DM conversation
  const handleSendMessage = async () => {
    if (!userId || !profile) return;

    setIsDMLoading(true);
    try {
      const dmRoom = await getOrCreateDM(userId);
      
      // Navigate to the DM room
      router.push(`/servers/dms/${dmRoom.roomId}`);
      onClose();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start conversation');
    } finally {
      setIsDMLoading(false);
    }
  };

  // Handle adding friend (placeholder)
  const handleAddFriend = () => {
    // TODO: Implement friend system
    console.log('Add friend feature coming soon');
  };

  const handleClose = () => {
    onClose();
    setProfile(null);
    setError(null);
  };

  if (!userId) return null;

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white dark:bg-[#2B2D31] text-black dark:text-white p-0 overflow-hidden max-w-md">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
          </div>
        ) : error ? (
          <div className="p-6">
            <div className="text-center text-red-500">
              <User className="h-12 w-12 mx-auto mb-2" />
              <p>{error}</p>
            </div>
          </div>
        ) : profile ? (
          <>
            {/* Header with avatar and basic info */}
            <div className="relative">
              {/* Background banner (could be customizable in future) */}
              <div className="h-24 bg-gradient-to-br from-indigo-500 to-purple-600" />
              
              {/* Avatar */}
              <div className="absolute -bottom-12 left-6">
                <div className="relative">
                  <Avatar className="h-24 w-24 border-4 border-white dark:border-[#2B2D31]">
                    <AvatarImage src={profile.avatarUrl || undefined} />
                    <AvatarFallback className="text-xl font-bold bg-indigo-500 text-white">
                      {profile.displayName?.substring(0, 2).toUpperCase() || 
                       profile.userId.substring(1, 3).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Online indicator */}
                  <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-white dark:border-[#2B2D31] ${
                    profile.isOnline ? 'bg-green-500' : 'bg-gray-500'
                  }`} />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="pt-16 pb-6 px-6 space-y-4">
              {/* User info */}
              <div>
                <h2 className="text-xl font-bold mb-1">
                  {profile.displayName || profile.userId}
                  {profile.role === 'owner' && <Crown className="h-5 w-5 text-yellow-500 ml-2 inline" />}
                </h2>
                
                <div className="flex items-center text-sm text-zinc-500 dark:text-zinc-400 mb-2">
                  <span>{profile.userId}</span>
                  {profile.homeserver && (
                    <>
                      <Globe className="h-3 w-3 mx-2" />
                      <span>{profile.homeserver}</span>
                    </>
                  )}
                </div>

                {/* Status message */}
                {profile.statusMessage && (
                  <div className="flex items-center text-sm text-zinc-600 dark:text-zinc-300 mb-2">
                    <Activity className="h-3 w-3 mr-2" />
                    <span className="italic">"{profile.statusMessage}"</span>
                  </div>
                )}

                {/* Server role badge */}
                {profile.role && spaceId && (
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={`${ROLE_CONFIGS[profile.role].color} flex items-center gap-1`}>
                      {React.createElement(ROLE_CONFIGS[profile.role].icon, { className: "h-3 w-3" })}
                      {ROLE_CONFIGS[profile.role].name}
                    </Badge>
                  </div>
                )}
              </div>

              <Separator />

              {/* Activity information */}
              <Card className="bg-zinc-100 dark:bg-zinc-800 border-0">
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-medium text-sm text-zinc-700 dark:text-zinc-300">Activity</h3>
                  
                  {/* Online status */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${profile.isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
                      <span className="text-zinc-600 dark:text-zinc-400">Status</span>
                    </div>
                    <span className="font-medium">
                      {profile.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>

                  {/* Last active */}
                  {profile.lastActiveAt && !profile.isOnline && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-zinc-500" />
                        <span className="text-zinc-600 dark:text-zinc-400">Last active</span>
                      </div>
                      <span className="font-medium">
                        {profile.lastActiveAt.toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  {/* Join date */}
                  {profile.joinedAt && spaceId && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-zinc-500" />
                        <span className="text-zinc-600 dark:text-zinc-400">Joined server</span>
                      </div>
                      <span className="font-medium">
                        {profile.joinedAt.toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button 
                  onClick={handleSendMessage}
                  disabled={isDMLoading}
                  className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white flex items-center gap-2"
                >
                  {isDMLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <MessageCircle className="h-4 w-4" />
                  )}
                  Message
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={handleAddFriend}
                  className="flex items-center gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Add Friend
                </Button>
              </div>

              {/* Note about add friend */}
              <p className="text-xs text-center text-zinc-500 dark:text-zinc-400">
                Friend system coming soon
              </p>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}