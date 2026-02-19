"use client";

import React, { useState, useEffect } from "react";
import { 
  Volume2, 
  Mic, 
  MicOff, 
  UserX, 
  Settings, 
  Users,
  Lock,
  Unlock,
  Crown,
  Shield,
  AlertTriangle
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserAvatar } from "@/components/user-avatar";
import { ActionTooltip } from "@/components/action-tooltip";
import { useModal } from "@/hooks/use-modal-store";
import { useVoiceChannelManager } from "@/hooks/use-voice-channel-manager";

interface VoiceChannelSettingsData {
  channelId: string;
  spaceId: string;
  currentSettings: {
    name?: string;
    topic?: string;
    bitrate?: number;
    userLimit?: number;
    isPrivate?: boolean;
    slowMode?: number;
    permissions?: {
      canJoin?: boolean;
      canSpeak?: boolean;
      canVideo?: boolean;
      canInvite?: boolean;
    };
  };
}

export function VoiceChannelSettingsModal() {
  const { isOpen, onClose, type, data } = useModal();
  const { participants } = useVoiceChannelManager();
  
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<VoiceChannelSettingsData["currentSettings"]>({});
  
  const isModalOpen = isOpen && type === "voiceChannelSettings";
  const { voiceChannelSettings } = data;

  // Initialize settings when modal opens
  useEffect(() => {
    if (isModalOpen && voiceChannelSettings) {
      setSettings(voiceChannelSettings.currentSettings);
    }
  }, [isModalOpen, voiceChannelSettings]);

  const handleClose = () => {
    setSettings({});
    onClose();
  };

  const handleSaveSettings = async () => {
    if (!voiceChannelSettings) return;
    
    setIsLoading(true);
    
    try {
      // TODO: Implement API call to update voice channel settings
      const response = await fetch(`/api/matrix/rooms/${voiceChannelSettings.channelId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error("Failed to update channel settings");
      }

      handleClose();
      // TODO: Show success toast
    } catch (error) {
      console.error("Error updating voice channel settings:", error);
      // TODO: Show error toast
    } finally {
      setIsLoading(false);
    }
  };

  const handleKickUser = async (userId: string) => {
    if (!voiceChannelSettings) return;
    
    try {
      // TODO: Implement kick user from voice channel
      const response = await fetch(`/api/matrix/rooms/${voiceChannelSettings.channelId}/kick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error("Failed to kick user");
      }

      // TODO: Show success toast
    } catch (error) {
      console.error("Error kicking user:", error);
      // TODO: Show error toast
    }
  };

  const handleMuteUser = async (userId: string, duration?: number) => {
    if (!voiceChannelSettings) return;
    
    try {
      // TODO: Implement mute user in voice channel
      const response = await fetch(`/api/matrix/rooms/${voiceChannelSettings.channelId}/mute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, duration }),
      });

      if (!response.ok) {
        throw new Error("Failed to mute user");
      }

      // TODO: Show success toast
    } catch (error) {
      console.error("Error muting user:", error);
      // TODO: Show error toast
    }
  };

  if (!isModalOpen || !voiceChannelSettings) {
    return null;
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] bg-[#313338] text-white border-zinc-700">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Voice Channel Settings
          </DialogTitle>
          <DialogDescription>
            Configure settings and manage participants for this voice channel.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            <TabsTrigger value="participants">Participants</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-96 mt-4">
            {/* General Settings Tab */}
            <TabsContent value="general" className="space-y-6">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="channel-name">Channel Name</Label>
                  <Input
                    id="channel-name"
                    value={settings.name || ""}
                    onChange={(e) => setSettings(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter channel name"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="channel-topic">Channel Topic</Label>
                  <Input
                    id="channel-topic"
                    value={settings.topic || ""}
                    onChange={(e) => setSettings(prev => ({ ...prev, topic: e.target.value }))}
                    placeholder="Enter channel topic (optional)"
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="bitrate">Audio Quality (Bitrate)</Label>
                    <Select
                      value={settings.bitrate?.toString() || "64000"}
                      onValueChange={(value) => setSettings(prev => ({ ...prev, bitrate: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="64000">64 kbps (Good)</SelectItem>
                        <SelectItem value="96000">96 kbps (Better)</SelectItem>
                        <SelectItem value="128000">128 kbps (Best)</SelectItem>
                        <SelectItem value="256000">256 kbps (Premium)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="user-limit">User Limit</Label>
                    <Select
                      value={settings.userLimit?.toString() || "0"}
                      onValueChange={(value) => setSettings(prev => ({ ...prev, userLimit: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">No limit</SelectItem>
                        <SelectItem value="5">5 users</SelectItem>
                        <SelectItem value="10">10 users</SelectItem>
                        <SelectItem value="25">25 users</SelectItem>
                        <SelectItem value="50">50 users</SelectItem>
                        <SelectItem value="99">99 users</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Private Channel</Label>
                      <p className="text-sm text-muted-foreground">
                        Only invited users can join this channel
                      </p>
                    </div>
                    <Switch
                      checked={settings.isPrivate || false}
                      onCheckedChange={(checked) => setSettings(prev => ({ ...prev, isPrivate: checked }))}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Permissions Tab */}
            <TabsContent value="permissions" className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Can Join Channel
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Allow users to join this voice channel
                    </p>
                  </div>
                  <Switch
                    checked={settings.permissions?.canJoin ?? true}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ 
                        ...prev, 
                        permissions: { ...prev.permissions, canJoin: checked } 
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Mic className="h-4 w-4" />
                      Can Speak
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Allow users to use their microphone
                    </p>
                  </div>
                  <Switch
                    checked={settings.permissions?.canSpeak ?? true}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ 
                        ...prev, 
                        permissions: { ...prev.permissions, canSpeak: checked } 
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Volume2 className="h-4 w-4" />
                      Can Use Video
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Allow users to use their camera
                    </p>
                  </div>
                  <Switch
                    checked={settings.permissions?.canVideo ?? true}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ 
                        ...prev, 
                        permissions: { ...prev.permissions, canVideo: checked } 
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Can Invite Others
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Allow users to invite others to the channel
                    </p>
                  </div>
                  <Switch
                    checked={settings.permissions?.canInvite ?? true}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ 
                        ...prev, 
                        permissions: { ...prev.permissions, canInvite: checked } 
                      }))
                    }
                  />
                </div>
              </div>
            </TabsContent>

            {/* Participants Tab */}
            <TabsContent value="participants" className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Current Participants ({participants.length})</h4>
                </div>

                {participants.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No participants currently in this voice channel</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {participants.map((participant) => (
                      <div 
                        key={participant.id}
                        className="flex items-center justify-between p-3 rounded-lg border dark:border-zinc-700"
                      >
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            src={participant.avatarUrl}
                            className="h-8 w-8"
                          />
                          <div>
                            <p className="font-medium">{participant.displayName}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {participant.isLocal && (
                                <span className="text-xs bg-blue-500/20 text-blue-600 px-1.5 py-0.5 rounded">
                                  You
                                </span>
                              )}
                              {participant.isSpeaking && (
                                <span className="flex items-center gap-1 text-green-600">
                                  <Volume2 className="h-3 w-3" />
                                  Speaking
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Audio Status */}
                          <ActionTooltip 
                            label={participant.isAudioEnabled ? "Microphone on" : "Microphone off"}
                          >
                            <div className={`p-1 rounded ${
                              participant.isAudioEnabled 
                                ? "text-green-600" 
                                : "text-red-500"
                            }`}>
                              {participant.isAudioEnabled ? (
                                <Mic className="h-4 w-4" />
                              ) : (
                                <MicOff className="h-4 w-4" />
                              )}
                            </div>
                          </ActionTooltip>

                          {/* Admin Actions */}
                          {!participant.isLocal && (
                            <div className="flex items-center gap-1">
                              <ActionTooltip label="Mute user">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMuteUser(participant.id)}
                                  className="h-8 w-8 p-0 hover:bg-red-500/20"
                                >
                                  <MicOff className="h-4 w-4 text-red-500" />
                                </Button>
                              </ActionTooltip>

                              <ActionTooltip label="Kick from channel">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleKickUser(participant.id)}
                                  className="h-8 w-8 p-0 hover:bg-red-500/20"
                                >
                                  <UserX className="h-4 w-4 text-red-500" />
                                </Button>
                              </ActionTooltip>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveSettings} 
            disabled={isLoading}
            className="min-w-[80px]"
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}