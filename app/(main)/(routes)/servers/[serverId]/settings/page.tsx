"use client";

/**
 * Server Settings - Overview Page
 *
 * Main overview page for server settings.
 * Allows editing server name, avatar, description, and other basic settings.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Settings,
  Upload,
  Trash2,
  Check,
  AlertCircle,
  Globe,
  Lock,
  Users,
  Shield
} from "lucide-react";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import FileUpload from "@/apps/web/components/file-upload";
import { useMatrixClient } from "@/hooks/use-matrix-client";
import { getSpace, updateSpace, type MatrixSpace, type SpaceJoinRule } from "@/apps/web/services/matrix-space";
import { getMembers } from "@/apps/web/services/matrix-member";
import { getSpaceInitials } from "@/lib/matrix/types/space";

// =============================================================================
// Types & Schemas
// =============================================================================

const overviewSchema = z.object({
  name: z
    .string()
    .min(1, "Server name is required")
    .max(100, "Server name must be 100 characters or less"),
  description: z
    .string()
    .max(1024, "Description must be 1024 characters or less")
    .optional()
    .or(z.literal("")),
  avatarUrl: z.string().optional().or(z.literal("")),
  joinRule: z.enum(["public", "invite", "knock", "restricted"] as const),
});

type OverviewFormValues = z.infer<typeof overviewSchema>;

// =============================================================================
// Component
// =============================================================================

export default function ServerSettingsOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const { client, isReady } = useMatrixClient();
  
  const serverId = params?.serverId as string;
  
  // State
  const [space, setSpace] = useState<MatrixSpace | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form
  const form = useForm<OverviewFormValues>({
    resolver: zodResolver(overviewSchema),
    defaultValues: {
      name: "",
      description: "",
      avatarUrl: "",
      joinRule: "invite",
    },
  });
  
  /**
   * Load space data
   */
  const loadData = useCallback(async () => {
    if (!isReady || !client || !serverId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const [spaceData, membersData] = await Promise.all([
        getSpace(serverId),
        getMembers(serverId),
      ]);
      
      setSpace(spaceData);
      setMemberCount(membersData.length);
      
      // Update form with loaded data
      form.reset({
        name: spaceData.name || "",
        description: spaceData.topic || "",
        avatarUrl: spaceData.avatarUrl || "",
        joinRule: spaceData.joinRule || "invite",
      });
    } catch (err) {
      console.error("Failed to load space data:", err);
      setError(err instanceof Error ? err.message : "Failed to load server data");
    } finally {
      setIsLoading(false);
    }
  }, [client, isReady, serverId, form]);
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  /**
   * Handle form submission
   */
  const onSubmit = async (values: OverviewFormValues) => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);
    
    try {
      await updateSpace(serverId, {
        name: values.name,
        topic: values.description || undefined,
        avatar: values.avatarUrl || undefined,
      });
      
      // Update join rule if changed
      if (client && values.joinRule !== space?.joinRule) {
        await client.sendStateEvent(serverId, 'm.room.join_rules' as any, {
          join_rule: values.joinRule,
        }, '');
      }
      
      setSaveSuccess(true);
      
      // Reload data
      await loadData();
      
      // Clear success after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save settings:", err);
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };
  
  /**
   * Handle avatar upload
   */
  const handleAvatarUpload = (mxcUrl: string) => {
    form.setValue("avatarUrl", mxcUrl, { shouldDirty: true });
  };
  
  /**
   * Remove avatar
   */
  const handleRemoveAvatar = () => {
    form.setValue("avatarUrl", "", { shouldDirty: true });
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-zinc-700 rounded animate-pulse" />
          <div className="h-8 w-48 bg-zinc-700 rounded animate-pulse" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-zinc-800 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Settings className="h-7 w-7" />
          Server Overview
        </h1>
        <p className="text-zinc-400 mt-1">
          Manage your server&apos;s basic information and settings
        </p>
      </div>
      
      <Separator className="bg-zinc-700" />
      
      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
      
      {/* Success Alert */}
      {saveSuccess && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-lg">
          <Check className="h-5 w-5 text-emerald-500 flex-shrink-0" />
          <p className="text-emerald-400 text-sm">Settings saved successfully!</p>
        </div>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Server Identity */}
          <Card className="bg-zinc-800/50 border-zinc-700">
            <CardHeader>
              <CardTitle className="text-white">Server Identity</CardTitle>
              <CardDescription>
                Customize how your server appears to members
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Upload */}
              <div className="flex items-start gap-6">
                <div className="relative group">
                  <Avatar className="h-24 w-24 rounded-2xl">
                    {form.watch("avatarUrl") ? (
                      <AvatarImage
                        src={form.watch("avatarUrl")}
                        alt={form.watch("name")}
                        className="object-cover"
                      />
                    ) : null}
                    <AvatarFallback className="rounded-2xl bg-indigo-500 text-white text-2xl font-bold">
                      {getSpaceInitials(form.watch("name") || "S")}
                    </AvatarFallback>
                  </Avatar>
                  
                  {form.watch("avatarUrl") && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3 text-white" />
                    </button>
                  )}
                </div>
                
                <div className="flex-1 space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-white mb-1">
                      Server Icon
                    </h4>
                    <p className="text-xs text-zinc-400">
                      We recommend an image of at least 512x512 for the server.
                    </p>
                  </div>
                  <FileUpload
                    onUploadComplete={handleAvatarUpload}
                    accept={["image/*"]}
                    maxSize={8 * 1024 * 1024}
                    showPreview={false}
                  />
                </div>
              </div>
              
              <Separator className="bg-zinc-700" />
              
              {/* Server Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase text-zinc-400">
                      Server Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={isSaving}
                        placeholder="My Awesome Server"
                        className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
                      />
                    </FormControl>
                    <FormDescription className="text-zinc-500 text-xs">
                      This is the name members will see in their server list.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Server Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase text-zinc-400">
                      Server Description
                    </FormLabel>
                    <FormControl>
                      <textarea
                        {...field}
                        disabled={isSaving}
                        placeholder="Tell members about your server..."
                        rows={4}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                      />
                    </FormControl>
                    <FormDescription className="text-zinc-500 text-xs">
                      A brief description of what your server is about.
                      {field.value && (
                        <span className="ml-2">
                          {field.value.length}/1024 characters
                        </span>
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          {/* Access Settings */}
          <Card className="bg-zinc-800/50 border-zinc-700">
            <CardHeader>
              <CardTitle className="text-white">Access Settings</CardTitle>
              <CardDescription>
                Control who can join your server
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Join Rules */}
              <FormField
                control={form.control}
                name="joinRule"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase text-zinc-400">
                      Join Rule
                    </FormLabel>
                    <Select
                      disabled={isSaving}
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                          <SelectValue placeholder="Select join rule" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="invite">
                          <div className="flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            Invite Only
                          </div>
                        </SelectItem>
                        <SelectItem value="public">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            Public
                          </div>
                        </SelectItem>
                        <SelectItem value="knock">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Request to Join
                          </div>
                        </SelectItem>
                        <SelectItem value="restricted">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Restricted
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-zinc-500 text-xs">
                      {field.value === "invite" && "Only users with an invite link can join."}
                      {field.value === "public" && "Anyone can find and join this server."}
                      {field.value === "knock" && "Users can request to join, pending approval."}
                      {field.value === "restricted" && "Only users from specific servers can join."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          {/* Server Stats */}
          <Card className="bg-zinc-800/50 border-zinc-700">
            <CardHeader>
              <CardTitle className="text-white">Server Statistics</CardTitle>
              <CardDescription>
                Overview of your server&apos;s current state
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-900 rounded-lg p-4">
                  <div className="text-2xl font-bold text-white">{memberCount}</div>
                  <div className="text-xs text-zinc-400">Members</div>
                </div>
                <div className="bg-zinc-900 rounded-lg p-4">
                  <div className="text-2xl font-bold text-white">
                    {space?.childRoomIds.length || 0}
                  </div>
                  <div className="text-xs text-zinc-400">Channels</div>
                </div>
                <div className="bg-zinc-900 rounded-lg p-4">
                  <div className="text-2xl font-bold text-white">
                    <Badge
                      variant="secondary"
                      className={
                        space?.joinRule === "public"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-zinc-600 text-zinc-300"
                      }
                    >
                      {space?.joinRule || "invite"}
                    </Badge>
                  </div>
                  <div className="text-xs text-zinc-400">Join Rule</div>
                </div>
                <div className="bg-zinc-900 rounded-lg p-4">
                  <div className="text-2xl font-bold text-white">
                    {space?.currentUserPowerLevel || 0}
                  </div>
                  <div className="text-xs text-zinc-400">Your Power Level</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Save Button */}
          <div className="flex items-center justify-between pt-4">
            <p className="text-zinc-500 text-sm">
              {form.formState.isDirty
                ? "You have unsaved changes"
                : "No changes to save"}
            </p>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                disabled={!form.formState.isDirty || isSaving}
                onClick={() => form.reset()}
                className="text-zinc-400 hover:text-white"
              >
                Reset
              </Button>
              <Button
                type="submit"
                disabled={!form.formState.isDirty || isSaving}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
