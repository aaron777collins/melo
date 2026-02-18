import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MatrixEvent } from "matrix-js-sdk";

import { useMatrix } from "@/components/providers/matrix-provider";
import { getMatrixClient } from "@/lib/matrix-client";

type ChatSocketProps = {
  addKey: string;
  updateKey: string;
  queryKey: string;
};

type MessageWithMemberWithProfile = {
  id: string;
  content: string;
  fileUrl?: string | null;
  member: {
    id: string;
    profileId: string;
    name: string;
    imageUrl: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  deleted: boolean;
};

export const useChatSocket = ({
  addKey,
  updateKey,
  queryKey
}: ChatSocketProps) => {
  const { client } = useMatrix();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!client) return;

    const handleRoomEvent = (event: MatrixEvent) => {
      if (event.getType() !== "m.room.message") return;

      const roomId = event.getRoomId();
      const content = event.getContent();
      const sender = event.getSender();
      const senderUser = client.getUser(sender || "");

      const message: MessageWithMemberWithProfile = {
        id: event.getId() || "",
        content: content.body || "",
        fileUrl: content.url || null,
        member: {
          id: sender || "",
          profileId: sender || "",
          name: senderUser?.displayName || sender?.replace(/@|:.*/g, '') || "",
          imageUrl: senderUser?.avatarUrl || "",
          role: "GUEST",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        createdAt: new Date(event.getTs()),
        updatedAt: new Date(event.getTs()),
        deleted: false
      };

      // Update the query cache with new message
      queryClient.setQueryData([queryKey], (oldData: any) => {
        if (!oldData || !oldData.pages || oldData.pages.length === 0) {
          return {
            pages: [
              {
                messages: [message]
              }
            ]
          };
        }

        const newData = [...oldData.pages];

        newData[0] = {
          ...newData[0],
          messages: [message, ...newData[0].messages]
        };

        return {
          ...oldData,
          pages: newData
        };
      });
    };

    const handleRoomEventUpdate = (event: MatrixEvent) => {
      if (event.getType() !== "m.room.message") return;

      const content = event.getContent();
      const sender = event.getSender();
      const senderUser = client.getUser(sender || "");

      const updatedMessage: MessageWithMemberWithProfile = {
        id: event.getId() || "",
        content: content.body || "",
        fileUrl: content.url || null,
        member: {
          id: sender || "",
          profileId: sender || "",
          name: senderUser?.displayName || sender?.replace(/@|:.*/g, '') || "",
          imageUrl: senderUser?.avatarUrl || "",
          role: "GUEST",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        createdAt: new Date(event.getTs()),
        updatedAt: new Date(event.getTs()),
        deleted: false
      };

      // Update existing message in cache
      queryClient.setQueryData([queryKey], (oldData: any) => {
        if (!oldData || !oldData.pages || oldData.pages.length === 0) {
          return oldData;
        }

        const newData = oldData.pages.map((page: any) => {
          return {
            ...page,
            messages: page.messages.map((item: MessageWithMemberWithProfile) => {
              if (item.id === updatedMessage.id) {
                return updatedMessage;
              }
              return item;
            })
          };
        });

        return {
          ...oldData,
          pages: newData
        };
      });
    };

    // Listen for new room events (new messages)
    client.on("Room.timeline", handleRoomEvent);
    
    // Listen for room event updates (edited messages)
    client.on("Room.localEchoUpdated", handleRoomEventUpdate);

    return () => {
      client.off("Room.timeline", handleRoomEvent);
      client.off("Room.localEchoUpdated", handleRoomEventUpdate);
    };
  }, [queryClient, addKey, queryKey, client, updateKey]);
};
