"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  Settings,
  Users,
  Shield,
  Link,
  Trash2,
  Save,
  X,
  Crown,
  UserPlus,
  UserMinus,
  Eye,
  EyeOff,
  Copy,
  Plus,
  MoreHorizontal,
  AlertTriangle
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import FileUpload from "@/apps/web/components/file-upload";
import { useModal } from "@/hooks/use-modal-store";

// Matrix Services
import { updateSpace, deleteSpace } from "@/apps/web/services/matrix-space";
import { 
  getMembers, 
  kickMember, 
  banMember, 
  unbanMember,
  setPowerLevel,
  type Member,
  type MemberRole 
} from "@/apps/web/services/matrix-member";
import { 
  getSpaceInvites, 
  createInviteLink, 
  revokeInvite,
  type InviteInfo 
} from "@/apps/web/services/matrix-invite";

import type { MxcUrl } from "@/lib/matrix/types/media";

// =============================================================================
// Types and Schemas
// =============================================================================

const overviewSchema = z.object({
  name: z.string().min(1, "Server name is required").max(100, "Name must be 100 characters or less"),
  description: z.string().max(1024, "Description must be 1024 characters or less").optional(),
  avatarUrl: z.string().optional()
});

type OverviewFormData = z.infer<typeof overviewSchema>;

const deleteConfirmationSchema = z.object({
  serverName: z.string(),
  password: z.string().min(1, "Password is required"),
  deleteConfirm: z.literal("DELETE").optional()
});

type DeleteConfirmationData = z.infer<typeof deleteConfirmationSchema>;

type TabType = "overview" | "roles" | "members" | "invites" | "danger";

// =============================================================================
// Power Level Constants
// =============================================================================

const POWER_LEVELS = {
  OWNER: 100,
  ADMIN: 75,
  MODERATOR: 50,
  MEMBER: 0,
  RESTRICTED: -1
} as const;

const ROLE_CONFIGS = {
  owner: {
    name: "Owner",
    color: "bg-red-500",
    powerLevel: POWER_LEVELS.OWNER,
    description: "Full control over the server"
  },
  admin: {
    name: "Admin", 
    color: "bg-orange-500",
    powerLevel: POWER_LEVELS.ADMIN,
    description: "Can manage most server settings"
  },
  moderator: {
    name: "Moderator",
    color: "bg-green-500", 
    powerLevel: POWER_LEVELS.MODERATOR,
    description: "Can moderate members and channels"
  },
  member: {
    name: "Member",
    color: "bg-gray-500",
    powerLevel: POWER_LEVELS.MEMBER,
    description: "Regular server member"
  },
  restricted: {
    name: "Restricted",
    color: "bg-gray-700",
    powerLevel: POWER_LEVELS.RESTRICTED,
    description: "Limited permissions"
  }
} as const;

// =============================================================================
// Server Settings Modal Component
// =============================================================================

export const ServerSettingsModal = () => {
  const { isOpen, onClose, type, data } = useModal();
  const router = useRouter();

  const isModalOpen = isOpen && type === "serverSettings";
  const { space } = data;

  // State
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<InviteInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  // Forms
  const overviewForm = useForm<OverviewFormData>({
    resolver: zodResolver(overviewSchema),
    defaultValues: {
      name: space?.name || "",
      description: space?.topic || "",
      avatarUrl: space?.avatarUrl || ""
    }
  });

  const deleteForm = useForm<DeleteConfirmationData>({
    resolver: zodResolver(deleteConfirmationSchema),
    defaultValues: {
      serverName: "",
      password: "",
      deleteConfirm: undefined
    }
  });

  // Load data when modal opens
  useEffect(() => {
    if (!isModalOpen || !space?.id) return;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const [membersData, invitesData] = await Promise.all([
          getMembers(space.id),
          getSpaceInvites(space.id)
        ]);
        
        setMembers(membersData);
        setInvites(invitesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load server data");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isModalOpen, space?.id]);

  // Reset form when space changes
  useEffect(() => {
    if (space) {
      overviewForm.reset({
        name: space.name || "",
        description: space.topic || "",
        avatarUrl: space.avatarUrl || ""
      });
    }
  }, [space, overviewForm]);

  const handleClose = () => {
    setActiveTab("overview");
    setShowDeleteConfirmation(false);
    setError(null);
    overviewForm.reset();
    deleteForm.reset();
    onClose();
  };

  // =============================================================================
  // Overview Tab Functions
  // =============================================================================

  const onOverviewSubmit = async (values: OverviewFormData) => {
    if (!space) return;

    setIsLoading(true);
    setError(null);

    try {
      await updateSpace(space.id, {
        name: values.name,
        topic: values.description,
        avatar: values.avatarUrl
      });

      // TODO: Refresh space data in parent
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update server");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = (mxcUrl: string) => {
    overviewForm.setValue("avatarUrl", mxcUrl);
  };

  // =============================================================================
  // Members Tab Functions  
  // =============================================================================

  const handleMemberAction = async (userId: string, action: "kick" | "ban" | "unban") => {
    if (!space) return;

    setIsLoading(true);
    try {
      switch (action) {
        case "kick":
          await kickMember(space.id, userId);
          break;
        case "ban":
          await banMember(space.id, userId);
          break;
        case "unban":
          await unbanMember(space.id, userId);
          break;
      }

      // Reload members
      const updatedMembers = await getMembers(space.id);
      setMembers(updatedMembers);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} member`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: MemberRole) => {
    if (!space) return;

    setIsLoading(true);
    try {
      const newPowerLevel = ROLE_CONFIGS[newRole].powerLevel;
      await setPowerLevel(space.id, userId, newPowerLevel);

      // Update local state
      setMembers(prev => prev.map(member => 
        member.userId === userId 
          ? { ...member, powerLevel: newPowerLevel, role: newRole }
          : member
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change role");
    } finally {
      setIsLoading(false);
    }
  };

  // =============================================================================
  // Invites Tab Functions
  // =============================================================================

  const handleCreateInvite = async () => {
    if (!space) return;

    setIsLoading(true);
    try {
      await createInviteLink(space.id);
      
      // Reload invites
      const updatedInvites = await getSpaceInvites(space.id);
      setInvites(updatedInvites);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invite");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeInvite = async (inviteCode: string) => {
    setIsLoading(true);
    try {
      await revokeInvite(inviteCode);
      
      // Update local state
      setInvites(prev => prev.map(invite => 
        invite.code === inviteCode 
          ? { ...invite, isActive: false }
          : invite
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke invite");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyInvite = (inviteCode: string) => {
    const inviteUrl = `${window.location.origin}/invite/${inviteCode}`;
    navigator.clipboard.writeText(inviteUrl);
  };

  // =============================================================================
  // Danger Zone Functions
  // =============================================================================

  const onDeleteSubmit = async (values: DeleteConfirmationData) => {
    if (!space || values.serverName !== space.name || values.deleteConfirm !== "DELETE") {
      setError("Please verify all fields are correct");
      return;
    }

    setIsLoading(true);
    try {
      await deleteSpace(space.id);
      
      // Navigate away and close modal
      router.push("/channels/@me");
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete server");
    } finally {
      setIsLoading(false);
    }
  };

  if (!space) return null;

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white dark:bg-[#2B2D31] text-black dark:text-white p-0 overflow-hidden max-w-3xl max-h-[85vh]">
        <DialogHeader className="pt-8 px-6">
          <DialogTitle className="text-2xl text-center font-bold">
            Server Settings
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-500">
            Manage your server settings and preferences
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as TabType)} className="w-full">
          <div className="px-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="roles" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Roles
              </TabsTrigger>
              <TabsTrigger value="members" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Members
              </TabsTrigger>
              <TabsTrigger value="invites" className="flex items-center gap-2">
                <Link className="h-4 w-4" />
                Invites
              </TabsTrigger>
              <TabsTrigger value="danger" className="flex items-center gap-2 text-red-500">
                <Trash2 className="h-4 w-4" />
                Danger
              </TabsTrigger>
            </TabsList>
          </div>

          {error && (
            <div className="mx-6 px-4 py-3 bg-red-500/10 border border-red-500 rounded-md">
              <p className="text-red-500 text-sm">{error}</p>
            </div>
          )}

          <div className="px-6 pb-6">
            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <Form {...overviewForm}>
                <form onSubmit={overviewForm.handleSubmit(onOverviewSubmit)} className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={overviewForm.watch("avatarUrl") || space.avatarUrl || undefined} />
                          <AvatarFallback className="text-lg">
                            {space.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex-1">
                        <FileUpload
                          onUploadComplete={(mxcUrl) => handleAvatarUpload(mxcUrl)}
                          accept={["image/*"]}
                          maxSize={8 * 1024 * 1024}
                          showPreview={true}
                        />
                        <p className="text-xs text-zinc-500 mt-2">
                          Minimum size: 128x128px. File types: JPG, PNG, GIF. Max size: 8MB.
                        </p>
                      </div>
                    </div>

                    <FormField
                      control={overviewForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="uppercase text-xs font-bold text-zinc-500 dark:text-secondary/70">
                            Server Name
                          </FormLabel>
                          <FormControl>
                            <Input
                              disabled={isLoading}
                              className="bg-zinc-300/50 dark:bg-zinc-700 border-0 focus-visible:ring-0 text-black dark:text-white focus-visible:ring-offset-0"
                              placeholder="Enter server name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={overviewForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="uppercase text-xs font-bold text-zinc-500 dark:text-secondary/70">
                            Server Description
                          </FormLabel>
                          <FormControl>
                            <textarea
                              disabled={isLoading}
                              className="bg-zinc-300/50 dark:bg-zinc-700 border-0 focus-visible:ring-0 text-black dark:text-white focus-visible:ring-offset-0 w-full min-h-[80px] p-3 rounded-md resize-none"
                              placeholder="Tell people what your server is about (optional)"
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
                  </div>

                  <div className="flex items-center justify-end space-x-2">
                    <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />}
                      Save Changes
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            {/* Roles Tab */}
            <TabsContent value="roles" className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Role Hierarchy</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                  Roles are managed through Matrix power levels. Higher roles inherit permissions from lower roles.
                </p>
                
                <div className="space-y-3">
                  {Object.entries(ROLE_CONFIGS).map(([role, config]) => (
                    <div key={role} className="flex items-center justify-between p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full ${config.color}`} />
                        <div>
                          <h4 className="font-medium">{config.name}</h4>
                          <p className="text-sm text-zinc-500">{config.description}</p>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        Power Level {config.powerLevel}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Members Tab */}
            <TabsContent value="members" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Server Members ({members.length})</h3>
                <Button size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Members
                </Button>
              </div>
              
              <ScrollArea className="h-96 w-full">
                <div className="space-y-2">
                  {members.map((member) => (
                    <div key={member.userId} className="flex items-center justify-between p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatarUrl || undefined} />
                          <AvatarFallback>
                            {member.displayName?.substring(0, 2).toUpperCase() || member.userId.substring(1, 3).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {member.displayName || member.userId}
                            {member.role === 'owner' && <Crown className="h-4 w-4 text-yellow-500 ml-1 inline" />}
                          </p>
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${ROLE_CONFIGS[member.role].color} text-white`}
                            >
                              {ROLE_CONFIGS[member.role].name}
                            </Badge>
                            {member.isOnline && (
                              <div className="w-2 h-2 bg-green-500 rounded-full" />
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {member.role !== 'owner' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {Object.entries(ROLE_CONFIGS).map(([role, config]) => (
                              role !== 'owner' && (
                                <DropdownMenuItem 
                                  key={role}
                                  onClick={() => handleRoleChange(member.userId, role as MemberRole)}
                                >
                                  Change to {config.name}
                                </DropdownMenuItem>
                              )
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleMemberAction(member.userId, "kick")}
                              className="text-yellow-500"
                            >
                              Kick Member
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleMemberAction(member.userId, "ban")}
                              className="text-red-500"
                            >
                              Ban Member
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Invites Tab */}
            <TabsContent value="invites" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Server Invites ({invites.filter(i => i.isActive).length})</h3>
                <Button onClick={handleCreateInvite} disabled={isLoading}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Invite
                </Button>
              </div>

              <div className="space-y-3">
                {invites.length === 0 ? (
                  <p className="text-center text-zinc-500 py-8">No invites created yet</p>
                ) : (
                  invites.map((invite) => (
                    <div key={invite.code} className="flex items-center justify-between p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <code className="bg-zinc-200 dark:bg-zinc-700 px-2 py-1 rounded text-sm">
                            {invite.code}
                          </code>
                          {!invite.isActive && (
                            <Badge variant="destructive">Revoked</Badge>
                          )}
                        </div>
                        <p className="text-sm text-zinc-500">
                          Created by {invite.createdByName} on {new Date(invite.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-zinc-500">
                          Used {invite.currentUses} / {invite.maxUses || "∞"} times
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {invite.isActive && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleCopyInvite(invite.code)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleRevokeInvite(invite.code)}
                              disabled={isLoading}
                            >
                              Revoke
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Danger Zone Tab */}
            <TabsContent value="danger" className="space-y-6">
              <div className="border border-red-500 rounded-lg p-6 bg-red-500/5">
                <div className="flex items-center space-x-3 mb-4">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                  <h3 className="text-lg font-semibold text-red-500">Danger Zone</h3>
                </div>
                
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                  The following actions are destructive and cannot be undone. Please proceed with caution.
                </p>

                {!showDeleteConfirmation ? (
                  <Button 
                    variant="destructive" 
                    onClick={() => setShowDeleteConfirmation(true)}
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Server
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-red-500">Delete Server Confirmation</h4>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      This action will permanently delete this server and all its data. This cannot be undone.
                    </p>
                    
                    <Form {...deleteForm}>
                      <form onSubmit={deleteForm.handleSubmit(onDeleteSubmit)} className="space-y-4">
                        <FormField
                          control={deleteForm.control}
                          name="serverName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Type the server name to confirm: <strong>{space.name}</strong></FormLabel>
                              <FormControl>
                                <Input
                                  disabled={isLoading}
                                  placeholder="Enter server name"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={deleteForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Enter your password to confirm</FormLabel>
                              <FormControl>
                                <Input
                                  type="password"
                                  disabled={isLoading}
                                  placeholder="Enter your password"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={deleteForm.control}
                          name="deleteConfirm"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Type <strong>DELETE</strong> to confirm</FormLabel>
                              <FormControl>
                                <Input
                                  disabled={isLoading}
                                  placeholder="DELETE"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex items-center space-x-2">
                          <Button 
                            type="button"
                            variant="outline" 
                            onClick={() => setShowDeleteConfirmation(false)}
                            disabled={isLoading}
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            variant="destructive"
                            disabled={isLoading}
                          >
                            {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />}
                            Delete Server Forever
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};