/**
 * Notification Form Component
 *
 * Comprehensive notification settings form with per-server preferences
 * and per-channel overrides. Includes mute options with duration support.
 * Settings are persisted to Matrix account data.
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Bell, 
  BellOff, 
  Volume2, 
  VolumeX, 
  Settings,
  ChevronDown,
  ChevronRight,
  Hash,
  Users,
  Clock,
  Shield,
  MessageCircle,
  AtSign
} from "lucide-react";
import { format, addMinutes, addHours, addDays, addWeeks } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getClient } from "@/lib/matrix/client";
import { type MatrixProfile } from "@/lib/current-profile";
import { type Server, type Channel } from "@/lib/melo-types";

// =============================================================================
// Types
// =============================================================================

export type NotificationLevel = "all" | "mentions" | "disabled";

export interface ServerNotificationSettings {
  level: NotificationLevel;
  muteUntil?: Date;
}

export interface ChannelNotificationSettings {
  level?: NotificationLevel; // undefined means inherit from server
  muteUntil?: Date;
}

export interface NotificationSettingsData {
  globalEnabled: boolean;
  servers: Record<string, ServerNotificationSettings>;
  channels: Record<string, ChannelNotificationSettings>;
}

interface NotificationFormProps {
  profile: MatrixProfile;
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

const NOTIFICATION_LEVELS = [
  {
    value: "all" as const,
    label: "All Messages",
    description: "Get notified for every message",
    icon: Bell
  },
  {
    value: "mentions" as const,
    label: "Mentions Only", 
    description: "Only get notified when mentioned",
    icon: AtSign
  },
  {
    value: "disabled" as const,
    label: "Disabled",
    description: "No notifications",
    icon: BellOff
  }
];

const MUTE_DURATIONS = [
  { label: "5 minutes", value: () => addMinutes(new Date(), 5) },
  { label: "1 hour", value: () => addHours(new Date(), 1) },
  { label: "8 hours", value: () => addHours(new Date(), 8) },
  { label: "24 hours", value: () => addDays(new Date(), 1) },
  { label: "1 week", value: () => addWeeks(new Date(), 1) },
  { label: "Until I turn it back on", value: () => addWeeks(new Date(), 520) }, // ~10 years
];

const ACCOUNT_DATA_TYPE = "com.melo.notification_settings";

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get default notification settings
 */
function getDefaultSettings(): NotificationSettingsData {
  return {
    globalEnabled: true,
    servers: {},
    channels: {}
  };
}

/**
 * Check if a mute is currently active
 */
function isMuted(muteUntil?: Date): boolean {
  return muteUntil ? new Date() < muteUntil : false;
}

/**
 * Get effective notification level for a channel
 */
function getEffectiveLevel(
  settings: NotificationSettingsData,
  serverId: string,
  channelId: string
): NotificationLevel {
  // Check if globally disabled
  if (!settings.globalEnabled) {
    return "disabled";
  }

  // Check channel-specific setting first
  const channelSettings = settings.channels[channelId];
  if (channelSettings?.level) {
    return channelSettings.level;
  }

  // Fall back to server setting
  const serverSettings = settings.servers[serverId];
  return serverSettings?.level || "mentions";
}

// =============================================================================
// Custom Hooks
// =============================================================================

/**
 * Hook to manage notification settings with Matrix account data persistence
 */
function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettingsData>(getDefaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load settings from Matrix account data
  const loadSettings = useCallback(async () => {
    try {
      const client = getClient();
      if (!client) return;

      const accountData = (client as any).getAccountData(ACCOUNT_DATA_TYPE);
      if (accountData?.getContent()) {
        const data = accountData.getContent();
        setSettings({
          globalEnabled: data.globalEnabled ?? true,
          servers: data.servers || {},
          channels: data.channels || {}
        });
      }
    } catch (error) {
      console.error("Failed to load notification settings:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save settings to Matrix account data
  const saveSettings = useCallback(async (newSettings: NotificationSettingsData) => {
    setSaving(true);
    try {
      const client = getClient();
      if (!client) throw new Error("Matrix client not available");

      await (client as any).setAccountData(ACCOUNT_DATA_TYPE, newSettings);
      setSettings(newSettings);
    } catch (error) {
      console.error("Failed to save notification settings:", error);
      throw error;
    } finally {
      setSaving(false);
    }
  }, []);

  // Update server settings
  const updateServerSettings = useCallback((serverId: string, serverSettings: ServerNotificationSettings) => {
    const newSettings = {
      ...settings,
      servers: {
        ...settings.servers,
        [serverId]: serverSettings
      }
    };
    void saveSettings(newSettings);
  }, [settings, saveSettings]);

  // Update channel settings
  const updateChannelSettings = useCallback((channelId: string, channelSettings: ChannelNotificationSettings) => {
    const newSettings = {
      ...settings,
      channels: {
        ...settings.channels,
        [channelId]: channelSettings
      }
    };
    void saveSettings(newSettings);
  }, [settings, saveSettings]);

  // Toggle global enabled state
  const toggleGlobalEnabled = useCallback(() => {
    const newSettings = {
      ...settings,
      globalEnabled: !settings.globalEnabled
    };
    void saveSettings(newSettings);
  }, [settings, saveSettings]);

  // Initialize on mount
  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  return {
    settings,
    loading,
    saving,
    updateServerSettings,
    updateChannelSettings,
    toggleGlobalEnabled
  };
}

/**
 * Hook to fetch servers and channels from Matrix
 */
function useServersAndChannels() {
  const [servers, setServers] = useState<Server[]>([]);
  const [channelsByServer, setChannelsByServer] = useState<Record<string, Channel[]>>({});
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const client = getClient();
      if (!client) return;

      // Get joined rooms
      const rooms = client.getRooms();
      const serversList: Server[] = [];
      const channelsMap: Record<string, Channel[]> = {};

      // Simple implementation: treat all rooms as servers for demo purposes
      // In a real implementation, you'd parse the Matrix space hierarchy
      for (const room of rooms) {
        if (room.isSpaceRoom()) {
          // This is a space (server)
          const server: Server = {
            id: room.roomId,
            name: room.name || "Unnamed Server",
            imageUrl: room.getAvatarUrl(client.baseUrl, 32, 32, "crop") || "",
            inviteCode: "",
            profileId: "",
            createdAt: new Date(room.getMyMembership() === "join" ? Date.now() : 0),
            updatedAt: new Date()
          };
          
          serversList.push(server);
          
          // For demo purposes, create some sample channels
          // In a real implementation, you'd query the space's child rooms
          channelsMap[room.roomId] = [
            {
              id: `${room.roomId}:general`,
              name: "general",
              type: "TEXT",
              profileId: "",
              serverId: room.roomId,
              createdAt: new Date(),
              updatedAt: new Date()
            },
            {
              id: `${room.roomId}:random`,
              name: "random",
              type: "TEXT",
              profileId: "",
              serverId: room.roomId,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          ];
        } else {
          // This is a regular room - treat as a "direct server" for demo
          const server: Server = {
            id: room.roomId,
            name: room.name || "Unnamed Room",
            imageUrl: room.getAvatarUrl(client.baseUrl, 32, 32, "crop") || "",
            inviteCode: "",
            profileId: "",
            createdAt: new Date(room.getMyMembership() === "join" ? Date.now() : 0),
            updatedAt: new Date()
          };
          
          serversList.push(server);
          
          // Regular room has no sub-channels
          channelsMap[room.roomId] = [];
        }
      }

      setServers(serversList);
      setChannelsByServer(channelsMap);
    } catch (error) {
      console.error("Failed to load servers and channels:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return {
    servers,
    channelsByServer,
    loading
  };
}

// =============================================================================
// Components
// =============================================================================

/**
 * Global notification toggle
 */
function GlobalToggle({ 
  enabled, 
  onToggle 
}: { 
  enabled: boolean; 
  onToggle: () => void; 
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Global Notifications
        </CardTitle>
        <CardDescription>
          Master switch for all notifications
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">Enable Notifications</Label>
            <p className="text-sm text-muted-foreground">
              When disabled, you won&apos;t receive any notifications
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={onToggle} />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Server notification settings card
 */
function ServerSettingsCard({ 
  server, 
  channels, 
  settings, 
  onUpdateServer, 
  onUpdateChannel 
}: {
  server: Server;
  channels: Channel[];
  settings: NotificationSettingsData;
  onUpdateServer: (settings: ServerNotificationSettings) => void;
  onUpdateChannel: (channelId: string, settings: ChannelNotificationSettings) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  
  const serverSettings = settings.servers[server.id];
  const currentLevel = serverSettings?.level || "mentions";
  const serverMuted = isMuted(serverSettings?.muteUntil);

  const handleLevelChange = (level: NotificationLevel) => {
    onUpdateServer({
      ...serverSettings,
      level
    });
  };

  const handleMute = (duration: () => Date) => {
    onUpdateServer({
      ...serverSettings,
      level: currentLevel,
      muteUntil: duration()
    });
  };

  const handleUnmute = () => {
    onUpdateServer({
      ...serverSettings,
      level: currentLevel,
      muteUntil: undefined
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Users className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-medium">{server.name}</h3>
              <p className="text-sm text-muted-foreground">
                {channels.length} channels
              </p>
            </div>
            {serverMuted && (
              <Badge variant="secondary" className="ml-auto">
                <VolumeX className="h-3 w-3 mr-1" />
                Muted
              </Badge>
            )}
          </div>
          {channels.length > 0 && (
            <Collapsible open={expanded} onOpenChange={setExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {expanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Server-level settings */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label>Default Notification Level</Label>
            <p className="text-sm text-muted-foreground">
              Applied to all channels unless overridden
            </p>
          </div>
          <Select value={currentLevel} onValueChange={handleLevelChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NOTIFICATION_LEVELS.map(({ value, label, icon: Icon }) => (
                <SelectItem key={value} value={value}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Mute controls */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label>Mute Server</Label>
            <p className="text-sm text-muted-foreground">
              Temporarily disable all notifications
              {serverMuted && serverSettings?.muteUntil && (
                <span className="block text-xs">
                  Until {format(serverSettings.muteUntil, "MMM d, h:mm a")}
                </span>
              )}
            </p>
          </div>
          {serverMuted ? (
            <Button variant="outline" onClick={handleUnmute}>
              <Volume2 className="h-4 w-4 mr-2" />
              Unmute
            </Button>
          ) : (
            <Select onValueChange={(value) => {
              const duration = MUTE_DURATIONS.find(d => d.label === value);
              if (duration) handleMute(duration.value);
            }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Mute for..." />
              </SelectTrigger>
              <SelectContent>
                {MUTE_DURATIONS.map((duration) => (
                  <SelectItem key={duration.label} value={duration.label}>
                    {duration.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Channel overrides */}
        {channels.length > 0 && (
          <Collapsible open={expanded} onOpenChange={setExpanded}>
            <CollapsibleContent className="space-y-3">
              <Separator />
              <div className="space-y-1">
                <Label className="text-sm font-medium">Channel Overrides</Label>
                <p className="text-sm text-muted-foreground">
                  Override notification settings for specific channels
                </p>
              </div>
              
              {channels.map((channel) => (
                <ChannelOverride
                  key={channel.id}
                  channel={channel}
                  settings={settings}
                  serverDefaultLevel={currentLevel}
                  onUpdate={(channelSettings) => onUpdateChannel(channel.id, channelSettings)}
                />
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Individual channel override settings
 */
function ChannelOverride({
  channel,
  settings,
  serverDefaultLevel,
  onUpdate
}: {
  channel: Channel;
  settings: NotificationSettingsData;
  serverDefaultLevel: NotificationLevel;
  onUpdate: (settings: ChannelNotificationSettings) => void;
}) {
  const channelSettings = settings.channels[channel.id];
  const currentLevel = channelSettings?.level;
  const channelMuted = isMuted(channelSettings?.muteUntil);

  const handleLevelChange = (level: NotificationLevel | "inherit") => {
    onUpdate({
      ...channelSettings,
      level: level === "inherit" ? undefined : level
    });
  };

  const handleMute = (duration: () => Date) => {
    onUpdate({
      ...channelSettings,
      muteUntil: duration()
    });
  };

  const handleUnmute = () => {
    onUpdate({
      ...channelSettings,
      muteUntil: undefined
    });
  };

  const effectiveLevel = currentLevel || serverDefaultLevel;

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-3">
        <Hash className="h-4 w-4 text-muted-foreground" />
        <div>
          <div className="font-medium text-sm">{channel.name}</div>
          <div className="text-xs text-muted-foreground">
            {currentLevel ? `Override: ${currentLevel}` : `Inherits: ${serverDefaultLevel}`}
            {channelMuted && " • Muted"}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Select 
          value={currentLevel || "inherit"} 
          onValueChange={handleLevelChange}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="inherit">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Inherit
              </div>
            </SelectItem>
            {NOTIFICATION_LEVELS.map(({ value, label, icon: Icon }) => (
              <SelectItem key={value} value={value}>
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {channelMuted ? (
          <Button variant="ghost" size="sm" onClick={handleUnmute}>
            <Volume2 className="h-4 w-4" />
          </Button>
        ) : (
          <Select onValueChange={(value) => {
            const duration = MUTE_DURATIONS.find(d => d.label === value);
            if (duration) handleMute(duration.value);
          }}>
            <SelectTrigger className="w-8 h-8 p-0">
              <VolumeX className="h-4 w-4" />
            </SelectTrigger>
            <SelectContent>
              {MUTE_DURATIONS.map((duration) => (
                <SelectItem key={duration.label} value={duration.label}>
                  {duration.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function NotificationForm({ profile, className }: NotificationFormProps) {
  const {
    settings,
    loading: settingsLoading,
    saving,
    updateServerSettings,
    updateChannelSettings,
    toggleGlobalEnabled
  } = useNotificationSettings();

  const {
    servers,
    channelsByServer,
    loading: dataLoading
  } = useServersAndChannels();

  const loading = settingsLoading || dataLoading;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-muted animate-pulse rounded-lg" />
        <div className="h-48 bg-muted animate-pulse rounded-lg" />
        <div className="h-48 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className || ""}`}>
      {/* Global Toggle */}
      <GlobalToggle 
        enabled={settings.globalEnabled} 
        onToggle={toggleGlobalEnabled}
      />

      {/* Server Settings */}
      {servers.map((server) => (
        <ServerSettingsCard
          key={server.id}
          server={server}
          channels={channelsByServer[server.id] || []}
          settings={settings}
          onUpdateServer={(serverSettings) => updateServerSettings(server.id, serverSettings)}
          onUpdateChannel={updateChannelSettings}
        />
      ))}

      {servers.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No servers found</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Join some servers to configure notification settings.
            </p>
          </CardContent>
        </Card>
      )}

      {saving && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-md shadow-lg">
          Saving settings...
        </div>
      )}
    </div>
  );
}

export default NotificationForm;