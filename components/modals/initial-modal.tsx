"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { X, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { useMatrixAuth } from "@/components/providers/matrix-auth-provider";
import { useMatrix } from "@/components/providers/matrix-provider";
import { getClient } from "@/lib/matrix/client";
import { MatrixFileUpload } from "@/components/matrix-file-upload";

// Make image optional - we'll use a default or generated avatar
const formSchema = z.object({
  name: z.string().min(1, { message: "Server name is required." }),
  imageUrl: z.string().optional()
});

export function InitialModal() {
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(true); // Open by default when this component is rendered
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { session } = useMatrixAuth();
  const { isReady, syncState, cryptoState } = useMatrix();

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      imageUrl: ""
    }
  });

  const isLoading = form.formState.isSubmitting;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setError(null);
    
    try {
      const client = getClient();
      if (!client) {
        setError("Matrix client not initialized. Please refresh the page.");
        return;
      }

      console.log("[InitialModal] Creating Matrix space:", values.name);

      // Build initial state events
      const initialState: any[] = [
        // E2EE is MANDATORY - all rooms must be encrypted
        {
          type: "m.room.encryption",
          state_key: "",
          content: { algorithm: "m.megolm.v1.aes-sha2" }
        },
        // Enable guest access (optional)
        {
          type: "m.room.guest_access",
          state_key: "",
          content: { guest_access: "can_join" }
        },
        // Set history visibility
        {
          type: "m.room.history_visibility",
          state_key: "",
          content: { history_visibility: "shared" }
        }
      ];

      // Add avatar if uploaded (mxc:// URL)
      if (values.imageUrl) {
        initialState.push({
          type: "m.room.avatar",
          state_key: "",
          content: { url: values.imageUrl }
        });
      }

      // Create a Matrix space (which is like a Discord server)
      const createResult = await client.createRoom({
        name: values.name,
        // Mark as a space (not a regular room)
        creation_content: {
          type: "m.space"
        },
        // Set initial power levels
        power_level_content_override: {
          users_default: 0,
          events_default: 0,
          state_default: 50,
          ban: 50,
          kick: 50,
          redact: 50,
          invite: 0
        },
        // Set visibility
        visibility: "private" as any,
        preset: "private_chat" as any,
        // Initial state events
        initial_state: initialState
      });

      console.log("[InitialModal] Space created:", createResult.room_id);

      // Create a default "general" channel within the space
      const generalChannel = await client.createRoom({
        name: "general",
        topic: "General discussion",
        visibility: "private" as any,
        preset: "private_chat" as any,
        initial_state: [
          // E2EE is MANDATORY - all rooms must be encrypted
          {
            type: "m.room.encryption",
            state_key: "",
            content: { algorithm: "m.megolm.v1.aes-sha2" }
          },
          // Link to parent space
          {
            type: "m.space.parent",
            state_key: createResult.room_id,
            content: {
              via: [session?.userId?.split(":")[1] || "matrix.org"],
              canonical: true
            }
          }
        ]
      });

      console.log("[InitialModal] General channel created:", generalChannel.room_id);

      // Add the channel to the space
      await client.sendStateEvent(
        createResult.room_id,
        "m.space.child" as any,
        {
          via: [session?.userId?.split(":")[1] || "matrix.org"],
          suggested: true,
          order: "0000"
        },
        generalChannel.room_id
      );

      console.log("[InitialModal] Channel linked to space");

      form.reset();
      setIsOpen(false);
      
      // Navigate to the new server/channel
      // URL-encode the Matrix room IDs since they contain special characters
      const encodedSpaceId = encodeURIComponent(createResult.room_id);
      const encodedChannelId = encodeURIComponent(generalChannel.room_id);
      
      router.push(`/servers/${encodedSpaceId}/channels/${encodedChannelId}`);
      router.refresh();
      
    } catch (err) {
      console.error("[InitialModal] Error creating space:", err);
      setError(err instanceof Error ? err.message : "Failed to create server");
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    // Navigate to DMs without creating a server
    router.push("/channels/@me");
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  // Show loading state while Matrix client initializes
  // This prevents "breaks after login" by ensuring the client is ready
  if (!isReady) {
    return (
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent className="bg-[#313338] text-white p-0 overflow-hidden">
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              Connecting to Matrix...
            </h2>
            <p className="text-sm text-zinc-400 text-center">
              {cryptoState.status === "initializing" 
                ? "Setting up end-to-end encryption..."
                : syncState 
                  ? `Syncing: ${syncState}`
                  : "Initializing secure connection..."}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="bg-[#313338] text-white p-0 overflow-hidden">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground text-zinc-400 hover:text-white"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        <DialogHeader className="pt-8 px-6">
          <DialogTitle className="text-2xl text-center font-bold text-white">
            Create your first server
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-400">
            Create a Matrix space to get started. You can customize it later.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-8 px-6">
              {error && (
                <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md">
                  {error}
                </div>
              )}
              
              {/* Server Icon Upload */}
              <div className="flex items-center justify-center">
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
                          onError={(err) => setError(err)}
                          disabled={isLoading}
                          placeholder="Upload server icon (optional)"
                          maxSize={4 * 1024 * 1024}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="uppercase text-xs font-bold text-zinc-400">
                      Server Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        disabled={isLoading}
                        placeholder="My Awesome Server"
                        className="bg-[#1e1f22] border-0 focus-visible:ring-0 text-white placeholder-zinc-500 focus-visible:ring-offset-0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="bg-[#2b2d31] px-6 py-4">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                disabled={isLoading}
              >
                Skip for now
              </Button>
              <Button disabled={isLoading} variant="primary">
                {isLoading ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
