"use client";

import React, { useEffect } from "react";
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

const formSchema = z.object({
  name: z.string().min(1, { message: "Server name is required." }),
  imageUrl: z.string().min(1, { message: "Server image is required." })
});

export function EditServerModal() {
  const { isOpen, onClose, type, data } = useModal();
  const router = useRouter();

  const isModalOpen = isOpen && type === "editServer";
  const { server, space } = data;

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      imageUrl: ""
    }
  });

  useEffect(() => {
    if (server) {
      form.setValue("name", server.name);
      form.setValue("imageUrl", server.imageUrl);
    } else if (space) {
      form.setValue("name", space.name);
      form.setValue("imageUrl", space.avatarUrl || "");
    }
  }, [server, space, form]);

  const isLoading = form.formState.isSubmitting;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const client = getClient();
      if (!client) {
        console.error("Matrix client not initialized");
        return;
      }

      const serverId = server?.id || space?.id;
      if (!serverId) return;

      const decodedServerId = decodeURIComponent(serverId);

      // Update space/room name
      if (values.name !== (server?.name || space?.name)) {
        await client.setRoomName(decodedServerId, values.name);
      }

      // Update space/room avatar
      if (values.imageUrl && values.imageUrl !== (server?.imageUrl || space?.avatarUrl)) {
        await client.sendStateEvent(
          decodedServerId,
          "m.room.avatar",
          {
            url: values.imageUrl
          }
        );
      }

      form.reset();
      router.refresh();
      onClose();
    } catch (error) {
      console.error("Failed to update server:", error);
    }
  };

  const handleClose = () => {
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
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}