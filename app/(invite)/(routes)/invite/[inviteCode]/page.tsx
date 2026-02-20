"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Hash, Globe, AlertCircle, Loader2, CheckCircle, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

import { useMatrixClient } from "@/hooks/use-matrix-client";
import { parseInviteUrl, createInviteService } from "@/lib/matrix/invites";
import { validateInviteUsage, trackInviteUsage } from "@/lib/matrix/invite-tracker";

interface InviteCodePageProps {
  params: {
    inviteCode: string;
  };
}

interface RoomPreview {
  id: string;
  name: string;
  topic?: string;
  avatarUrl?: string;
  memberCount?: number;
  isPublic?: boolean;
  alias?: string;
}

interface InvitePageState {
  status: 'loading' | 'preview' | 'joining' | 'joined' | 'error';
  roomPreview?: RoomPreview;
  error?: string;
  inviteUrl?: string;
}

/**
 * Invite Code Page
 * 
 * Handles Matrix-based invite system with server preview and joining
 */
export default function InviteCodePage({ params }: InviteCodePageProps) {
  const { client, isReady } = useMatrixClient();
  const router = useRouter();
  const [state, setState] = useState<InvitePageState>({ status: 'loading' });

  // Construct the full invite URL from the code
  const [inviteUrl, setInviteUrl] = useState<string>('');

  useEffect(() => {
    // Set the invite URL on client side only
    if (typeof window !== 'undefined') {
      setInviteUrl(`${window.location.origin}/invite/${params.inviteCode}`);
    }
  }, [params.inviteCode]);

  useEffect(() => {
    if (!isReady || !client || !inviteUrl) {
      return;
    }

    loadInvitePreview();
  }, [isReady, client, inviteUrl]);

  const loadInvitePreview = async () => {
    if (!inviteUrl) return;
    
    try {
      setState({ status: 'loading' });

      // Parse the invite URL to get room information
      const inviteInfo = parseInviteUrl(inviteUrl);
      
      if (!inviteInfo) {
        setState({ 
          status: 'error', 
          error: 'Invalid invite link format' 
        });
        return;
      }

      let roomId: string;
      
      // Handle different invite formats
      if (inviteInfo.slug) {
        // Custom slug - need to resolve to room ID from stored invites
        roomId = await resolveSlugToRoomId(inviteInfo.slug);
      } else if (inviteInfo.alias) {
        // Matrix room alias - resolve to room ID
        const roomData = await client!.getRoomIdForAlias(inviteInfo.alias);
        roomId = roomData.room_id;
      } else if (inviteInfo.roomId) {
        roomId = inviteInfo.roomId;
      } else {
        throw new Error('Unable to identify room from invite');
      }

      // Validate the invite is still usable
      const validation = validateInviteUsage(client!, roomId, inviteUrl);
      if (!validation.valid) {
        setState({
          status: 'error',
          error: validation.reason || 'Invite is no longer valid'
        });
        return;
      }

      // Get room preview information
      const preview = await getRoomPreview(roomId);
      
      setState({
        status: 'preview',
        roomPreview: preview,
        inviteUrl
      });

    } catch (error) {
      console.error('[InviteCodePage] Failed to load invite preview:', error);
      setState({
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to load invite'
      });
    }
  };

  const resolveSlugToRoomId = async (slug: string): Promise<string> => {
    // Search through stored invites to find matching slug
    const inviteService = createInviteService(client!);
    
    // This is a limitation - we&apos;d need a better way to track slug->roomId mappings
    // For now, check localStorage for any invites with matching slug
    const allRoomKeys = Object.keys(localStorage).filter(key => key.startsWith('melo_invites_'));
    
    for (const key of allRoomKeys) {
      const roomId = key.replace('melo_invites_', '');
      const invites = inviteService.getInvites(roomId);
      const matchingInvite = invites.find(invite => invite.slug === slug);
      
      if (matchingInvite) {
        return roomId;
      }
    }
    
    throw new Error(`No room found for invite slug: ${slug}`);
  };

  const getRoomPreview = async (roomId: string): Promise<RoomPreview> => {
    const room = client!.getRoom(roomId);
    
    // If we&apos;re already in the room, get full details
    if (room) {
      const memberCount = room.getJoinedMemberCount();
      const name = room.name || roomId;
      const topic = room.currentState.getStateEvents('m.room.topic', '')?.getContent()?.topic;
      const avatarUrl = room.getMxcAvatarUrl();
      const alias = room.getCanonicalAlias();
      
      return {
        id: roomId,
        name,
        topic,
        avatarUrl: avatarUrl ? client!.mxcUrlToHttp(avatarUrl) ?? undefined : undefined,
        memberCount,
        alias: alias ?? undefined,
        isPublic: room.getJoinRule() === 'public'
      };
    }

    // If not in room, try to get preview via directory or room state
    try {
      // Try getting room info via directory API (for public rooms)
      const roomInfo = await client!.publicRooms({
        filter: { generic_search_term: roomId },
        limit: 1
      });

      const publicRoom = roomInfo.chunk.find(r => r.room_id === roomId);
      if (publicRoom) {
        return {
          id: roomId,
          name: publicRoom.name || roomId,
          topic: publicRoom.topic,
          avatarUrl: publicRoom.avatar_url ? client!.mxcUrlToHttp(publicRoom.avatar_url) ?? undefined : undefined,
          memberCount: publicRoom.num_joined_members,
          alias: publicRoom.canonical_alias,
          isPublic: true
        };
      }

      // Fallback to basic room ID info
      return {
        id: roomId,
        name: roomId,
        isPublic: false
      };

    } catch (error) {
      console.warn('[InviteCodePage] Failed to get room preview:', error);
      return {
        id: roomId,
        name: roomId,
        isPublic: false
      };
    }
  };

  const handleJoinRoom = async () => {
    if (!client || !state.roomPreview) return;

    try {
      setState(prev => ({ ...prev, status: 'joining' }));

      // Join the room
      await client.joinRoom(state.roomPreview.id);

      // Track the invite usage
      if (state.inviteUrl) {
        trackInviteUsage(client, {
          inviteUrl: state.inviteUrl,
          roomId: state.roomPreview.id,
          userId: client.getUserId()!,
          joinedAt: new Date(),
          userDisplayName: client.getUser(client.getUserId()!)?.displayName
        });
      }

      setState(prev => ({ ...prev, status: 'joined' }));

      // Redirect to the room after a short delay
      setTimeout(() => {
        router.push(`/servers/${state.roomPreview?.id}`);
      }, 2000);

    } catch (error) {
      console.error('[InviteCodePage] Failed to join room:', error);
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to join server'
      }));
    }
  };

  const handleGoHome = () => {
    router.push('/');
  };

  const handleGoBack = () => {
    router.back();
  };

  // Loading state
  if (!isReady || state.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <div className="text-center">
                <h3 className="font-semibold">Loading invite...</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Validating invite link
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (state.status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <div className="text-center">
                <h3 className="font-semibold text-lg">Invite Not Found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {state.error || 'This invite link is invalid or has expired.'}
                </p>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={handleGoBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go Back
                </Button>
                <Button onClick={handleGoHome}>
                  Go Home
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (state.status === 'joined') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <div className="text-center">
                <h3 className="font-semibold text-lg">Welcome!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  You&apos;ve successfully joined {state.roomPreview?.name}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Redirecting to server...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Preview state
  const room = state.roomPreview!;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={room.avatarUrl} />
              <AvatarFallback className="text-lg">
                {room.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">{room.name}</CardTitle>
              {room.alias && (
                <div className="flex items-center justify-center text-sm text-muted-foreground mt-1">
                  <Hash className="h-3 w-3 mr-1" />
                  {room.alias}
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {room.topic && (
            <div>
              <p className="text-sm text-center text-muted-foreground">
                {room.topic}
              </p>
            </div>
          )}

          <div className="flex items-center justify-center space-x-4">
            {room.memberCount !== undefined && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Users className="h-4 w-4 mr-1" />
                {room.memberCount.toLocaleString()} members
              </div>
            )}
            
            {room.isPublic && (
              <Badge variant="secondary" className="text-xs">
                <Globe className="h-3 w-3 mr-1" />
                Public
              </Badge>
            )}
          </div>

          <Separator />

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              You&apos;ve been invited to join <strong>{room.name}</strong>. 
              Click &quot;Join Server&quot; to accept this invitation.
            </AlertDescription>
          </Alert>

          <div className="flex flex-col space-y-2">
            <Button 
              onClick={handleJoinRoom} 
              disabled={state.status === 'joining'}
              className="w-full"
            >
              {state.status === 'joining' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                'Join Server'
              )}
            </Button>
            
            <Button variant="outline" onClick={handleGoHome} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
