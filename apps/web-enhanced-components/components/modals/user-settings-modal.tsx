"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  User,
  Settings,
  Bell,
  Palette,
  Shield,
  Camera,
  X,
  Check,
  Loader2,
  Moon,
  Sun,
  Monitor,
  Lock,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  MessageSquare,
  AtSign,
  Users,
  LogOut,
  Trash2,
  ExternalLink,
  Copy,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { useModal } from "@/hooks/use-modal-store";
import { useMatrixAuth } from "@/components/providers/matrix-auth-provider";
import { getClient } from "@/lib/matrix/client";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { NotificationSettings } from "@/components/settings/notification-settings";

// =============================================================================
// Types and Schemas
// =============================================================================

const profileSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(100, "Display name must be less than 100 characters"),
  statusMessage: z.string().max(200, "Status message must be less than 200 characters").optional(),
  avatarUrl: z.string().optional(),
});

const privacySchema = z.object({
  showOnlineStatus: z.boolean(),
  showLastActive: z.boolean(),
  allowDMsFromAnyone: z.boolean(),
  showReadReceipts: z.boolean(),
  showTypingIndicator: z.boolean(),
});

const notificationSchema = z.object({
  enableNotifications: z.boolean(),
  enableSounds: z.boolean(),
  enableDMNotifications: z.boolean(),
  enableMentionNotifications: z.boolean(),
  enableServerNotifications: z.boolean(),
  notificationSound: z.string(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PrivacyFormValues = z.infer<typeof privacySchema>;
type NotificationFormValues = z.infer<typeof notificationSchema>;

type SettingsTab = "profile" | "account" | "privacy" | "notifications" | "appearance";

// =============================================================================
// Constants
// =============================================================================

const NOTIFICATION_SOUNDS = [
  { value: "default", label: "Default" },
  { value: "ping", label: "Ping" },
  { value: "pop", label: "Pop" },
  { value: "chime", label: "Chime" },
  { value: "none", label: "None" },
];

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun, description: "Bright and clean interface" },
  { value: "dark", label: "Dark", icon: Moon, description: "Easy on the eyes" },
  { value: "system", label: "System", icon: Monitor, description: "Match your device settings" },
];

// =============================================================================
// Main Component
// =============================================================================

export function UserSettingsModal() {
  const { isOpen, onClose, type } = useModal();
  const isModalOpen = isOpen && type === "userSettings";
  const { user, logout, refreshSession } = useMatrixAuth();
  const { theme, setTheme } = useTheme();
  
  // State
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // Forms
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      statusMessage: "",
      avatarUrl: "",
    },
  });

  const privacyForm = useForm<PrivacyFormValues>({
    resolver: zodResolver(privacySchema),
    defaultValues: {
      showOnlineStatus: true,
      showLastActive: true,
      allowDMsFromAnyone: true,
      showReadReceipts: true,
      showTypingIndicator: true,
    },
  });

  const notificationForm = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      enableNotifications: true,
      enableSounds: true,
      enableDMNotifications: true,
      enableMentionNotifications: true,
      enableServerNotifications: true,
      notificationSound: "default",
    },
  });

  // Load initial data
  useEffect(() => {
    if (!isModalOpen || !user) return;

    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const client = getClient();
        if (!client) return;

        // Load profile data
        profileForm.reset({
          displayName: user.displayName || "",
          statusMessage: user.statusMessage || "",
          avatarUrl: user.avatarUrl || "",
        });

        // Load settings from Matrix account data
        try {
          // Use any type to bypass strict typing for custom account data
          const privacyData = await (client as any).getAccountData("im.haos.privacy");
          if (privacyData) {
            privacyForm.reset(privacyData.getContent() as PrivacyFormValues);
          }
        } catch {
          // No stored privacy settings, use defaults
        }

        try {
          const notificationData = await (client as any).getAccountData("im.haos.notifications");
          if (notificationData) {
            notificationForm.reset(notificationData.getContent() as NotificationFormValues);
          }
        } catch {
          // No stored notification settings, use defaults
        }

        setAvatarPreview(user.avatarUrl || null);
      } catch (error) {
        console.error("Failed to load settings:", error);
        toast.error("Failed to load settings");
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [isModalOpen, user]);

  // Track changes
  useEffect(() => {
    const profileChanged = profileForm.formState.isDirty;
    const privacyChanged = privacyForm.formState.isDirty;
    const notificationChanged = notificationForm.formState.isDirty;
    setHasChanges(profileChanged || privacyChanged || notificationChanged || avatarFile !== null);
  }, [profileForm.formState.isDirty, privacyForm.formState.isDirty, notificationForm.formState.isDirty, avatarFile]);

  // Handle avatar change
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Avatar must be less than 5MB");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    setAvatarFile(file);
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
    setHasChanges(true);
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    if (!user) return;
    
    const isValid = await profileForm.trigger();
    if (!isValid) return;

    setIsSaving(true);
    try {
      const client = getClient();
      if (!client) throw new Error("Matrix client not available");

      const values = profileForm.getValues();

      // Upload avatar if changed
      if (avatarFile) {
        try {
          const uploadResponse = await client.uploadContent(avatarFile);
          const mxcUrl = uploadResponse.content_uri;
          await client.setAvatarUrl(mxcUrl);
          values.avatarUrl = mxcUrl;
        } catch (error) {
          console.error("Failed to upload avatar:", error);
          toast.error("Failed to upload avatar");
          throw error;
        }
      }

      // Update display name
      await client.setDisplayName(values.displayName);

      // Update status message via presence
      if (values.statusMessage !== undefined) {
        await client.setPresence({ 
          presence: "online", 
          status_msg: values.statusMessage || undefined 
        });
      }

      // Refresh user data
      await refreshSession();
      
      setAvatarFile(null);
      profileForm.reset(values);
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Failed to save profile:", error);
      toast.error("Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  // Save privacy settings
  const handleSavePrivacy = async () => {
    const isValid = await privacyForm.trigger();
    if (!isValid) return;

    setIsSaving(true);
    try {
      const client = getClient();
      if (!client) throw new Error("Matrix client not available");

      const values = privacyForm.getValues();
      
      // Store in Matrix account data (use any to bypass strict typing for custom event types)
      await (client as any).setAccountData("im.haos.privacy", values);
      
      privacyForm.reset(values);
      toast.success("Privacy settings updated");
    } catch (error) {
      console.error("Failed to save privacy settings:", error);
      toast.error("Failed to save privacy settings");
    } finally {
      setIsSaving(false);
    }
  };

  // Save notification settings
  const handleSaveNotifications = async () => {
    const isValid = await notificationForm.trigger();
    if (!isValid) return;

    setIsSaving(true);
    try {
      const client = getClient();
      if (!client) throw new Error("Matrix client not available");

      const values = notificationForm.getValues();
      
      // Store in Matrix account data (use any to bypass strict typing for custom event types)
      await (client as any).setAccountData("im.haos.notifications", values);
      
      notificationForm.reset(values);
      toast.success("Notification settings updated");
    } catch (error) {
      console.error("Failed to save notification settings:", error);
      toast.error("Failed to save notification settings");
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel and reset
  const handleCancel = () => {
    if (hasChanges) {
      // Reset all forms
      if (user) {
        profileForm.reset({
          displayName: user.displayName || "",
          statusMessage: user.statusMessage || "",
          avatarUrl: user.avatarUrl || "",
        });
      }
      setAvatarFile(null);
      setAvatarPreview(user?.avatarUrl || null);
    }
    onClose();
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      onClose();
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Failed to logout:", error);
      toast.error("Failed to logout");
    }
  };

  // Copy user ID
  const handleCopyUserId = () => {
    if (user?.userId) {
      navigator.clipboard.writeText(user.userId);
      toast.success("User ID copied to clipboard");
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      // Could add confirmation dialog here
    }
    handleCancel();
  };

  if (!user) return null;

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white dark:bg-[#313338] text-black dark:text-white p-0 overflow-hidden max-w-4xl h-[85vh] max-h-[700px] w-[95vw] md:w-full">
        <div className="flex flex-col md:flex-row h-full">
          {/* Sidebar - Horizontal tabs on mobile, vertical on desktop */}
          <div className="w-full md:w-56 bg-zinc-100 dark:bg-[#2B2D31] p-2 md:p-4 flex flex-col shrink-0">
            <DialogHeader className="pb-2 md:pb-4 hidden md:block">
              <DialogTitle className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                User Settings
              </DialogTitle>
            </DialogHeader>
            
            {/* Mobile: Horizontal scrolling tabs */}
            <div className="md:hidden overflow-x-auto pb-2">
              <div className="flex gap-1 min-w-max">
                <MobileTabButton
                  icon={User}
                  label="Profile"
                  active={activeTab === "profile"}
                  onClick={() => setActiveTab("profile")}
                />
                <MobileTabButton
                  icon={Settings}
                  label="Account"
                  active={activeTab === "account"}
                  onClick={() => setActiveTab("account")}
                />
                <MobileTabButton
                  icon={Shield}
                  label="Privacy"
                  active={activeTab === "privacy"}
                  onClick={() => setActiveTab("privacy")}
                />
                <MobileTabButton
                  icon={Bell}
                  label="Notifications"
                  active={activeTab === "notifications"}
                  onClick={() => setActiveTab("notifications")}
                />
                <MobileTabButton
                  icon={Palette}
                  label="Appearance"
                  active={activeTab === "appearance"}
                  onClick={() => setActiveTab("appearance")}
                />
              </div>
            </div>

            {/* Desktop: Vertical nav */}
            <nav className="space-y-1 flex-1 hidden md:block">
              <TabButton
                icon={User}
                label="My Profile"
                active={activeTab === "profile"}
                onClick={() => setActiveTab("profile")}
              />
              <TabButton
                icon={Settings}
                label="My Account"
                active={activeTab === "account"}
                onClick={() => setActiveTab("account")}
              />
              
              <Separator className="my-3" />
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide px-2 mb-2">
                App Settings
              </p>
              
              <TabButton
                icon={Shield}
                label="Privacy"
                active={activeTab === "privacy"}
                onClick={() => setActiveTab("privacy")}
              />
              <TabButton
                icon={Bell}
                label="Notifications"
                active={activeTab === "notifications"}
                onClick={() => setActiveTab("notifications")}
              />
              <TabButton
                icon={Palette}
                label="Appearance"
                active={activeTab === "appearance"}
                onClick={() => setActiveTab("appearance")}
              />
            </nav>

            <Separator className="my-3 hidden md:block" />
            
            {/* Desktop logout button */}
            <div className="hidden md:block">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-red-500 hover:bg-red-500/10 transition-colors w-full text-left">
                    <LogOut className="h-4 w-4" />
                    Log Out
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Log out?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You will be logged out of your Matrix account on this device.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleLogout} className="bg-red-500 hover:bg-red-600">
                      Log Out
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              </div>
            ) : (
              <>
                {/* Profile Tab */}
                {activeTab === "profile" && (
                  <ProfileTab
                    form={profileForm}
                    user={user}
                    avatarPreview={avatarPreview}
                    isSaving={isSaving}
                    onAvatarChange={handleAvatarChange}
                    onSave={handleSaveProfile}
                    onCancel={() => {
                      profileForm.reset();
                      setAvatarFile(null);
                      setAvatarPreview(user.avatarUrl || null);
                    }}
                  />
                )}

                {/* Account Tab */}
                {activeTab === "account" && (
                  <AccountTab
                    user={user}
                    onCopyUserId={handleCopyUserId}
                    onLogout={handleLogout}
                  />
                )}

                {/* Privacy Tab */}
                {activeTab === "privacy" && (
                  <PrivacyTab
                    form={privacyForm}
                    isSaving={isSaving}
                    onSave={handleSavePrivacy}
                    onCancel={() => privacyForm.reset()}
                  />
                )}

                {/* Notifications Tab */}
                {activeTab === "notifications" && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold mb-1">Notification Settings</h2>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Manage how and when you receive notifications for Matrix events
                      </p>
                    </div>
                    <NotificationSettings />
                  </div>
                )}

                {/* Appearance Tab */}
                {activeTab === "appearance" && (
                  <AppearanceTab
                    theme={theme}
                    setTheme={setTheme}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function TabButton({ 
  icon: Icon, 
  label, 
  active, 
  onClick 
}: { 
  icon: React.ElementType; 
  label: string; 
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full text-left",
        active
          ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white"
          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 hover:text-zinc-900 dark:hover:text-zinc-200"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

// Mobile Tab Button (compact for horizontal scrolling)
function MobileTabButton({ 
  icon: Icon, 
  label, 
  active, 
  onClick 
}: { 
  icon: React.ElementType; 
  label: string; 
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap",
        active
          ? "bg-indigo-500 text-white"
          : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-600"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

// Profile Tab Component
function ProfileTab({
  form,
  user,
  avatarPreview,
  isSaving,
  onAvatarChange,
  onSave,
  onCancel,
}: {
  form: ReturnType<typeof useForm<ProfileFormValues>>;
  user: any;
  avatarPreview: string | null;
  isSaving: boolean;
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">My Profile</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Customize how others see you across the platform
        </p>
      </div>

      <Form {...form}>
        <form className="space-y-6">
          {/* Avatar Section - Stack on mobile, row on desktop */}
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div className="relative group">
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-zinc-200 dark:border-zinc-700">
                <AvatarImage src={avatarPreview || undefined} />
                <AvatarFallback className="text-lg sm:text-xl font-bold bg-indigo-500 text-white">
                  {user.displayName?.substring(0, 2).toUpperCase() || 
                   user.userId?.substring(1, 3).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                <Camera className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onAvatarChange}
                />
              </label>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h3 className="font-medium mb-1">Profile Picture</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
                Click the avatar to upload a new image. Max 5MB.
              </p>
              <label className="inline-block">
                <Button type="button" variant="outline" size="sm" asChild>
                  <span>
                    <Camera className="h-4 w-4 mr-2" />
                    Change Avatar
                  </span>
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onAvatarChange}
                />
              </label>
            </div>
          </div>

          <Separator />

          {/* Display Name */}
          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Enter your display name"
                    className="max-w-md"
                  />
                </FormControl>
                <FormDescription>
                  This is how other users will see you
                </FormDescription>
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
                  <Textarea
                    {...field}
                    placeholder="What's on your mind?"
                    className="max-w-md resize-none"
                    rows={3}
                  />
                </FormControl>
                <FormDescription>
                  Share what you're up to (max 200 characters)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Save/Cancel Buttons */}
          {form.formState.isDirty && (
            <div className="flex items-center gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
              <Button
                type="button"
                onClick={onSave}
                disabled={isSaving}
                className="bg-indigo-500 hover:bg-indigo-600"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSaving}
              >
                Cancel
              </Button>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}

// Account Tab Component
function AccountTab({
  user,
  onCopyUserId,
  onLogout,
}: {
  user: any;
  onCopyUserId: () => void;
  onLogout?: () => void;
}) {
  const homeserver = user.userId?.split(':')[1] || '';
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">My Account</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          View your linked Matrix account information
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Matrix Account</CardTitle>
          <CardDescription>Your linked Matrix account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* User ID */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <AtSign className="h-5 w-5 text-zinc-400" />
              <div>
                <p className="text-sm font-medium">User ID</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 font-mono">
                  {user.userId}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onCopyUserId}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          <Separator />

          {/* Homeserver */}
          <div className="flex items-center gap-3 py-2">
            <ExternalLink className="h-5 w-5 text-zinc-400" />
            <div>
              <p className="text-sm font-medium">Homeserver</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {homeserver}
              </p>
            </div>
          </div>

          <Separator />

          {/* Account Status */}
          <div className="flex items-center gap-3 py-2">
            <Check className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm font-medium">Account Status</p>
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                Active
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-500/20">
        <CardHeader>
          <CardTitle className="text-lg text-red-500 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            These actions are permanent and cannot be undone
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete Account</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Permanently delete your account and all data
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your
                    account and remove your data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-red-500 hover:bg-red-600">
                    Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Logout Button */}
      {onLogout && (
        <div className="md:hidden">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full text-red-500 border-red-500/50 hover:bg-red-500/10">
                <LogOut className="h-4 w-4 mr-2" />
                Log Out
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Log out?</AlertDialogTitle>
                <AlertDialogDescription>
                  You will be logged out of your Matrix account on this device.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onLogout} className="bg-red-500 hover:bg-red-600">
                  Log Out
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}

// Privacy Tab Component
function PrivacyTab({
  form,
  isSaving,
  onSave,
  onCancel,
}: {
  form: ReturnType<typeof useForm<PrivacyFormValues>>;
  isSaving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">Privacy Settings</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Control your privacy and what others can see
        </p>
      </div>

      <Form {...form}>
        <form className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Online Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="showOnlineStatus"
                render={({ field }) => (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Show online status</p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Let others see when you're online
                      </p>
                    </div>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </div>
                )}
              />
              
              <Separator />

              <FormField
                control={form.control}
                name="showLastActive"
                render={({ field }) => (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Show last active</p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Show when you were last active
                      </p>
                    </div>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </div>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Messages
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="allowDMsFromAnyone"
                render={({ field }) => (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Allow DMs from anyone</p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Receive direct messages from any user
                      </p>
                    </div>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </div>
                )}
              />
              
              <Separator />

              <FormField
                control={form.control}
                name="showReadReceipts"
                render={({ field }) => (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Send read receipts</p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Let others know when you've read their messages
                      </p>
                    </div>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </div>
                )}
              />
              
              <Separator />

              <FormField
                control={form.control}
                name="showTypingIndicator"
                render={({ field }) => (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Show typing indicator</p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Let others know when you're typing
                      </p>
                    </div>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </div>
                )}
              />
            </CardContent>
          </Card>

          {/* Save/Cancel Buttons */}
          {form.formState.isDirty && (
            <div className="flex items-center gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
              <Button
                type="button"
                onClick={onSave}
                disabled={isSaving}
                className="bg-indigo-500 hover:bg-indigo-600"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSaving}
              >
                Cancel
              </Button>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}

// NOTE: This component is replaced by the comprehensive NotificationSettings component

// Appearance Tab Component
function AppearanceTab({
  theme,
  setTheme,
}: {
  theme: string | undefined;
  setTheme: (theme: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">Appearance</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Customize how the app looks and feels
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Theme
          </CardTitle>
          <CardDescription>
            Choose your preferred color scheme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {THEME_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = theme === option.value;
              
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    setTheme(option.value);
                    toast.success(`Theme changed to ${option.label}`);
                  }}
                  className={cn(
                    "relative p-4 rounded-lg border-2 transition-all text-left",
                    isSelected
                      ? "border-indigo-500 bg-indigo-500/10"
                      : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                  )}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={cn(
                      "p-2 rounded-lg",
                      isSelected ? "bg-indigo-500 text-white" : "bg-zinc-100 dark:bg-zinc-800"
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-medium">{option.label}</span>
                  </div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {option.description}
                  </p>
                  
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <Check className="h-5 w-5 text-indigo-500" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Future: More appearance options */}
      <Card className="opacity-50">
        <CardHeader>
          <CardTitle className="text-lg">More Options</CardTitle>
          <CardDescription>
            Additional customization coming soon
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-zinc-500 dark:text-zinc-400">
            <p>• Custom accent colors</p>
            <p>• Message density options</p>
            <p>• Font size adjustments</p>
            <p>• Compact mode</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default UserSettingsModal;
