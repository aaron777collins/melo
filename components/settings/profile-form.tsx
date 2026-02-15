"use client";

/**
 * Profile Form Component
 *
 * Comprehensive profile editing form with Matrix client integration.
 * Handles display name, avatar, status message, and bio editing.
 */

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  User, 
  Upload, 
  Save, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  X,
  Camera
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { useMatrixClient } from "@/hooks/use-matrix-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { type MatrixProfile } from "@/lib/current-profile";

// =============================================================================
// Types & Validation
// =============================================================================

const profileFormSchema = z.object({
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(100, "Display name must be 100 characters or less")
    .trim(),
  statusMessage: z
    .string()
    .max(200, "Status message must be 200 characters or less")
    .optional(),
  bio: z
    .string()
    .max(1000, "Bio must be 1000 characters or less")
    .optional(),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

interface ProfileFormProps {
  profile: MatrixProfile;
  onUpdate?: (updatedProfile: MatrixProfile) => void;
}

interface UpdateState {
  type: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
}

// =============================================================================
// Component
// =============================================================================

export function ProfileForm({ profile, onUpdate }: ProfileFormProps) {
  const { client, isReady } = useMatrixClient();
  const router = useRouter();
  
  // Form state
  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: profile.name || "",
      statusMessage: "", // We'll get this from Matrix presence
      bio: "", // We'll get this from Matrix account data
    },
  });

  // Component state
  const [updateState, setUpdateState] = useState<UpdateState>({ type: 'idle' });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // =============================================================================
  // Utility Functions
  // =============================================================================

  const getDisplayName = useCallback(() => {
    return profile.name || profile.userId.split(":")[0].replace("@", "");
  }, [profile.name, profile.userId]);

  const getInitials = useCallback(() => {
    const name = getDisplayName();
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }, [getDisplayName]);

  // =============================================================================
  // Avatar Handling
  // =============================================================================

  const handleAvatarSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setUpdateState({ 
        type: 'error', 
        message: 'Please select a valid image file' 
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUpdateState({ 
        type: 'error', 
        message: 'Image must be smaller than 5MB' 
      });
      return;
    }

    setAvatarFile(file);
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
    
    // Clear any previous errors
    setUpdateState({ type: 'idle' });
  }, []);

  const handleAvatarUpload = useCallback(async () => {
    if (!client || !isReady || !avatarFile) return;

    setIsAvatarUploading(true);
    setUpdateState({ type: 'loading', message: 'Uploading avatar...' });

    try {
      // Upload the file to Matrix media repository
      const uploadResponse = await client.uploadContent(avatarFile, {
        name: avatarFile.name,
        type: avatarFile.type,
        progressHandler: (progress) => {
          console.log(`Avatar upload progress: ${Math.round(progress.loaded / progress.total * 100)}%`);
        }
      });

      const avatarUrl = client.mxcUrlToHttp(uploadResponse.content_uri);
      
      // Set the new avatar URL in the user's profile
      await client.setAvatarUrl(uploadResponse.content_uri);

      setUpdateState({ 
        type: 'success', 
        message: 'Avatar updated successfully!' 
      });

      // Update local profile state
      const updatedProfile = { ...profile, imageUrl: avatarUrl };
      if (onUpdate) {
        onUpdate(updatedProfile);
      }

      // Clear the file selection
      setAvatarFile(null);
      setAvatarPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('Failed to upload avatar:', error);
      setUpdateState({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to upload avatar' 
      });
    } finally {
      setIsAvatarUploading(false);
    }
  }, [client, isReady, avatarFile, profile, onUpdate]);

  const clearAvatarSelection = useCallback(() => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }
  }, [avatarPreview]);

  // =============================================================================
  // Form Submission
  // =============================================================================

  const onSubmit = useCallback(async (data: ProfileFormData) => {
    if (!client || !isReady) return;

    setUpdateState({ type: 'loading', message: 'Updating profile...' });

    try {
      // Update display name
      if (data.displayName !== profile.name) {
        await client.setDisplayName(data.displayName);
      }

      // Update status message (using Matrix presence)
      if (data.statusMessage !== undefined) {
        await client.setPresence({
          presence: "online",
          status_msg: data.statusMessage || undefined,
        });
      }

      // Update bio (store in account data)
      if (data.bio !== undefined) {
        await client.setAccountData('org.haos.profile.bio' as any, {
          bio: data.bio,
          updated: Date.now(),
        } as any);
      }

      setUpdateState({ 
        type: 'success', 
        message: 'Profile updated successfully!' 
      });

      // Update local profile state
      const updatedProfile = { 
        ...profile, 
        name: data.displayName,
        updatedAt: new Date(),
      };
      if (onUpdate) {
        onUpdate(updatedProfile);
      }

      // Refresh the page to show updated data
      setTimeout(() => {
        router.refresh();
      }, 1500);

    } catch (error) {
      console.error('Failed to update profile:', error);
      setUpdateState({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to update profile' 
      });
    }
  }, [client, isReady, profile, onUpdate, router]);

  // =============================================================================
  // Render
  // =============================================================================

  if (!isReady) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <span className="ml-2 text-zinc-600 dark:text-zinc-400">
              Connecting to Matrix...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Alert */}
      {updateState.type !== 'idle' && (
        <Alert 
          variant={updateState.type === 'error' ? 'destructive' : 'default'}
          className={updateState.type === 'success' ? 'border-green-200 bg-green-50 text-green-800' : undefined}
        >
          {updateState.type === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
          {updateState.type === 'success' && <CheckCircle className="h-4 w-4" />}
          {updateState.type === 'error' && <AlertCircle className="h-4 w-4" />}
          <AlertDescription>{updateState.message}</AlertDescription>
        </Alert>
      )}

      {/* Avatar Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Profile Picture
          </CardTitle>
          <CardDescription>
            Upload a new avatar image. Square images work best.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage 
                src={avatarPreview || profile.imageUrl || undefined} 
                alt={getDisplayName()} 
              />
              <AvatarFallback className="bg-indigo-500 text-white text-2xl font-semibold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarSelect}
                className="hidden"
              />
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isAvatarUploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Image
                </Button>
                
                {avatarFile && (
                  <>
                    <Button
                      type="button"
                      onClick={handleAvatarUpload}
                      disabled={isAvatarUploading}
                    >
                      {isAvatarUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Upload
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={clearAvatarSelection}
                      disabled={isAvatarUploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
              
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Recommended: Square image, at least 128×128px, max 5MB
              </p>
              
              {avatarFile && (
                <p className="text-sm text-indigo-600 dark:text-indigo-400">
                  Selected: {avatarFile.name} ({(avatarFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Information Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Update your display name, status message, and bio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Display Name */}
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your display name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status Message */}
              <FormField
                control={form.control}
                name="statusMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status Message</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="What's your status? (optional)"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      A short message that appears with your online status
                    </p>
                  </FormItem>
                )}
              />

              {/* Bio */}
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell others about yourself... (optional)"
                        className="min-h-[100px] resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {field.value ? `${field.value.length}/1000 characters` : "0/1000 characters"}
                    </p>
                  </FormItem>
                )}
              />

              {/* Matrix User ID (read-only) */}
              <div className="space-y-2">
                <Label>Matrix User ID</Label>
                <Input
                  value={profile.userId}
                  disabled
                  className="font-mono text-sm bg-zinc-50 dark:bg-zinc-900"
                />
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Your unique Matrix identifier (cannot be changed)
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={updateState.type === 'loading' || !form.formState.isDirty}
                >
                  {updateState.type === 'loading' ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
                
                {form.formState.isDirty && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => form.reset()}
                  >
                    Reset
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export default ProfileForm;