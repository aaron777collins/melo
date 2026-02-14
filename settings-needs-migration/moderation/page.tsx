"use client";

/**
 * Server Settings - Moderation Page
 *
 * Comprehensive moderation settings and tools for server administrators.
 * Includes auto-moderation, word filters, and moderation action settings.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Gavel,
  Shield,
  AlertTriangle,
  Ban,
  MessageSquareDashed,
  Clock,
  Filter,
  Plus,
  X,
  Save,
  Info,
  Check,
  AlertCircle,
  Settings2,
  Bell,
  Link2,
  Eye,
  EyeOff,
  Zap,
  Volume2,
  VolumeX,
  UserX
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import { useMatrixClient } from "@/hooks/use-matrix-client";
import { getSpace } from "@/apps/web/services/matrix-space";

// =============================================================================
// Types
// =============================================================================

interface AutoModRule {
  id: string;
  name: string;
  enabled: boolean;
  action: "warn" | "timeout" | "kick" | "ban";
  duration?: number; // timeout duration in minutes
}

interface ModerationSettings {
  // Auto-moderation
  autoModEnabled: boolean;
  antiSpam: AutoModRule;
  antiFlood: AutoModRule;
  antiLinks: AutoModRule;
  antiInvites: AutoModRule;
  
  // Word filters
  wordFilterEnabled: boolean;
  filteredWords: string[];
  wordFilterAction: "delete" | "warn" | "timeout";
  
  // Verification
  verificationLevel: "none" | "low" | "medium" | "high" | "highest";
  
  // Raid protection
  raidProtectionEnabled: boolean;
  raidThreshold: number;
  raidAction: "lockdown" | "verify" | "notify";
  
  // Notifications
  modLogChannel: string | null;
  notifyOnBan: boolean;
  notifyOnKick: boolean;
  notifyOnTimeout: boolean;
  
  // Content settings
  explicitContentFilter: "none" | "noRole" | "all";
  
  // Slow mode
  defaultSlowMode: number;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_SETTINGS: ModerationSettings = {
  autoModEnabled: true,
  antiSpam: {
    id: "anti-spam",
    name: "Anti-Spam",
    enabled: true,
    action: "timeout",
    duration: 5,
  },
  antiFlood: {
    id: "anti-flood",
    name: "Anti-Flood",
    enabled: true,
    action: "warn",
  },
  antiLinks: {
    id: "anti-links",
    name: "Anti-Links",
    enabled: false,
    action: "delete" as any,
  },
  antiInvites: {
    id: "anti-invites",
    name: "Anti-Invites",
    enabled: true,
    action: "warn",
  },
  wordFilterEnabled: true,
  filteredWords: [],
  wordFilterAction: "delete",
  verificationLevel: "medium",
  raidProtectionEnabled: true,
  raidThreshold: 10,
  raidAction: "notify",
  modLogChannel: null,
  notifyOnBan: true,
  notifyOnKick: true,
  notifyOnTimeout: false,
  explicitContentFilter: "noRole",
  defaultSlowMode: 0,
};

const VERIFICATION_LEVELS = [
  {
    value: "none",
    label: "None",
    description: "Unrestricted access",
    icon: Shield,
  },
  {
    value: "low",
    label: "Low",
    description: "Must have verified email",
    icon: Shield,
  },
  {
    value: "medium",
    label: "Medium",
    description: "Must be registered for 5+ minutes",
    icon: Shield,
  },
  {
    value: "high",
    label: "High",
    description: "Must be member of server for 10+ minutes",
    icon: Shield,
  },
  {
    value: "highest",
    label: "Highest",
    description: "Must have verified phone number",
    icon: Shield,
  },
];

const SLOW_MODE_OPTIONS = [
  { value: 0, label: "Off" },
  { value: 5, label: "5 seconds" },
  { value: 10, label: "10 seconds" },
  { value: 15, label: "15 seconds" },
  { value: 30, label: "30 seconds" },
  { value: 60, label: "1 minute" },
  { value: 120, label: "2 minutes" },
  { value: 300, label: "5 minutes" },
  { value: 600, label: "10 minutes" },
  { value: 900, label: "15 minutes" },
  { value: 1800, label: "30 minutes" },
  { value: 3600, label: "1 hour" },
  { value: 7200, label: "2 hours" },
  { value: 21600, label: "6 hours" },
];

// =============================================================================
// Component
// =============================================================================

export default function ServerSettingsModerationPage() {
  const params = useParams();
  const { client, isReady } = useMatrixClient();
  
  const serverId = params?.serverId as string;
  
  // State
  const [settings, setSettings] = useState<ModerationSettings>(DEFAULT_SETTINGS);
  const [newWord, setNewWord] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  
  /**
   * Load moderation settings
   */
  const loadSettings = useCallback(async () => {
    if (!isReady || !serverId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real implementation, load from Matrix room state
      // For now, use defaults
      setSettings(DEFAULT_SETTINGS);
    } catch (err) {
      console.error("Failed to load settings:", err);
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  }, [isReady, serverId]);
  
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);
  
  /**
   * Update a setting
   */
  const updateSetting = <K extends keyof ModerationSettings>(
    key: K,
    value: ModerationSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };
  
  /**
   * Update an auto-mod rule
   */
  const updateAutoModRule = (
    ruleKey: keyof Pick<ModerationSettings, "antiSpam" | "antiFlood" | "antiLinks" | "antiInvites">,
    updates: Partial<AutoModRule>
  ) => {
    setSettings((prev) => ({
      ...prev,
      [ruleKey]: { ...prev[ruleKey], ...updates },
    }));
    setHasChanges(true);
  };
  
  /**
   * Add filtered word
   */
  const addFilteredWord = () => {
    if (!newWord.trim()) return;
    
    const word = newWord.trim().toLowerCase();
    if (settings.filteredWords.includes(word)) {
      setNewWord("");
      return;
    }
    
    setSettings((prev) => ({
      ...prev,
      filteredWords: [...prev.filteredWords, word],
    }));
    setNewWord("");
    setHasChanges(true);
  };
  
  /**
   * Remove filtered word
   */
  const removeFilteredWord = (word: string) => {
    setSettings((prev) => ({
      ...prev,
      filteredWords: prev.filteredWords.filter((w) => w !== word),
    }));
    setHasChanges(true);
  };
  
  /**
   * Save settings
   */
  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);
    
    try {
      // In a real implementation, save to Matrix room state
      // await client?.sendStateEvent(serverId, 'com.haos.moderation', settings, '');
      
      // Simulate save
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      setSaveSuccess(true);
      setHasChanges(false);
      
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save settings:", err);
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
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
          <Gavel className="h-7 w-7" />
          Moderation
        </h1>
        <p className="text-zinc-400 mt-1">
          Configure auto-moderation, filters, and moderation tools
        </p>
      </div>
      
      <Separator className="bg-zinc-700" />
      
      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
      
      {saveSuccess && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-lg">
          <Check className="h-5 w-5 text-emerald-500 flex-shrink-0" />
          <p className="text-emerald-400 text-sm">Moderation settings saved!</p>
        </div>
      )}
      
      {/* Auto-Moderation */}
      <Card className="bg-zinc-800/50 border-zinc-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Auto-Moderation
              </CardTitle>
              <CardDescription>
                Automatically detect and take action on rule-breaking content
              </CardDescription>
            </div>
            <Switch
              checked={settings.autoModEnabled}
              onCheckedChange={(checked) => updateSetting("autoModEnabled", checked)}
            />
          </div>
        </CardHeader>
        
        {settings.autoModEnabled && (
          <CardContent className="space-y-4">
            {/* Anti-Spam */}
            <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg">
              <div className="flex items-center gap-3">
                <MessageSquareDashed className="h-5 w-5 text-zinc-400" />
                <div>
                  <h4 className="text-sm font-medium text-white">Anti-Spam</h4>
                  <p className="text-xs text-zinc-500">Block repetitive messages</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Select
                  value={settings.antiSpam.action}
                  onValueChange={(value: AutoModRule["action"]) =>
                    updateAutoModRule("antiSpam", { action: value })
                  }
                  disabled={!settings.antiSpam.enabled}
                >
                  <SelectTrigger className="w-32 bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warn">Warn</SelectItem>
                    <SelectItem value="timeout">Timeout</SelectItem>
                    <SelectItem value="kick">Kick</SelectItem>
                    <SelectItem value="ban">Ban</SelectItem>
                  </SelectContent>
                </Select>
                <Switch
                  checked={settings.antiSpam.enabled}
                  onCheckedChange={(checked) =>
                    updateAutoModRule("antiSpam", { enabled: checked })
                  }
                />
              </div>
            </div>
            
            {/* Anti-Flood */}
            <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-zinc-400" />
                <div>
                  <h4 className="text-sm font-medium text-white">Anti-Flood</h4>
                  <p className="text-xs text-zinc-500">Prevent message flooding</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Select
                  value={settings.antiFlood.action}
                  onValueChange={(value: AutoModRule["action"]) =>
                    updateAutoModRule("antiFlood", { action: value })
                  }
                  disabled={!settings.antiFlood.enabled}
                >
                  <SelectTrigger className="w-32 bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warn">Warn</SelectItem>
                    <SelectItem value="timeout">Timeout</SelectItem>
                    <SelectItem value="kick">Kick</SelectItem>
                    <SelectItem value="ban">Ban</SelectItem>
                  </SelectContent>
                </Select>
                <Switch
                  checked={settings.antiFlood.enabled}
                  onCheckedChange={(checked) =>
                    updateAutoModRule("antiFlood", { enabled: checked })
                  }
                />
              </div>
            </div>
            
            {/* Anti-Links */}
            <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg">
              <div className="flex items-center gap-3">
                <Link2 className="h-5 w-5 text-zinc-400" />
                <div>
                  <h4 className="text-sm font-medium text-white">Anti-Links</h4>
                  <p className="text-xs text-zinc-500">Block external links</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Select
                  value={settings.antiLinks.action}
                  onValueChange={(value: AutoModRule["action"]) =>
                    updateAutoModRule("antiLinks", { action: value })
                  }
                  disabled={!settings.antiLinks.enabled}
                >
                  <SelectTrigger className="w-32 bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warn">Warn</SelectItem>
                    <SelectItem value="timeout">Timeout</SelectItem>
                    <SelectItem value="kick">Kick</SelectItem>
                    <SelectItem value="ban">Ban</SelectItem>
                  </SelectContent>
                </Select>
                <Switch
                  checked={settings.antiLinks.enabled}
                  onCheckedChange={(checked) =>
                    updateAutoModRule("antiLinks", { enabled: checked })
                  }
                />
              </div>
            </div>
            
            {/* Anti-Invites */}
            <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg">
              <div className="flex items-center gap-3">
                <UserX className="h-5 w-5 text-zinc-400" />
                <div>
                  <h4 className="text-sm font-medium text-white">Anti-Invites</h4>
                  <p className="text-xs text-zinc-500">Block server invite links</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Select
                  value={settings.antiInvites.action}
                  onValueChange={(value: AutoModRule["action"]) =>
                    updateAutoModRule("antiInvites", { action: value })
                  }
                  disabled={!settings.antiInvites.enabled}
                >
                  <SelectTrigger className="w-32 bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warn">Warn</SelectItem>
                    <SelectItem value="timeout">Timeout</SelectItem>
                    <SelectItem value="kick">Kick</SelectItem>
                    <SelectItem value="ban">Ban</SelectItem>
                  </SelectContent>
                </Select>
                <Switch
                  checked={settings.antiInvites.enabled}
                  onCheckedChange={(checked) =>
                    updateAutoModRule("antiInvites", { enabled: checked })
                  }
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>
      
      {/* Word Filter */}
      <Card className="bg-zinc-800/50 border-zinc-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Filter className="h-5 w-5 text-purple-500" />
                Word Filter
              </CardTitle>
              <CardDescription>
                Block specific words and phrases
              </CardDescription>
            </div>
            <Switch
              checked={settings.wordFilterEnabled}
              onCheckedChange={(checked) => updateSetting("wordFilterEnabled", checked)}
            />
          </div>
        </CardHeader>
        
        {settings.wordFilterEnabled && (
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Select
                value={settings.wordFilterAction}
                onValueChange={(value: ModerationSettings["wordFilterAction"]) =>
                  updateSetting("wordFilterAction", value)
                }
              >
                <SelectTrigger className="w-40 bg-zinc-900 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="delete">Delete message</SelectItem>
                  <SelectItem value="warn">Warn user</SelectItem>
                  <SelectItem value="timeout">Timeout user</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-zinc-500">when a filtered word is detected</span>
            </div>
            
            <div className="flex gap-2">
              <Input
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                placeholder="Add word or phrase..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addFilteredWord();
                  }
                }}
                className="flex-1 bg-zinc-900 border-zinc-700"
              />
              <Button onClick={addFilteredWord} variant="secondary">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {settings.filteredWords.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {settings.filteredWords.map((word) => (
                  <Badge
                    key={word}
                    variant="secondary"
                    className="bg-zinc-700 text-zinc-200 pr-1"
                  >
                    {word}
                    <button
                      onClick={() => removeFilteredWord(word)}
                      className="ml-2 hover:text-red-400 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No filtered words configured</p>
            )}
          </CardContent>
        )}
      </Card>
      
      {/* Verification Level */}
      <Card className="bg-zinc-800/50 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            Verification Level
          </CardTitle>
          <CardDescription>
            Set requirements for new members to participate
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {VERIFICATION_LEVELS.map((level) => {
            const isSelected = settings.verificationLevel === level.value;
            return (
              <button
                key={level.value}
                onClick={() => updateSetting("verificationLevel", level.value as ModerationSettings["verificationLevel"])}
                className={`w-full flex items-center gap-4 p-4 rounded-lg transition-colors ${
                  isSelected
                    ? "bg-indigo-500/20 border border-indigo-500"
                    : "bg-zinc-900 hover:bg-zinc-800"
                }`}
              >
                <div
                  className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? "border-indigo-500" : "border-zinc-600"
                  }`}
                >
                  {isSelected && <div className="h-2 w-2 rounded-full bg-indigo-500" />}
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-medium text-white">{level.label}</h4>
                  <p className="text-xs text-zinc-500">{level.description}</p>
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>
      
      {/* Raid Protection */}
      <Card className="bg-zinc-800/50 border-zinc-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Raid Protection
              </CardTitle>
              <CardDescription>
                Automatically detect and respond to raids
              </CardDescription>
            </div>
            <Switch
              checked={settings.raidProtectionEnabled}
              onCheckedChange={(checked) => updateSetting("raidProtectionEnabled", checked)}
            />
          </div>
        </CardHeader>
        
        {settings.raidProtectionEnabled && (
          <CardContent className="space-y-6">
            <div>
              <Label className="text-xs font-bold uppercase text-zinc-400">
                Join Threshold
              </Label>
              <p className="text-xs text-zinc-500 mb-3">
                Trigger raid protection when {settings.raidThreshold} members join within 10 seconds
              </p>
              <Slider
                value={[settings.raidThreshold]}
                onValueChange={([value]) => updateSetting("raidThreshold", value)}
                min={5}
                max={30}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-zinc-500 mt-1">
                <span>5</span>
                <span>{settings.raidThreshold}</span>
                <span>30</span>
              </div>
            </div>
            
            <div>
              <Label className="text-xs font-bold uppercase text-zinc-400">
                Action on Raid Detection
              </Label>
              <Select
                value={settings.raidAction}
                onValueChange={(value: ModerationSettings["raidAction"]) =>
                  updateSetting("raidAction", value)
                }
              >
                <SelectTrigger className="mt-2 bg-zinc-900 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="notify">Notify moderators only</SelectItem>
                  <SelectItem value="verify">Enable strict verification</SelectItem>
                  <SelectItem value="lockdown">Full lockdown (disable joins)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        )}
      </Card>
      
      {/* Default Slow Mode */}
      <Card className="bg-zinc-800/50 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            Default Slow Mode
          </CardTitle>
          <CardDescription>
            Set default cooldown between messages for new channels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={String(settings.defaultSlowMode)}
            onValueChange={(value) => updateSetting("defaultSlowMode", parseInt(value))}
          >
            <SelectTrigger className="w-48 bg-zinc-900 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SLOW_MODE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      
      {/* Mod Log Notifications */}
      <Card className="bg-zinc-800/50 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Bell className="h-5 w-5 text-green-500" />
            Moderation Log
          </CardTitle>
          <CardDescription>
            Configure moderation action notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg">
            <div className="flex items-center gap-3">
              <Ban className="h-4 w-4 text-red-400" />
              <span className="text-sm text-white">Log ban actions</span>
            </div>
            <Switch
              checked={settings.notifyOnBan}
              onCheckedChange={(checked) => updateSetting("notifyOnBan", checked)}
            />
          </div>
          
          <div className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg">
            <div className="flex items-center gap-3">
              <UserX className="h-4 w-4 text-amber-400" />
              <span className="text-sm text-white">Log kick actions</span>
            </div>
            <Switch
              checked={settings.notifyOnKick}
              onCheckedChange={(checked) => updateSetting("notifyOnKick", checked)}
            />
          </div>
          
          <div className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg">
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-white">Log timeout actions</span>
            </div>
            <Switch
              checked={settings.notifyOnTimeout}
              onCheckedChange={(checked) => updateSetting("notifyOnTimeout", checked)}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Save Button */}
      <div className="flex items-center justify-between pt-4 sticky bottom-0 bg-[#313338] py-4 -mx-10 px-10 border-t border-zinc-700">
        <p className="text-zinc-500 text-sm">
          {hasChanges ? "You have unsaved changes" : "No changes to save"}
        </p>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            disabled={!hasChanges || isSaving}
            onClick={() => {
              setSettings(DEFAULT_SETTINGS);
              setHasChanges(false);
            }}
            className="text-zinc-400 hover:text-white"
          >
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
