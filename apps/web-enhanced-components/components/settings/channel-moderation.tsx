"use client";

/**
 * Channel Moderation Settings Page
 * 
 * Manages moderation settings for a specific channel:
 * - Slowmode settings and rate limiting
 * - Auto-moderation rules and filters
 * - Message limits and length restrictions  
 * - Auto-delete settings for certain content
 * - Moderation log and audit trail
 */

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Save, 
  Shield,
  Clock,
  AlertTriangle,
  Trash2,
  Filter,
  MessageSquare,
  Timer,
  Zap,
  Settings,
  Eye,
  Ban,
  Volume2,
  VolumeX,
  Loader2,
  Info
} from "lucide-react";

// UI Components
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, CheckCircle2 } from "lucide-react";

// Matrix Services (these would need to be implemented)
// import { updateRoomModerationSettings } from "@/apps/web/services/matrix-room";

// Types
import type { ChannelSettingsContextData } from "./channel-settings";

// =============================================================================
// Schema & Types
// =============================================================================

const moderationSchema = z.object({
  // Slowmode settings
  slowmodeEnabled: z.boolean(),
  slowmodeSeconds: z.number().min(0).max(21600), // Max 6 hours
  
  // Message limits
  maxMessageLength: z.number().min(1).max(8000),
  maxMessagesPerMinute: z.number().min(1).max(100),
  
  // Auto-moderation
  automodEnabled: z.boolean(),
  filterProfanity: z.boolean(),
  filterSpam: z.boolean(),
  filterLinks: z.boolean(),
  filterInvites: z.boolean(),
  filterMentions: z.boolean(),
  maxMentionsPerMessage: z.number().min(1).max(20),
  
  // Auto-delete settings
  autoDeleteEnabled: z.boolean(),
  autoDeleteMinutes: z.number().min(1).max(10080), // Max 1 week
  
  // Moderation actions
  logModerationActions: z.boolean(),
  requireImageApproval: z.boolean(),
  
  // Custom blocked words
  blockedWords: z.string()
});

type ModerationFormData = z.infer<typeof moderationSchema>;

// Slowmode presets
const SLOWMODE_PRESETS = [
  { label: "Off", value: 0 },
  { label: "5s", value: 5 },
  { label: "10s", value: 10 },
  { label: "15s", value: 15 },
  { label: "30s", value: 30 },
  { label: "1m", value: 60 },
  { label: "2m", value: 120 },
  { label: "5m", value: 300 },
  { label: "10m", value: 600 },
  { label: "15m", value: 900 },
  { label: "30m", value: 1800 },
  { label: "1h", value: 3600 },
  { label: "2h", value: 7200 },
  { label: "6h", value: 21600 }
] as const;

// Auto-delete presets
const AUTO_DELETE_PRESETS = [
  { label: "Off", value: 0 },
  { label: "1 hour", value: 60 },
  { label: "6 hours", value: 360 },
  { label: "12 hours", value: 720 },
  { label: "1 day", value: 1440 },
  { label: "3 days", value: 4320 },
  { label: "1 week", value: 10080 }
] as const;

// =============================================================================
// Component
// =============================================================================

export function ChannelModeration({
  channel,
  currentMember,
  members,
  isLoading: parentLoading,
  error: parentError,
  refreshData
}: ChannelSettingsContextData) {
  
  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"slowmode" | "automod" | "limits" | "audit">("slowmode");
  
  // Current user permissions
  const userPowerLevel = currentMember?.powerLevel || 0;
  const isAdmin = userPowerLevel >= 75;
  const isModerator = userPowerLevel >= 50;
  
  // Form setup with default values (in a real implementation, these would come from Matrix room state)
  const form = useForm<ModerationFormData>({
    resolver: zodResolver(moderationSchema),
    defaultValues: {
      slowmodeEnabled: false,
      slowmodeSeconds: 0,
      maxMessageLength: 2000,
      maxMessagesPerMinute: 10,
      automodEnabled: false,
      filterProfanity: false,
      filterSpam: true,
      filterLinks: false,
      filterInvites: true,
      filterMentions: false,
      maxMentionsPerMessage: 5,
      autoDeleteEnabled: false,
      autoDeleteMinutes: 0,
      logModerationActions: true,
      requireImageApproval: false,
      blockedWords: ""
    }
  });

  // Form submission
  const onSubmit = async (data: ModerationFormData) => {
    if (!channel || !isModerator) return;
    
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    
    try {
      // In a real implementation, this would update Matrix room state events
      // await updateRoomModerationSettings(channel.id, data);
      
      console.log("Updating moderation settings:", data);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Refresh data to reflect changes
      await refreshData();
      
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
      
    } catch (err) {
      console.error("Failed to update moderation settings:", err);
      setSubmitError(err instanceof Error ? err.message : "Failed to update moderation settings");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format slowmode duration for display
  const formatSlowmodeDuration = (seconds: number): string => {
    if (seconds === 0) return "Off";
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  // Format auto-delete duration for display
  const formatAutoDeleteDuration = (minutes: number): string => {
    if (minutes === 0) return "Off";
    if (minutes < 60) return `${minutes} minutes`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)} hours`;
    return `${Math.floor(minutes / 1440)} days`;
  };

  if (!channel || !isModerator) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access moderation settings for this channel.
            Contact a channel administrator if you need access.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-zinc-500" />
        <div>
          <h1 className="text-2xl font-bold">Channel Moderation</h1>
          <p className="text-sm text-zinc-500">
            Configure moderation tools and automation for this channel
          </p>
        </div>
      </div>

      {/* Success/Error Messages */}
      {submitSuccess && (
        <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Moderation settings updated successfully!
          </AlertDescription>
        </Alert>
      )}
      
      {submitError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      {/* Main Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="slowmode">Slowmode</TabsTrigger>
              <TabsTrigger value="automod">Auto-Moderation</TabsTrigger>
              <TabsTrigger value="limits">Message Limits</TabsTrigger>
              <TabsTrigger value="audit">Audit & Logs</TabsTrigger>
            </TabsList>
            
            {/* Slowmode Tab */}
            <TabsContent value="slowmode" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Slowmode Settings
                  </CardTitle>
                  <CardDescription>
                    Control how frequently members can send messages in this channel
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="slowmodeEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Enable Slowmode</FormLabel>
                          <FormDescription>
                            Members must wait before sending another message
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  {form.watch('slowmodeEnabled') && (
                    <FormField
                      control={form.control}
                      name="slowmodeSeconds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Slowmode Duration</FormLabel>
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
                            {SLOWMODE_PRESETS.slice(1).map((preset) => (
                              <Button
                                key={preset.value}
                                type="button"
                                variant={field.value === preset.value ? "default" : "outline"}
                                size="sm"
                                onClick={() => field.onChange(preset.value)}
                                disabled={isSubmitting}
                              >
                                {preset.label}
                              </Button>
                            ))}
                          </div>
                          <FormControl>
                            <div className="space-y-2">
                              <Slider
                                value={[field.value]}
                                onValueChange={([value]) => field.onChange(value)}
                                max={21600}
                                min={0}
                                step={1}
                                disabled={isSubmitting}
                              />
                              <div className="flex justify-between text-sm text-zinc-500">
                                <span>0s</span>
                                <span className="font-medium">
                                  {formatSlowmodeDuration(field.value)}
                                </span>
                                <span>6h</span>
                              </div>
                            </div>
                          </FormControl>
                          <FormDescription>
                            Members can send one message every {formatSlowmodeDuration(field.value)}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Auto-Moderation Tab */}
            <TabsContent value="automod" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Auto-Moderation
                  </CardTitle>
                  <CardDescription>
                    Automatically filter and moderate messages based on content
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="automodEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Enable Auto-Moderation</FormLabel>
                          <FormDescription>
                            Automatically filter messages based on rules below
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  {form.watch('automodEnabled') && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="filterProfanity"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel className="text-sm">Filter Profanity</FormLabel>
                                <FormDescription className="text-xs">
                                  Block messages with inappropriate language
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={isSubmitting}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="filterSpam"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel className="text-sm">Filter Spam</FormLabel>
                                <FormDescription className="text-xs">
                                  Block repetitive or promotional content
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={isSubmitting}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="filterLinks"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel className="text-sm">Filter Links</FormLabel>
                                <FormDescription className="text-xs">
                                  Block messages containing URLs
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={isSubmitting}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="filterInvites"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel className="text-sm">Filter Invites</FormLabel>
                                <FormDescription className="text-xs">
                                  Block server/space invite links
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={isSubmitting}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="filterMentions"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Limit Mentions</FormLabel>
                              <FormDescription>
                                Restrict excessive mentions in messages
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={isSubmitting}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      {form.watch('filterMentions') && (
                        <FormField
                          control={form.control}
                          name="maxMentionsPerMessage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Max Mentions Per Message</FormLabel>
                              <FormControl>
                                <div className="flex items-center gap-4">
                                  <Slider
                                    value={[field.value]}
                                    onValueChange={([value]) => field.onChange(value)}
                                    max={20}
                                    min={1}
                                    step={1}
                                    className="flex-1"
                                    disabled={isSubmitting}
                                  />
                                  <Badge variant="secondary" className="min-w-[3rem]">
                                    {field.value}
                                  </Badge>
                                </div>
                              </FormControl>
                              <FormDescription>
                                Messages with more than {field.value} mentions will be blocked
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      <FormField
                        control={form.control}
                        name="blockedWords"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Custom Blocked Words</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Enter comma-separated words or phrases to block..."
                                className="resize-none"
                                rows={3}
                                disabled={isSubmitting}
                              />
                            </FormControl>
                            <FormDescription>
                              Separate multiple words or phrases with commas. Case-insensitive.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Message Limits Tab */}
            <TabsContent value="limits" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Message Limits
                  </CardTitle>
                  <CardDescription>
                    Set limits on message length and frequency
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="maxMessageLength"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Message Length</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-4">
                            <Slider
                              value={[field.value]}
                              onValueChange={([value]) => field.onChange(value)}
                              max={8000}
                              min={1}
                              step={100}
                              className="flex-1"
                              disabled={isSubmitting}
                            />
                            <div className="min-w-[4rem] text-right">
                              <Badge variant="secondary">{field.value}</Badge>
                            </div>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Messages longer than {field.value} characters will be blocked
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="maxMessagesPerMinute"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Messages Per Minute</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-4">
                            <Slider
                              value={[field.value]}
                              onValueChange={([value]) => field.onChange(value)}
                              max={100}
                              min={1}
                              step={1}
                              className="flex-1"
                              disabled={isSubmitting}
                            />
                            <div className="min-w-[3rem] text-right">
                              <Badge variant="secondary">{field.value}</Badge>
                            </div>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Users sending more than {field.value} messages per minute will be rate limited
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Separator />
                  
                  <FormField
                    control={form.control}
                    name="autoDeleteEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base flex items-center gap-2">
                            <Timer className="h-4 w-4" />
                            Auto-Delete Messages
                          </FormLabel>
                          <FormDescription>
                            Automatically delete messages after a specified time
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  {form.watch('autoDeleteEnabled') && (
                    <FormField
                      control={form.control}
                      name="autoDeleteMinutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Auto-Delete Duration</FormLabel>
                          <div className="grid grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
                            {AUTO_DELETE_PRESETS.slice(1).map((preset) => (
                              <Button
                                key={preset.value}
                                type="button"
                                variant={field.value === preset.value ? "default" : "outline"}
                                size="sm"
                                onClick={() => field.onChange(preset.value)}
                                disabled={isSubmitting}
                              >
                                {preset.label}
                              </Button>
                            ))}
                          </div>
                          <FormControl>
                            <div className="space-y-2">
                              <Slider
                                value={[field.value]}
                                onValueChange={([value]) => field.onChange(value)}
                                max={10080}
                                min={1}
                                step={60}
                                disabled={isSubmitting}
                              />
                              <div className="flex justify-between text-sm text-zinc-500">
                                <span>1 hour</span>
                                <span className="font-medium">
                                  {formatAutoDeleteDuration(field.value)}
                                </span>
                                <span>1 week</span>
                              </div>
                            </div>
                          </FormControl>
                          <FormDescription>
                            Messages will be automatically deleted after {formatAutoDeleteDuration(field.value)}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Audit & Logs Tab */}
            <TabsContent value="audit" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Audit & Logging
                  </CardTitle>
                  <CardDescription>
                    Configure logging and approval settings for channel moderation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="logModerationActions"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Log Moderation Actions</FormLabel>
                          <FormDescription>
                            Keep a record of all moderation actions taken in this channel
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="requireImageApproval"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Require Image Approval</FormLabel>
                          <FormDescription>
                            Images must be approved by a moderator before they appear
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-blue-500" />
                    Moderation Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm space-y-2">
                    <p className="font-medium">Current Moderation Status:</p>
                    <ul className="space-y-1 text-zinc-600 dark:text-zinc-400">
                      <li>• Slowmode: {form.watch('slowmodeEnabled') ? formatSlowmodeDuration(form.watch('slowmodeSeconds')) : 'Off'}</li>
                      <li>• Auto-moderation: {form.watch('automodEnabled') ? 'Enabled' : 'Disabled'}</li>
                      <li>• Message limit: {form.watch('maxMessageLength')} characters</li>
                      <li>• Auto-delete: {form.watch('autoDeleteEnabled') ? formatAutoDeleteDuration(form.watch('autoDeleteMinutes')) : 'Off'}</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          {/* Form Actions */}
          <div className="flex justify-end space-x-2">
            <Button
              type="submit"
              disabled={isSubmitting || !form.formState.isDirty}
              className="min-w-[120px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default ChannelModeration;