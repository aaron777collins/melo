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
import { createChannel } from "@/lib/matrix/create-channel";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();

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
    const loadingToast = toast.loading("Creating channel...");
    
    try {
      // Get the server/space ID from params or data
      const serverId = space?.id || (params?.serverId as string);
      if (!serverId) {
        toast.dismiss(loadingToast);
        toast.error("No server ID found");
        return;
      }

      const result = await createChannel({
        name: values.name,
        type: values.type,
        spaceId: serverId,
        categoryId: categoryId,
        userId: session?.userId
      });

      toast.dismiss(loadingToast);

      if (result.success) {
        if (result.warning) {
          toast.error(`Channel created but with warning: ${result.warning}`, {
            duration: 10000
          });
        } else {
          toast.success("Channel created successfully!");
        }
        
        form?.reset();
        router.refresh();
        onClose();
      } else {
        const errorMessage = result.error?.message || "Failed to create channel";
        const retryAction = result.error?.retryable ? {
          label: "Retry",
          onClick: () => onSubmit(values)
        } : undefined;
        
        toast.error(`Failed to create channel: ${errorMessage}`, {
          action: retryAction,
          duration: 10000
        });
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(`Failed to create channel: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
