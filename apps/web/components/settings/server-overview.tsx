"use client";

/**
 * Server Overview Settings Page
 * 
 * Allows server administrators to edit basic server information:
 * - Server name and description
 * - Server avatar/icon  
 * - Basic server statistics
 * 
 * Extracted from server-settings-modal.tsx overview tab functionality.
 */

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save, Upload, Users, Calendar, Crown, Loader2 } from "lucide-react";

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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";

// Custom Components
import FileUpload from "@/apps/web/components/file-upload";

// Matrix Services  
import { updateSpace } from "@/apps/web/services/matrix-space";

// Types
import type { ServerSettingsContextData } from "./server-settings";
import type { MxcUrl } from "@/lib/matrix/types/media";

// =============================================================================
// Schema & Types
// =============================================================================

const overviewSchema = z.object({
  name: z.string()
    .min(1, "Server name is required")
    .max(100, "Name must be 100 characters or less")
    .regex(/^[^#]*$/, "Server name cannot contain # character"),
  description: z.string()
    .max(1024, "Description must be 1024 characters or less")
    .optional(),
  avatarUrl: z.string().optional()
});

type OverviewFormData = z.infer<typeof overviewSchema>;

// =============================================================================
// Component
// =============================================================================

export function ServerOverview({
  space,
  currentMember,
  members,
  isLoading: parentLoading,
  error: parentError,
  refreshData
}: ServerSettingsContextData) {
  const router = useRouter();
  
  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  // Form setup
  const form = useForm<OverviewFormData>({
    resolver: zodResolver(overviewSchema),
    defaultValues: {
      name: space?.name || "",
      description: space?.topic || "",
      avatarUrl: space?.avatarUrl || ""
    }
  });
  
  // Reset form when space changes
  React.useEffect(() => {
    if (space) {
      form.reset({
        name: space.name || "",
        description: space.topic || "",
        avatarUrl: space.avatarUrl || ""
      });
    }
  }, [space, form]);
  
  // Clear success message after 3 seconds
  React.useEffect(() => {
    if (submitSuccess) {
      const timeout = setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [submitSuccess]);
  
  // Handle form submission
  const onSubmit = async (values: OverviewFormData) => {
    if (!space) return;
    
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    
    try {
      await updateSpace(space.id, {
        name: values.name,
        topic: values.description,
        avatar: values.avatarUrl
      });
      
      setSubmitSuccess(true);
      await refreshData(); // Refresh data to show updated info
      
    } catch (err) {
      console.error("Failed to update server:", err);
      setSubmitError(err instanceof Error ? err.message : "Failed to update server");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle avatar upload
  const handleAvatarUpload = (mxcUrl: string) => {
    form.setValue("avatarUrl", mxcUrl, { shouldDirty: true });
    setSubmitError(null);
  };
  
  // Calculate server stats
  const serverStats = React.useMemo(() => {
    if (!space || !members) return null;
    
    const onlineMembers = members.filter(m => m.isOnline).length;
    const ownerCount = members.filter(m => m.role === "owner").length;
    const adminCount = members.filter(m => m.role === "admin").length;
    
    return {
      totalMembers: members.length,
      onlineMembers,
      ownerCount,
      adminCount,
      createdAt: space.createdAt
    };
  }, [space, members]);
  
  if (!space) {
    return null;
  }
  
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Server Overview</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Manage your server's basic information and settings
        </p>
      </div>
      
      {/* Error Alert */}
      {(parentError || submitError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {parentError || submitError}
          </AlertDescription>
        </Alert>
      )}
      
      {/* Success Alert */}
      {submitSuccess && (
        <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Server settings updated successfully!
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Server Information Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Server Information</CardTitle>
              <CardDescription>
                Update your server's name, description, and avatar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Avatar Upload Section */}
                  <div>
                    <label className="text-sm font-medium">Server Avatar</label>
                    <div className="flex items-start space-x-4 mt-2">
                      <Avatar className="h-20 w-20 rounded-2xl">
                        <AvatarImage 
                          src={form.watch("avatarUrl") || space.avatarUrl || undefined} 
                          alt={space.name}
                        />
                        <AvatarFallback className="rounded-2xl text-xl bg-indigo-500 text-white">
                          {space.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <FileUpload
                          onUploadComplete={handleAvatarUpload}
                          accept={["image/*"]}
                          maxSize={8 * 1024 * 1024} // 8MB
                          showPreview={false}
                          className="w-full"
                        >
                          <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-4 text-center hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors cursor-pointer">
                            <Upload className="h-6 w-6 mx-auto mb-2 text-zinc-400" />
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                              Click to upload or drag and drop
                            </p>
                            <p className="text-xs text-zinc-500 mt-1">
                              Recommended: 512x512px, max 8MB
                            </p>
                          </div>
                        </FileUpload>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Server Name */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Server Name
                        </FormLabel>
                        <FormControl>
                          <Input
                            disabled={isSubmitting}
                            placeholder="Enter server name"
                            className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          This is how your server will appear to members.
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
                        <FormLabel className="text-sm font-medium">
                          Server Description
                        </FormLabel>
                        <FormControl>
                          <textarea
                            disabled={isSubmitting}
                            placeholder="Tell people what your server is about (optional)"
                            className="w-full min-h-[100px] p-3 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Help others understand what your server is about.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Submit Button */}
                  <div className="flex justify-end pt-4">
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
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
        
        {/* Server Statistics Sidebar */}
        <div className="space-y-6">
          {/* Server Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Server Statistics</CardTitle>
              <CardDescription>
                Overview of your server's current state
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {serverStats ? (
                <>
                  {/* Member Count */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-zinc-500" />
                      <span className="text-sm">Total Members</span>
                    </div>
                    <Badge variant="secondary">
                      {serverStats.totalMembers}
                    </Badge>
                  </div>
                  
                  {/* Online Members */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-green-500 rounded-full" />
                      <span className="text-sm">Online Now</span>
                    </div>
                    <Badge variant="secondary">
                      {serverStats.onlineMembers}
                    </Badge>
                  </div>
                  
                  {/* Owner Count */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">Owners</span>
                    </div>
                    <Badge variant="secondary">
                      {serverStats.ownerCount}
                    </Badge>
                  </div>
                  
                  {/* Admin Count */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-orange-500 rounded-full" />
                      <span className="text-sm">Admins</span>
                    </div>
                    <Badge variant="secondary">
                      {serverStats.adminCount}
                    </Badge>
                  </div>
                  
                  {serverStats.createdAt && (
                    <>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-zinc-500" />
                          <span className="text-sm">Created</span>
                        </div>
                        <span className="text-sm text-zinc-500">
                          {new Date(serverStats.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-zinc-400" />
                  <p className="text-sm text-zinc-500 mt-2">Loading stats...</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Server ID Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Server Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Server ID
                </label>
                <p className="text-sm font-mono bg-zinc-100 dark:bg-zinc-800 p-2 rounded mt-1 break-all">
                  {space.id}
                </p>
              </div>
              
              {space.topic && (
                <div>
                  <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Current Description
                  </label>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-1">
                    {space.topic}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default ServerOverview;