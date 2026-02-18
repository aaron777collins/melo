import { useInfiniteQuery } from "@tanstack/react-query";
import { getMatrixClient } from "@/lib/matrix-client";
import { useMatrix } from "@/components/providers/matrix-provider";

interface ChatQueryProps {
  queryKey: string;
  apiUrl: string;
  paramKey: "channelId" | "conversationId";
  paramValue: string;
}

export const useChatQuery = ({
  queryKey,
  apiUrl,
  paramKey,
  paramValue
}: ChatQueryProps) => {
  const { isConnected } = useMatrix();

  const fetchMessages = async ({ pageParam = undefined }) => {
    const client = getMatrixClient();
    if (!client) {
      throw new Error("Matrix client not available");
    }

    // In Matrix, channelId maps to roomId
    const roomId = paramValue;
    
    try {
      // Get the room
      const room = client.getRoom(roomId);
      if (!room) {
        return { messages: [], nextCursor: null };
      }

      // Get messages from the room
      // Matrix room timeline is already loaded, but we might need to paginate
      const timeline = room.getLiveTimeline();
      const events = timeline.getEvents();
      
      // Filter for message events and format them
      const messages = events
        .filter(event => event.getType() === "m.room.message")
        .map(event => {
          const content = event.getContent();
          const sender = event.getSender();
          const senderUser = client.getUser(sender || "");
          
          return {
            id: event.getId() || "",
            content: content.body || "",
            fileUrl: content.url || null,
            member: {
              id: sender || "",
              profileId: sender || "",
              name: senderUser?.displayName || sender?.replace(/@|:.*/g, '') || "",
              imageUrl: senderUser?.avatarUrl || "",
              role: "GUEST", // Matrix doesn't have same role system
              createdAt: new Date(),
              updatedAt: new Date()
            },
            createdAt: new Date(event.getTs()),
            updatedAt: new Date(event.getTs()),
            deleted: false
          };
        })
        .reverse(); // Matrix events are in reverse chronological order

      return {
        messages,
        nextCursor: null // For now, we'll implement pagination later
      };
    } catch (error) {
      console.error("Error fetching Matrix room messages:", error);
      return { messages: [], nextCursor: null };
    }
  };

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useInfiniteQuery({
      queryKey: [queryKey, paramValue],
      queryFn: fetchMessages,
      getNextPageParam: (lastPage) => lastPage?.nextCursor,
      refetchInterval: isConnected ? false : 1000,
      enabled: !!getMatrixClient() && !!paramValue
    });

  return { data, fetchNextPage, hasNextPage, isFetchingNextPage, status };
};
