"use client";

import React from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";

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
import { MatrixFileUpload } from "@/components/matrix-file-upload";
import { useModal } from "@/hooks/use-modal-store";
import { getClient } from "@/lib/matrix/client";
import { useMatrixAuth } from "@/components/providers/matrix-auth-provider";

const formSchema = z.object({
  name: z.string().min(1, { message: "Server name is required." }),
  imageUrl: z.string().min(1, { message: "Server image is required." })
});

export function CreateServerModal() {
  const { isOpen, onClose, type } = useModal();
  const router = useRouter();
  const { session } = useMatrixAuth();

  const isModalOpen = isOpen && type === "createServer";

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      imageUrl: ""
    }
  });

  const isLoading = form.formState.isSubmitting;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const client = getClient();
      if (!client) {
        console.error("Matrix client not initialized");
        return;
      }

      console.log("[CreateServerModal] Creating Matrix space:", values.name);

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

      console.log("[CreateServerModal] Space created:", createResult.room_id);

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

      console.log("[CreateServerModal] General channel created:", generalChannel.room_id);

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

      console.log("[CreateServerModal] Channel linked to space");

      form.reset();
      router.refresh();
      onClose();
    } catch (error) {
      console.error("[CreateServerModal] Error creating server:", error);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-[#313338] text-white p-0 overflow-hidden">
        <DialogHeader className="pt-8 px-6">
          <DialogTitle className="text-2xl text-center font-bold text-white">
            Customize your server
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-400">
            Give your server a personality with a name and an image. You can
            always change it later.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-8 px-6">
              <div className="flex items-center justify-center text-center">
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
                          onError={(err) => console.error("Upload error:", err)}
                          disabled={isLoading}
                          placeholder="Upload server icon"
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
                    <FormLabel className="uppercase text-xs font-bold text-zinc-300">
                      Server Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        disabled={isLoading}
                        placeholder="Enter server name"
                        className="bg-[#2B2D31] border-0 focus-visible:ring-0 text-white focus-visible:ring-offset-0 placeholder:text-zinc-500"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="bg-[#2B2D31] px-6 py-4">
              <Button disabled={isLoading} className="bg-[#5865F2] hover:bg-[#4752C4] text-white">
                Create
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}