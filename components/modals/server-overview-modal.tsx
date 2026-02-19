"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MatrixFileUpload } from "@/components/matrix-file-upload";
import { useModal } from "@/hooks/use-modal-store";
import { getClient } from "@/lib/matrix/client";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(1, { message: "Server name is required." }),
  imageUrl: z.string().optional(),
  description: z.string().optional()
});

export function ServerOverviewModal() {
  const { isOpen, onClose, type, data } = useModal();
  const router = useRouter();

  const isModalOpen = isOpen && type === "serverOverview";
  const { space } = data;

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      imageUrl: "",
      description: ""
    }
  });

  useEffect(() => {
    if (space) {
      form.setValue("name", space.name || "");
      form.setValue("imageUrl", space.avatarUrl || "");
      form.setValue("description", space.topic || "");
    }
  }, [space, form]);

  const isLoading = form.formState.isSubmitting;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const client = getClient();
      if (!client) {
        console.error("Matrix client not initialized");
        return;
      }

      if (!space?.id) return;

      const spaceId = decodeURIComponent(space.id);

      // Update space name if changed
      if (values.name !== space.name) {
        await client.setRoomName(spaceId, values.name);
      }

      // Update space avatar if changed
      if (values.imageUrl && values.imageUrl !== space.avatarUrl) {
        await client.sendStateEvent(
          spaceId,
          "m.room.avatar",
          {
            url: values.imageUrl
          }
        );
      }

      // Update space description/topic if changed
      if (values.description !== space.topic) {
        await client.sendStateEvent(
          spaceId,
          "m.room.topic",
          {
            topic: values.description || ""
          }
        );
      }

      toast.success("Server settings updated");
      form.reset();
      router.refresh();
      onClose();
    } catch (error) {
      console.error("Failed to update server:", error);
      toast.error("Failed to update server settings");
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
            Server Overview
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-400">
            Customize your server's identity and basic settings. Changes are saved immediately to Matrix.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-8 px-6">
              {/* Server Avatar Upload */}
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
                          maxSize={4 * 1024 * 1024} // 4MB max
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
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
                        className="bg-[#2B2D31] border-0 focus-visible:ring-0 text-white focus-visible:ring-offset-0 placeholder:text-zinc-500"
                        {...field}
                      />
                    </FormControl>
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
                        placeholder="Enter server description (optional)"
                        className="bg-[#2B2D31] border-0 focus-visible:ring-0 text-white focus-visible:ring-offset-0 placeholder:text-zinc-500 resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="bg-[#2B2D31] px-6 py-4">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                disabled={isLoading}
                className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading} 
                className="bg-[#5865F2] hover:bg-[#4752C4] text-white"
              >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}