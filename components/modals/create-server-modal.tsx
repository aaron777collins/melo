"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, Plus, Hash, Volume2, Mic, Camera } from "lucide-react";

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
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import FileUpload from "@/apps/web/components/file-upload";
import { useModal } from "@/hooks/use-modal-store";
import { createSpace, joinSpace } from "@/apps/web/services/matrix-space";
import { createRoom } from "@/apps/web/services/matrix-room";
import type { MxcUrl } from "@/lib/matrix/types/media";

// =============================================================================
// Types and Schemas
// =============================================================================

type Step = "choice" | "create" | "join" | "template" | "customize";

type ServerTemplate = {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  channels: Array<{
    name: string;
    type: 'text' | 'audio' | 'video';
    emoji?: string;
  }>;
};

const createFormSchema = z.object({
  name: z.string().min(1, { message: "Server name is required." }).max(100, { message: "Server name must be 100 characters or less." }),
  avatar: z.string().optional()
});

const joinFormSchema = z.object({
  roomId: z.string().min(1, { message: "Server ID or invite link is required." })
});

// =============================================================================
// Server Templates
// =============================================================================

const SERVER_TEMPLATES: ServerTemplate[] = [
  {
    id: "gaming",
    name: "Gaming Community",
    description: "Perfect for gaming groups and clans",
    icon: <Camera className="h-6 w-6" />,
    channels: [
      { name: "general", type: "text", emoji: "💬" },
      { name: "announcements", type: "text", emoji: "📢" },
      { name: "game-chat", type: "text", emoji: "🎮" },
      { name: "voice-lobby", type: "audio", emoji: "🔊" },
      { name: "game-room", type: "video", emoji: "📹" }
    ]
  },
  {
    id: "study",
    name: "Study Group",
    description: "Collaborate on projects and homework",
    icon: <Hash className="h-6 w-6" />,
    channels: [
      { name: "general", type: "text", emoji: "📚" },
      { name: "homework-help", type: "text", emoji: "❓" },
      { name: "resources", type: "text", emoji: "🔗" },
      { name: "study-session", type: "audio", emoji: "🎧" },
      { name: "presentation-room", type: "video", emoji: "📺" }
    ]
  },
  {
    id: "friends",
    name: "Friends & Family",
    description: "Stay connected with your loved ones",
    icon: <Users className="h-6 w-6" />,
    channels: [
      { name: "general", type: "text", emoji: "👋" },
      { name: "photos", type: "text", emoji: "📸" },
      { name: "events", type: "text", emoji: "📅" },
      { name: "hangout", type: "audio", emoji: "☕" },
      { name: "video-calls", type: "video", emoji: "📱" }
    ]
  },
  {
    id: "work",
    name: "Work Team",
    description: "Professional collaboration space",
    icon: <Volume2 className="h-6 w-6" />,
    channels: [
      { name: "general", type: "text", emoji: "💼" },
      { name: "announcements", type: "text", emoji: "📣" },
      { name: "project-updates", type: "text", emoji: "📊" },
      { name: "team-standup", type: "audio", emoji: "🎤" },
      { name: "meetings", type: "video", emoji: "🖥️" }
    ]
  }
];

// =============================================================================
// Main Modal Component
// =============================================================================

export function CreateServerModal() {
  const { isOpen, onClose, type } = useModal();
  const router = useRouter();

  const isModalOpen = isOpen && type === "createServer";

  // =============================================================================
  // State Management
  // =============================================================================

  const [currentStep, setCurrentStep] = useState<Step>("choice");
  const [selectedTemplate, setSelectedTemplate] = useState<ServerTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // =============================================================================
  // Forms
  // =============================================================================

  const createForm = useForm({
    resolver: zodResolver(createFormSchema),
    defaultValues: {
      name: "",
      avatar: ""
    }
  });

  const joinForm = useForm({
    resolver: zodResolver(joinFormSchema),
    defaultValues: {
      roomId: ""
    }
  });

  // =============================================================================
  // Handlers
  // =============================================================================

  const handleClose = () => {
    setCurrentStep("choice");
    setSelectedTemplate(null);
    setError(null);
    createForm.reset();
    joinForm.reset();
    onClose();
  };

  const handleBack = () => {
    setError(null);
    switch (currentStep) {
      case "create":
      case "join":
        setCurrentStep("choice");
        break;
      case "template":
        setCurrentStep("create");
        break;
      case "customize":
        if (selectedTemplate) {
          setCurrentStep("template");
        } else {
          setCurrentStep("create");
        }
        break;
      default:
        setCurrentStep("choice");
    }
  };

  const handleCreateChoice = () => {
    setCurrentStep("create");
  };

  const handleJoinChoice = () => {
    setCurrentStep("join");
  };

  const handleCreateNext = () => {
    setCurrentStep("template");
  };

  const handleSkipTemplate = () => {
    setSelectedTemplate(null);
    setCurrentStep("customize");
  };

  const handleSelectTemplate = (template: ServerTemplate) => {
    setSelectedTemplate(template);
    setCurrentStep("customize");
    
    // Pre-fill form with template name
    createForm.setValue("name", template.name);
  };

  const handleAvatarUpload = (mxcUrl: MxcUrl, file: File) => {
    createForm.setValue("avatar", mxcUrl);
  };

  const handleCreateSubmit = async (values: z.infer<typeof createFormSchema>) => {
    try {
      setIsLoading(true);
      setError(null);

      // Create the space
      const space = await createSpace(values.name, values.avatar || undefined);

      // Create channels from template
      if (selectedTemplate) {
        try {
          for (const channel of selectedTemplate.channels) {
            await createRoom(
              channel.name,
              channel.type,
              space.id
            );
          }
        } catch (channelError) {
          console.warn("Failed to create some channels:", channelError);
          // Continue anyway - the space was created successfully
        }
      } else {
        // Create default general channel
        try {
          await createRoom("general", "text", space.id);
        } catch (channelError) {
          console.warn("Failed to create default channel:", channelError);
        }
      }

      // Navigate to the new space
      router.push(`/servers/${space.id}`);
      handleClose();

    } catch (error) {
      console.error("Failed to create server:", error);
      setError(error instanceof Error ? error.message : "Failed to create server");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinSubmit = async (values: z.infer<typeof joinFormSchema>) => {
    try {
      setIsLoading(true);
      setError(null);

      // Extract room ID from various formats
      let roomId = values.roomId.trim();
      
      // Handle matrix.to URLs
      if (roomId.includes("matrix.to")) {
        const match = roomId.match(/[!#][^:]+:[^\/]+/);
        if (match) {
          roomId = match[0];
        }
      }
      
      // Join the space
      await joinSpace(roomId);

      // Navigate to the joined space
      router.push(`/servers/${roomId}`);
      handleClose();

    } catch (error) {
      console.error("Failed to join server:", error);
      setError(error instanceof Error ? error.message : "Failed to join server");
    } finally {
      setIsLoading(false);
    }
  };

  // =============================================================================
  // Step Renderers
  // =============================================================================

  const renderChoice = () => (
    <div className="space-y-6">
      <DialogHeader className="pt-6 px-6">
        <DialogTitle className="text-2xl text-center font-bold text-zinc-800 dark:text-zinc-200">
          Create or Join a Server
        </DialogTitle>
        <DialogDescription className="text-center text-zinc-600 dark:text-zinc-400">
          Servers are where you and your friends hang out. Create your own or join an existing one.
        </DialogDescription>
      </DialogHeader>

      <div className="px-6 space-y-4">
        {/* Create Server Option */}
        <div
          onClick={handleCreateChoice}
          className="flex items-center p-4 rounded-lg border-2 border-dashed border-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:border-indigo-600 dark:bg-indigo-950 dark:hover:bg-indigo-900 cursor-pointer transition-colors"
        >
          <div className="flex-shrink-0 w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center">
            <Plus className="h-6 w-6 text-white" />
          </div>
          <div className="ml-4 flex-1">
            <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
              Create My Own
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Create a new server and invite your friends
            </p>
          </div>
        </div>

        {/* Join Server Option */}
        <div
          onClick={handleJoinChoice}
          className="flex items-center p-4 rounded-lg border-2 border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600 cursor-pointer transition-colors"
        >
          <div className="flex-shrink-0 w-12 h-12 bg-zinc-500 rounded-full flex items-center justify-center">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div className="ml-4 flex-1">
            <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
              Join a Server
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Enter an invite link to join an existing server
            </p>
          </div>
        </div>
      </div>

      <div className="h-6" />
    </div>
  );

  const renderCreate = () => (
    <div className="space-y-6">
      <DialogHeader className="pt-6 px-6">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="mr-2 p-1"
            disabled={isLoading}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <DialogTitle className="text-2xl text-center font-bold text-zinc-800 dark:text-zinc-200">
              Create Your Server
            </DialogTitle>
            <DialogDescription className="text-center text-zinc-600 dark:text-zinc-400">
              Give your server a name to get started. You can customize it later.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <Form {...createForm}>
        <div className="px-6 space-y-4">
          <FormField
            control={createForm.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="uppercase text-xs font-bold text-zinc-500 dark:text-secondary/70">
                  Server Name
                </FormLabel>
                <FormControl>
                  <Input
                    disabled={isLoading}
                    placeholder="My Awesome Server"
                    className="bg-zinc-300/50 border-0 focus-visible:ring-0 text-black focus-visible:ring-offset-0"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </Form>

      <div className="px-6 pb-6">
        <div className="flex justify-between">
          <Button variant="ghost" onClick={handleBack} disabled={isLoading}>
            Back
          </Button>
          <Button onClick={handleCreateNext} disabled={isLoading}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );

  const renderJoin = () => (
    <div className="space-y-6">
      <DialogHeader className="pt-6 px-6">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="mr-2 p-1"
            disabled={isLoading}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <DialogTitle className="text-2xl text-center font-bold text-zinc-800 dark:text-zinc-200">
              Join a Server
            </DialogTitle>
            <DialogDescription className="text-center text-zinc-600 dark:text-zinc-400">
              Enter a server ID or invite link below
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <Form {...joinForm}>
        <form onSubmit={joinForm.handleSubmit(handleJoinSubmit)} className="space-y-6">
          <div className="px-6 space-y-4">
            <FormField
              control={joinForm.control}
              name="roomId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="uppercase text-xs font-bold text-zinc-500 dark:text-secondary/70">
                    Server ID or Invite Link
                  </FormLabel>
                  <FormControl>
                    <Input
                      disabled={isLoading}
                      placeholder="!example:matrix.org or https://matrix.to/#/!room:server"
                      className="bg-zinc-300/50 border-0 focus-visible:ring-0 text-black focus-visible:ring-offset-0"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-zinc-500">
                    Invites usually look like !roomid:server.com or matrix.to links
                  </p>
                </FormItem>
              )}
            />

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>

          <div className="px-6 pb-6">
            <div className="flex justify-between">
              <Button variant="ghost" onClick={handleBack} disabled={isLoading} type="button">
                Back
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Joining..." : "Join Server"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );

  const renderTemplate = () => (
    <div className="space-y-6">
      <DialogHeader className="pt-6 px-6">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="mr-2 p-1"
            disabled={isLoading}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <DialogTitle className="text-2xl text-center font-bold text-zinc-800 dark:text-zinc-200">
              Choose a Template
            </DialogTitle>
            <DialogDescription className="text-center text-zinc-600 dark:text-zinc-400">
              Get started faster with pre-configured channels
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="px-6 space-y-3 max-h-64 overflow-y-auto">
        {SERVER_TEMPLATES.map((template) => (
          <div
            key={template.id}
            onClick={() => handleSelectTemplate(template)}
            className="flex items-start p-4 rounded-lg border-2 border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600 cursor-pointer transition-colors"
          >
            <div className="flex-shrink-0 w-10 h-10 bg-zinc-500 rounded-full flex items-center justify-center">
              {template.icon}
            </div>
            <div className="ml-4 flex-1 min-w-0">
              <h3 className="font-semibold text-zinc-800 dark:text-zinc-200">
                {template.name}
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                {template.description}
              </p>
              <div className="flex flex-wrap gap-1">
                {template.channels.slice(0, 4).map((channel) => (
                  <Badge key={channel.name} variant="secondary" className="text-xs">
                    {channel.emoji} {channel.name}
                  </Badge>
                ))}
                {template.channels.length > 4 && (
                  <Badge variant="secondary" className="text-xs">
                    +{template.channels.length - 4} more
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="px-6 pb-6">
        <Separator className="mb-4" />
        <div className="flex justify-between">
          <Button variant="ghost" onClick={handleBack} disabled={isLoading}>
            Back
          </Button>
          <Button variant="outline" onClick={handleSkipTemplate} disabled={isLoading}>
            Skip Template
          </Button>
        </div>
      </div>
    </div>
  );

  const renderCustomize = () => (
    <div className="space-y-6">
      <DialogHeader className="pt-6 px-6">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="mr-2 p-1"
            disabled={isLoading}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <DialogTitle className="text-2xl text-center font-bold text-zinc-800 dark:text-zinc-200">
              Customize Your Server
            </DialogTitle>
            <DialogDescription className="text-center text-zinc-600 dark:text-zinc-400">
              {selectedTemplate 
                ? `Using "${selectedTemplate.name}" template. You can change these settings later.`
                : "Give your server a personality with a name and avatar."
              }
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <Form {...createForm}>
        <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-6">
          <div className="px-6 space-y-6">
            {/* Avatar Upload */}
            <div className="flex items-center justify-center">
              <FormField
                control={createForm.control}
                name="avatar"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="w-32">
                        <FileUpload
                          onUploadComplete={handleAvatarUpload}
                          accept={["image/*"]}
                          maxSize={5 * 1024 * 1024} // 5MB
                          showPreview={true}
                          placeholder="Upload server avatar"
                          className="mx-auto"
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Server Name */}
            <FormField
              control={createForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="uppercase text-xs font-bold text-zinc-500 dark:text-secondary/70">
                    Server Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      disabled={isLoading}
                      placeholder="Enter server name"
                      className="bg-zinc-300/50 border-0 focus-visible:ring-0 text-black focus-visible:ring-offset-0"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Template Preview */}
            {selectedTemplate && (
              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4">
                <h4 className="font-semibold text-sm text-zinc-700 dark:text-zinc-300 mb-2">
                  Channels to be created:
                </h4>
                <div className="space-y-1">
                  {selectedTemplate.channels.map((channel) => (
                    <div key={channel.name} className="flex items-center text-sm text-zinc-600 dark:text-zinc-400">
                      <span className="mr-2">
                        {channel.type === 'text' && '#'}
                        {channel.type === 'audio' && <Mic className="h-3 w-3 inline" />}
                        {channel.type === 'video' && <Camera className="h-3 w-3 inline" />}
                      </span>
                      <span>{channel.emoji} {channel.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>

          <div className="bg-gray-100 dark:bg-gray-800 px-6 py-4">
            <div className="flex justify-between">
              <Button variant="ghost" onClick={handleBack} disabled={isLoading} type="button">
                Back
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Server"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );

  // =============================================================================
  // Main Render
  // =============================================================================

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white dark:bg-zinc-900 text-black dark:text-white p-0 overflow-hidden max-w-md">
        {currentStep === "choice" && renderChoice()}
        {currentStep === "create" && renderCreate()}
        {currentStep === "join" && renderJoin()}
        {currentStep === "template" && renderTemplate()}
        {currentStep === "customize" && renderCustomize()}
      </DialogContent>
    </Dialog>
  );
}