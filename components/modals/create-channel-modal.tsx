"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useModal } from "@/hooks/use-modal-store";
import { useMatrixAuth } from "@/components/providers/matrix-auth-provider";
import { getClient } from "@/lib/matrix/client";
import { ChannelType } from "@/lib/melo-types";

const channelTypes = Object.values(ChannelType) as string[];

const formSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Channel name is required." })
    .refine((name) => name !== "general", {
      message: "Channel name cannot be 'general'"
    }),
  type: z.enum(["TEXT", "AUDIO", "VIDEO"])
});

export function CreateChannelModal() {
  const { isOpen, onClose, type, data } = useModal();
  const router = useRouter();
  const params = useParams();
  const { session } = useMatrixAuth();

  const isModalOpen = isOpen && type === "createChannel";
  const { channelType, categoryId, space } = data;

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "TEXT" as "TEXT" | "AUDIO" | "VIDEO"
    }
  });

  useEffect(() => {
    if (channelType && typeof channelType === "string") {
      const typeValue = channelType.toUpperCase();
      if (typeValue === "TEXT" || typeValue === "AUDIO" || typeValue === "VIDEO") {
        form?.setValue("type", typeValue);
      }
    } else {
      form?.setValue("type", "TEXT");
    }
  }, [channelType, form]);

  const isLoading = form?.formState?.isSubmitting || false;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const client = getClient();
      if (!client) {
        throw new Error("Matrix client not initialized");
      }

      // Get the server/space ID from params or data
      const serverId = space?.id || (params?.serverId as string);
      if (!serverId) {
        throw new Error("No server ID found");
      }

      // Decode the server ID if it's URL encoded
      const decodedServerId = decodeURIComponent(serverId);

      // Create the channel room
      const channelRoom = await client.createRoom({
        name: values.name,
        topic: `${values.type.toLowerCase()} channel`,
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
            state_key: decodedServerId,
            content: {
              via: [session?.userId?.split(":")[1] || "matrix.org"],
              canonical: true
            }
          },
          // Set channel type in custom state event
          {
            type: "melo.channel.type",
            state_key: "",
            content: { type: values.type }
          }
        ]
      });

      // Add the channel to the space
      await client.sendStateEvent(
        decodedServerId,
        "m.space.child" as any,
        {
          via: [session?.userId?.split(":")[1] || "matrix.org"],
          suggested: true,
          order: categoryId || ""
        },
        channelRoom.room_id
      );

      form?.reset();
      router.refresh();
      onClose();
    } catch (error) {
      console.error(error);
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
            Create Channel
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-8 px-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="uppercase text-xs font-bold text-zinc-300">
                      Channel Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        disabled={isLoading}
                        placeholder="Enter channel name"
                        className="bg-[#2B2D31] border-0 focus-visible:ring-0 text-white focus-visible:ring-offset-0 placeholder:text-zinc-500"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-300">Channel Type</FormLabel>
                    <Select
                      disabled={isLoading}
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-[#2B2D31] border-0 focus:ring-0 text-white ring-offset-0 focus:ring-offset-0 capitalize outline-none">
                          <SelectValue placeholder="Select a channel type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#2B2D31] border-zinc-600">
                        {channelTypes.map((channelTypeOption) => (
                          <SelectItem
                            key={channelTypeOption}
                            value={channelTypeOption}
                            className="capitalize text-white hover:bg-[#313338] focus:bg-[#313338]"
                          >
                            {channelTypeOption.toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
