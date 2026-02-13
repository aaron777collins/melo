"use client";

/**
 * Channel Overview Settings Page
 * 
 * Allows channel administrators to edit basic channel information:
 * - Channel name, topic, and description
 * - Channel type (text/voice/video/announcement)
 * - Basic channel statistics
 * - Channel visibility settings
 */

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save, Hash, Mic, Video, Megaphone, Users, Calendar, Lock, Globe, Loader2 } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, CheckCircle2 } from "lucide-react";

// Matrix Services
import { updateRoom, type RoomChannelType } from "@/apps/web/services/matrix-room";

// Types
import type { ChannelSettingsContextData } from "./channel-settings";

// =============================================================================
// Schema & Types
// =============================================================================

const overviewSchema = z.object({
  name: z.string()
    .min(1, "Channel name is required")
    .max(100, "Name must be 100 characters or less")
    .regex(/^[a-z0-9-_]+$/, "Channel name must contain only lowercase letters, numbers, hyphens, and underscores"),
  topic: z.string()
    .max(1024, "Topic must be 1024 characters or less")
    .optional(),
  type: z.enum(['text', 'voice', 'audio', 'video', 'announcement'] as const),
  isPrivate: z.boolean()
});

type OverviewFormData = z.infer<typeof overviewSchema>;

// Channel type configuration
const CHANNEL_TYPES = [
  {
    value: 'text' as const,
    label: 'Text',
    icon: Hash,
    description: 'Send messages, images, GIFs, emoji, opinions, and puns'
  },
  {
    value: 'voice' as const,
    label: 'Voice',
    icon: Mic,
    description: 'Hang out together with voice chat'
  },
  {
    value: 'video' as const,
    label: 'Video',
    icon: Video,
    description: 'Video chat with your community'
  },
  {
    value: 'announcement' as const,
    label: 'Announcement',
    icon: Megaphone,
    description: 'Important updates for everyone (admin only posting)'
  }
] as const;

// =============================================================================
// Component
// =============================================================================

export function ChannelOverview({
  channel,
  currentMember,
  members,
  isLoading: parentLoading,
  error: parentError,
  refreshData
}: ChannelSettingsContextData) {
  const router = useRouter();
  
  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  // Determine if channel is private (invite-only)
  const isPrivateChannel = channel?.parentSpaceId ? true : false; // Simplified for now
  
  // Form setup
  const form = useForm<OverviewFormData>({
    resolver: zodResolver(overviewSchema),
    defaultValues: {
      name: channel?.name?.replace(/^#/, '') || "",
      topic: channel?.topic || "",
      type: (channel?.type as RoomChannelType) || "text",
      isPrivate: isPrivateChannel
    }
  });

  // Reset form when channel changes
  useEffect(() => {
    if (channel) {
      form.reset({
        name: channel.name?.replace(/^#/, '') || "",
        topic: channel.topic || "",
        type: (channel.type as RoomChannelType) || "text",
        isPrivate: isPrivateChannel
      });
      setSubmitError(null);
      setSubmitSuccess(false);
    }
  }, [channel, form, isPrivateChannel]);

  // Form submission
  const onSubmit = async (data: OverviewFormData) => {
    if (!channel) return;
    
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    
    try {
      // Update the room via Matrix service
      await updateRoom(channel.id, {
        name: data.name,
        topic: data.topic || undefined
      });
      
      // Refresh data to reflect changes
      await refreshData();
      
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
      
    } catch (err) {
      console.error("Failed to update channel:", err);
      setSubmitError(err instanceof Error ? err.message : "Failed to update channel");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Don't render if no channel
  if (!channel) return null;
  
  // Get channel type info
  const channelTypeInfo = CHANNEL_TYPES.find(t => t.value === channel.type) || CHANNEL_TYPES[0];
  const ChannelTypeIcon = channelTypeInfo.icon;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ChannelTypeIcon className="h-6 w-6 text-zinc-500" />
        <div>
          <h1 className="text-2xl font-bold">Channel Overview</h1>
          <p className="text-sm text-zinc-500">
            Edit your channel's basic information and settings
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Update your channel's name, topic, and other basic information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Channel Name */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Channel Name</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Hash className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                            <Input
                              {...field}
                              placeholder="general"
                              className="pl-10"
                              disabled={isSubmitting}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Channel names must be lowercase and can only contain letters, numbers, hyphens, and underscores.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Channel Topic */}
                  <FormField
                    control={form.control}
                    name="topic"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Channel Topic</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="What's this channel about?"
                            className="resize-none"
                            rows={3}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormDescription>
                          Let people know what this channel is for. This appears at the top of the channel.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Channel Type */}
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Channel Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a channel type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CHANNEL_TYPES.map((type) => {
                              const Icon = type.icon;
                              return (
                                <SelectItem key={type.value} value={type.value}>
                                  <div className="flex items-center gap-2">
                                    <Icon className="h-4 w-4" />
                                    <span>{type.label}</span>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {form.watch('type') && 
                            CHANNEL_TYPES.find(t => t.value === form.watch('type'))?.description
                          }
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Private Channel Toggle */}
                  <FormField
                    control={form.control}
                    name="isPrivate"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            <div className="flex items-center gap-2">
                              {field.value ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                              Private Channel
                            </div>
                          </FormLabel>
                          <FormDescription>
                            {field.value 
                              ? "Only selected members and roles can view this channel"
                              : "Everyone in the server can view this channel"
                            }
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
                  
                  {/* Form Actions */}
                  <div className="flex justify-end space-x-2">
                    {submitSuccess && (
                      <div className="flex items-center text-green-600 text-sm mr-4">
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Channel updated successfully!
                      </div>
                    )}
                    
                    <Button
                      type="submit"
                      disabled={isSubmitting || !form.formState.isDirty}
                      className="min-w-[100px]"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
                </form>
              </Form>
              
              {submitError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Sidebar - Channel Stats */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Channel Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500">Channel Type</span>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <ChannelTypeIcon className="h-3 w-3" />
                  {channelTypeInfo.label}
                </Badge>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <Users className="h-4 w-4" />
                  Members
                </div>
                <span className="text-sm font-medium">
                  {channel.memberCount || members.length}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <Calendar className="h-4 w-4" />
                  Created
                </div>
                <span className="text-sm font-medium">
                  {new Date(channel.createdAt).toLocaleDateString()}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  {channel.isEncrypted ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                  Encryption
                </div>
                <Badge variant={channel.isEncrypted ? "default" : "secondary"}>
                  {channel.isEncrypted ? "Encrypted" : "Not Encrypted"}
                </Badge>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Channel ID</CardTitle>
              <CardDescription>
                Use this ID to reference this channel via Matrix protocols
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-md">
                <code className="text-sm break-all">{channel.id}</code>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default ChannelOverview;