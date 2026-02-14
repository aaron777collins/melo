"use client";

/**
 * Server Settings - Integrations Page
 *
 * Manage external integrations, webhooks, bots, and bridges.
 * Includes Matrix bridges for Discord, Slack, IRC, etc.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Plug2,
  Webhook,
  Bot,
  Plus,
  Settings,
  Trash2,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Shield,
  Zap,
  Link2,
  Globe,
  MessageSquare,
  Hash,
  Activity,
  Eye,
  EyeOff,
  ChevronRight
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMatrixClient } from "@/hooks/use-matrix-client";

// =============================================================================
// Types
// =============================================================================

interface Integration {
  id: string;
  name: string;
  type: "bridge" | "bot" | "webhook" | "app";
  description: string;
  icon: string;
  status: "active" | "inactive" | "error";
  connectedAt?: string;
  config?: Record<string, unknown>;
}

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  channel: string;
  channelName: string;
  avatar?: string;
  createdAt: string;
  lastUsed?: string;
  messageCount: number;
}

interface BridgeConfig {
  id: string;
  type: "discord" | "slack" | "irc" | "telegram" | "signal";
  name: string;
  status: "connected" | "disconnected" | "error";
  linkedRoom?: string;
  linkedChannel?: string;
  messageCount: number;
  lastSync?: string;
}

interface BotConfig {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  permissions: string[];
  addedAt: string;
  status: "active" | "inactive";
}

// =============================================================================
// Constants
// =============================================================================

const AVAILABLE_BRIDGES = [
  {
    id: "discord",
    name: "Discord",
    description: "Bridge messages between Matrix and Discord servers",
    icon: "🎮",
    color: "#5865F2",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Connect Slack workspaces to your Matrix rooms",
    icon: "💬",
    color: "#4A154B",
  },
  {
    id: "telegram",
    name: "Telegram",
    description: "Bridge Telegram groups and channels",
    icon: "📱",
    color: "#0088cc",
  },
  {
    id: "irc",
    name: "IRC",
    description: "Connect to IRC networks and channels",
    icon: "#️⃣",
    color: "#2ECC71",
  },
  {
    id: "signal",
    name: "Signal",
    description: "Bridge Signal groups (experimental)",
    icon: "🔒",
    color: "#3A76F0",
    experimental: true,
  },
];

const AVAILABLE_BOTS = [
  {
    id: "moderation-bot",
    name: "ModBot",
    description: "Automated moderation and anti-spam",
    avatar: "🤖",
    category: "moderation",
  },
  {
    id: "music-bot",
    name: "MusicBot",
    description: "Play music from various sources",
    avatar: "🎵",
    category: "entertainment",
  },
  {
    id: "poll-bot",
    name: "PollBot",
    description: "Create and manage polls",
    avatar: "📊",
    category: "utility",
  },
  {
    id: "reminder-bot",
    name: "ReminderBot",
    description: "Set reminders and scheduled messages",
    avatar: "⏰",
    category: "utility",
  },
];

// =============================================================================
// Component
// =============================================================================

export default function ServerSettingsIntegrationsPage() {
  const params = useParams();
  const { client, isReady } = useMatrixClient();
  
  const serverId = params?.serverId as string;
  
  // State
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [bridges, setBridges] = useState<BridgeConfig[]>([]);
  const [bots, setBots] = useState<BotConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Dialog states
  const [showWebhookDialog, setShowWebhookDialog] = useState(false);
  const [showBridgeDialog, setShowBridgeDialog] = useState(false);
  const [showBotDialog, setShowBotDialog] = useState(false);
  
  // New webhook form
  const [newWebhook, setNewWebhook] = useState({
    name: "",
    channel: "",
    avatar: "",
  });
  
  /**
   * Load integrations data
   */
  const loadData = useCallback(async () => {
    if (!isReady || !serverId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real implementation, load from Matrix room state or custom backend
      // For now, use empty state
      setWebhooks([]);
      setBridges([]);
      setBots([]);
    } catch (err) {
      console.error("Failed to load integrations:", err);
      setError(err instanceof Error ? err.message : "Failed to load integrations");
    } finally {
      setIsLoading(false);
    }
  }, [isReady, serverId]);
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  /**
   * Copy webhook URL to clipboard
   */
  const handleCopyWebhookUrl = async (webhook: WebhookConfig) => {
    try {
      await navigator.clipboard.writeText(webhook.url);
      setCopiedId(webhook.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };
  
  /**
   * Create new webhook
   */
  const handleCreateWebhook = async () => {
    if (!newWebhook.name.trim() || !newWebhook.channel) return;
    
    try {
      const webhook: WebhookConfig = {
        id: `webhook-${Date.now()}`,
        name: newWebhook.name.trim(),
        url: `https://matrix.example.com/webhooks/${Date.now()}/${Math.random().toString(36).slice(2)}`,
        channel: newWebhook.channel,
        channelName: "general", // Would be resolved from channel ID
        avatar: newWebhook.avatar || undefined,
        createdAt: new Date().toISOString(),
        messageCount: 0,
      };
      
      setWebhooks((prev) => [...prev, webhook]);
      setNewWebhook({ name: "", channel: "", avatar: "" });
      setShowWebhookDialog(false);
    } catch (err) {
      console.error("Failed to create webhook:", err);
      setError("Failed to create webhook");
    }
  };
  
  /**
   * Delete webhook
   */
  const handleDeleteWebhook = async (webhookId: string) => {
    setWebhooks((prev) => prev.filter((w) => w.id !== webhookId));
  };
  
  /**
   * Connect bridge
   */
  const handleConnectBridge = async (bridgeType: string) => {
    try {
      const bridge: BridgeConfig = {
        id: `bridge-${bridgeType}-${Date.now()}`,
        type: bridgeType as BridgeConfig["type"],
        name: AVAILABLE_BRIDGES.find((b) => b.id === bridgeType)?.name || bridgeType,
        status: "connected",
        messageCount: 0,
        lastSync: new Date().toISOString(),
      };
      
      setBridges((prev) => [...prev, bridge]);
      setShowBridgeDialog(false);
    } catch (err) {
      console.error("Failed to connect bridge:", err);
      setError("Failed to connect bridge");
    }
  };
  
  /**
   * Disconnect bridge
   */
  const handleDisconnectBridge = async (bridgeId: string) => {
    setBridges((prev) => prev.filter((b) => b.id !== bridgeId));
  };
  
  /**
   * Add bot
   */
  const handleAddBot = async (botId: string) => {
    try {
      const availableBot = AVAILABLE_BOTS.find((b) => b.id === botId);
      if (!availableBot) return;
      
      const bot: BotConfig = {
        id: `bot-${botId}-${Date.now()}`,
        name: availableBot.name,
        description: availableBot.description,
        avatar: availableBot.avatar,
        permissions: ["send_messages", "read_messages"],
        addedAt: new Date().toISOString(),
        status: "active",
      };
      
      setBots((prev) => [...prev, bot]);
      setShowBotDialog(false);
    } catch (err) {
      console.error("Failed to add bot:", err);
      setError("Failed to add bot");
    }
  };
  
  /**
   * Remove bot
   */
  const handleRemoveBot = async (botId: string) => {
    setBots((prev) => prev.filter((b) => b.id !== botId));
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-zinc-700 rounded animate-pulse" />
          <div className="h-8 w-48 bg-zinc-700 rounded animate-pulse" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 bg-zinc-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Plug2 className="h-7 w-7" />
          Integrations
        </h1>
        <p className="text-zinc-400 mt-1">
          Connect external services, bots, and bridges to your server
        </p>
      </div>
      
      <Separator className="bg-zinc-700" />
      
      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="ml-auto"
          >
            Dismiss
          </Button>
        </div>
      )}
      
      {/* Webhooks Section */}
      <Card className="bg-zinc-800/50 border-zinc-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Webhook className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <CardTitle className="text-white">Webhooks</CardTitle>
                <CardDescription>
                  Send automated messages from external services
                </CardDescription>
              </div>
            </div>
            
            <Dialog open={showWebhookDialog} onOpenChange={setShowWebhookDialog}>
              <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Webhook
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-zinc-700">
                <DialogHeader>
                  <DialogTitle className="text-white">Create Webhook</DialogTitle>
                  <DialogDescription>
                    Webhooks allow external services to send messages to your server
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label className="text-zinc-400">Name</Label>
                    <Input
                      value={newWebhook.name}
                      onChange={(e) =>
                        setNewWebhook((prev) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="GitHub Notifications"
                      className="mt-2 bg-zinc-800 border-zinc-700"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-400">Channel</Label>
                    <Select
                      value={newWebhook.channel}
                      onValueChange={(value) =>
                        setNewWebhook((prev) => ({ ...prev, channel: value }))
                      }
                    >
                      <SelectTrigger className="mt-2 bg-zinc-800 border-zinc-700">
                        <SelectValue placeholder="Select a channel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general"># general</SelectItem>
                        <SelectItem value="dev"># dev</SelectItem>
                        <SelectItem value="announcements"># announcements</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-zinc-400">Avatar URL (optional)</Label>
                    <Input
                      value={newWebhook.avatar}
                      onChange={(e) =>
                        setNewWebhook((prev) => ({ ...prev, avatar: e.target.value }))
                      }
                      placeholder="https://example.com/avatar.png"
                      className="mt-2 bg-zinc-800 border-zinc-700"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="ghost"
                    onClick={() => setShowWebhookDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateWebhook}
                    disabled={!newWebhook.name.trim() || !newWebhook.channel}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent>
          {webhooks.length === 0 ? (
            <div className="text-center py-8">
              <Webhook className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-500">No webhooks configured</p>
              <p className="text-zinc-600 text-sm mt-1">
                Create a webhook to receive messages from external services
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {webhooks.map((webhook) => (
                <div
                  key={webhook.id}
                  className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      {webhook.avatar ? (
                        <AvatarImage src={webhook.avatar} />
                      ) : null}
                      <AvatarFallback className="bg-orange-500/20 text-orange-400">
                        <Webhook className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="text-sm font-medium text-white">
                        {webhook.name}
                      </h4>
                      <p className="text-xs text-zinc-500">
                        #{webhook.channelName} • {webhook.messageCount} messages
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyWebhookUrl(webhook)}
                    >
                      {copiedId === webhook.id ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Settings className="h-4 w-4 mr-2" />
                          Edit Webhook
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-400"
                          onClick={() => handleDeleteWebhook(webhook.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Webhook
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Bridges Section */}
      <Card className="bg-zinc-800/50 border-zinc-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Link2 className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-white">Bridges</CardTitle>
                <CardDescription>
                  Connect to other platforms like Discord, Slack, or IRC
                </CardDescription>
              </div>
            </div>
            
            <Dialog open={showBridgeDialog} onOpenChange={setShowBridgeDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-zinc-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Connect Bridge
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-zinc-700 max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-white">Connect a Bridge</DialogTitle>
                  <DialogDescription>
                    Bridges sync messages between Matrix and other platforms
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[400px] pr-4">
                  <div className="space-y-3 py-4">
                    {AVAILABLE_BRIDGES.map((bridge) => (
                      <button
                        key={bridge.id}
                        onClick={() => handleConnectBridge(bridge.id)}
                        className="w-full flex items-center gap-4 p-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-left"
                      >
                        <div
                          className="h-12 w-12 rounded-lg flex items-center justify-center text-2xl"
                          style={{ backgroundColor: `${bridge.color}20` }}
                        >
                          {bridge.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-white">
                              {bridge.name}
                            </h4>
                            {(bridge as any).experimental && (
                              <Badge variant="outline" className="text-xs">
                                Beta
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-zinc-500">
                            {bridge.description}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-zinc-500" />
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent>
          {bridges.length === 0 ? (
            <div className="text-center py-8">
              <Link2 className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-500">No bridges connected</p>
              <p className="text-zinc-600 text-sm mt-1">
                Connect a bridge to sync messages with other platforms
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {bridges.map((bridge) => {
                const bridgeInfo = AVAILABLE_BRIDGES.find(
                  (b) => b.id === bridge.type
                );
                return (
                  <div
                    key={bridge.id}
                    className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 rounded-lg flex items-center justify-center text-xl"
                        style={{
                          backgroundColor: bridgeInfo
                            ? `${bridgeInfo.color}20`
                            : "#3f3f46",
                        }}
                      >
                        {bridgeInfo?.icon || "🔗"}
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-white">
                          {bridge.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge
                            variant={
                              bridge.status === "connected"
                                ? "default"
                                : "destructive"
                            }
                            className="text-xs"
                          >
                            {bridge.status}
                          </Badge>
                          <span className="text-xs text-zinc-500">
                            {bridge.messageCount} messages synced
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Settings className="h-4 w-4 mr-2" />
                            Configure
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Activity className="h-4 w-4 mr-2" />
                            View Logs
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-400"
                            onClick={() => handleDisconnectBridge(bridge.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Disconnect
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Bots Section */}
      <Card className="bg-zinc-800/50 border-zinc-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Bot className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-white">Bots</CardTitle>
                <CardDescription>
                  Add bots for moderation, music, polls, and more
                </CardDescription>
              </div>
            </div>
            
            <Dialog open={showBotDialog} onOpenChange={setShowBotDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-zinc-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Bot
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-zinc-700 max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-white">Add a Bot</DialogTitle>
                  <DialogDescription>
                    Bots add automated functionality to your server
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[400px] pr-4">
                  <div className="space-y-3 py-4">
                    {AVAILABLE_BOTS.map((bot) => (
                      <button
                        key={bot.id}
                        onClick={() => handleAddBot(bot.id)}
                        disabled={bots.some((b) => b.name === bot.name)}
                        className="w-full flex items-center gap-4 p-4 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-left"
                      >
                        <div className="h-12 w-12 rounded-full bg-zinc-700 flex items-center justify-center text-2xl">
                          {bot.avatar}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-white">{bot.name}</h4>
                          <p className="text-sm text-zinc-500">
                            {bot.description}
                          </p>
                        </div>
                        {bots.some((b) => b.name === bot.name) ? (
                          <Badge variant="secondary">Added</Badge>
                        ) : (
                          <ChevronRight className="h-5 w-5 text-zinc-500" />
                        )}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent>
          {bots.length === 0 ? (
            <div className="text-center py-8">
              <Bot className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-500">No bots added</p>
              <p className="text-zinc-600 text-sm mt-1">
                Add bots to enhance your server with automation
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {bots.map((bot) => (
                <div
                  key={bot.id}
                  className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-zinc-700 text-xl">
                        {bot.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="text-sm font-medium text-white">
                        {bot.name}
                      </h4>
                      <p className="text-xs text-zinc-500">{bot.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={bot.status === "active" ? "default" : "secondary"}
                    >
                      {bot.status}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Settings className="h-4 w-4 mr-2" />
                          Configure
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Shield className="h-4 w-4 mr-2" />
                          Permissions
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-400"
                          onClick={() => handleRemoveBot(bot.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove Bot
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* API Access Info */}
      <Card className="bg-indigo-500/10 border-indigo-500/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-indigo-400 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-indigo-300">
                Matrix Integration API
              </h4>
              <p className="text-xs text-indigo-400/80 mt-1">
                Your server uses the Matrix protocol for federation and integration.
                All integrations communicate via Matrix events and the Application
                Service API for seamless interoperability.
              </p>
              <Button
                variant="link"
                size="sm"
                className="text-indigo-400 p-0 h-auto mt-2"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Learn more about Matrix integrations
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
