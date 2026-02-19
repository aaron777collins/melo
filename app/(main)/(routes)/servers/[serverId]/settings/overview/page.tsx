/**
 * Server Overview Settings Page
 * 
 * Full-page settings interface for server name, image, and basic configuration.
 * Provides Discord-style form layout with Matrix SDK integration.
 */

"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Loader2, Settings, Users, Hash } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { MatrixFileUpload } from "@/components/matrix-file-upload";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getClient } from "@/lib/matrix/client";
import { useSpaces } from "@/hooks/use-spaces";
import { getSpaceInitials } from "@/lib/matrix/types/space";
import { toast } from "sonner";

interface ServerOverviewPageProps {
  params: {
    serverId: string;
  };
}

const formSchema = z.object({
  name: z.string().min(1, { message: "Server name is required." }).max(100, { message: "Server name too long." }),
  description: z.string().max(500, { message: "Description too long." }).optional(),
  imageUrl: z.string().optional()
});

export default function ServerOverviewPage({ params }: ServerOverviewPageProps) {
  const { serverId } = params;
  const router = useRouter();
  const { spaces, isLoading: spacesLoading } = useSpaces();
  
  const [isLoading, setIsLoading] = useState(false);
  const [currentSpace, setCurrentSpace] = useState<any>(null);

  // Find the current space
  useEffect(() => {
    if (!spacesLoading && spaces.length > 0) {
      const space = spaces.find(s => s.id === serverId);
      setCurrentSpace(space || null);
    }
  }, [serverId, spaces, spacesLoading]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      imageUrl: ""
    }
  });

  // Update form when space data loads
  useEffect(() => {
    if (currentSpace) {
      form.setValue("name", currentSpace.name || "");
      form.setValue("description", currentSpace.topic || "");
      form.setValue("imageUrl", currentSpace.avatarUrl || "");
    }
  }, [currentSpace, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!currentSpace) return;

    try {
      setIsLoading(true);
      const client = getClient();
      
      if (!client) {
        toast.error("Matrix client not available");
        return;
      }

      const spaceId = decodeURIComponent(serverId);

      // Update space name if changed
      if (values.name !== currentSpace.name) {
        await client.setRoomName(spaceId, values.name);
      }

      // Update space description/topic if changed
      if (values.description !== currentSpace.topic) {
        await client.sendStateEvent(
          spaceId,
          "m.room.topic",
          {
            topic: values.description || ""
          }
        );
      }

      // Update space avatar if changed
      if (values.imageUrl && values.imageUrl !== currentSpace.avatarUrl) {
        await client.sendStateEvent(
          spaceId,
          "m.room.avatar",
          {
            url: values.imageUrl
          }
        );
      }

      toast.success("Server settings updated successfully");
      router.refresh();
    } catch (error) {
      console.error("Failed to update server settings:", error);
      toast.error("Failed to update server settings");
    } finally {
      setIsLoading(false);
    }
  };

  if (spacesLoading) {
    return (
      <div className="h-full p-6 bg-[#36393f]">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          </div>
        </div>
      </div>
    );
  }

  if (!currentSpace) {
    return (
      <div className="h-full p-6 bg-[#36393f]">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-[#2B2D31] border-zinc-800">
            <CardContent className="p-6">
              <p className="text-zinc-400">Server not found or you don't have permission to access it.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-6 bg-[#36393f]" data-testid="server-overview-page">
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">
            Server Overview
          </h1>
          <p className="text-zinc-400">
            Customize your server settings and appearance
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Server Identity Card */}
            <Card className="bg-[#2B2D31] border-zinc-800" data-testid="server-overview-card">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Server Identity
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Configure your server's name, description, and icon
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Server Icon Upload */}
                <div className="flex flex-col items-center space-y-4">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-20 w-20 rounded-2xl">
                      {currentSpace.avatarUrl ? (
                        <AvatarImage src={currentSpace.avatarUrl} alt={currentSpace.name} />
                      ) : null}
                      <AvatarFallback className="rounded-2xl bg-indigo-500 text-white text-2xl font-semibold">
                        {getSpaceInitials(currentSpace.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <FormField
                        control={form.control}
                        name="imageUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <MatrixFileUpload
                                type="image"
                                value={field.value}
                                onUpload={(mxcUrl) => field.onChange(mxcUrl)}
                                onClear={() => field.onChange("")}
                                onError={(err) => {
                                  console.error("Upload error:", err);
                                  toast.error("Failed to upload image");
                                }}
                                disabled={isLoading}
                                placeholder="Upload server icon"
                                maxSize={4 * 1024 * 1024} // 4MB max
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Server Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="uppercase text-xs font-bold text-zinc-300">
                        Server Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          disabled={isLoading}
                          placeholder="Enter server name"
                          className="bg-[#36393f] border-zinc-700 focus:border-indigo-500 text-white placeholder:text-zinc-500"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-zinc-500 text-xs">
                        This is how your server will appear to members.
                      </FormDescription>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                {/* Server Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="uppercase text-xs font-bold text-zinc-300">
                        Description
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          disabled={isLoading}
                          placeholder="Enter a description for your server (optional)"
                          className="bg-[#36393f] border-zinc-700 focus:border-indigo-500 text-white placeholder:text-zinc-500 resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-zinc-500 text-xs">
                        Help new members understand what your server is about.
                      </FormDescription>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Server Statistics Card */}
            <Card className="bg-[#2B2D31] border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Server Statistics
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Current server information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <Users className="h-4 w-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{currentSpace.memberCount}</p>
                      <p className="text-xs text-zinc-400">Members</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <Hash className="h-4 w-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{currentSpace.channels.length}</p>
                      <p className="text-xs text-zinc-400">Channels</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <Settings className="h-4 w-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {currentSpace.hasUnread ? 'Active' : 'Quiet'}
                      </p>
                      <p className="text-xs text-zinc-400">Status</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-8"
              >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}