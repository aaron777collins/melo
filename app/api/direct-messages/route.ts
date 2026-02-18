import { NextResponse } from "next/server";
import { DirectMessage, MemberRole } from "@/types";

import { currentProfile } from "@/lib/current-profile";
import { getMatrixClient } from "@/lib/matrix-client";

const MESSAGES_BATCH = 10;

export async function GET(req: Request) {
  try {
    const profile = await currentProfile();
    const { searchParams } = new URL(req.url);

    const cursor = searchParams.get("cursor");
    const conversationId = searchParams.get("conversationId");

    if (!profile) return new NextResponse("Unauthorized", { status: 401 });

    if (!conversationId)
      return new NextResponse("Conversation ID Missing", { status: 400 });

    const client = getMatrixClient();
    if (!client) return new NextResponse("Unauthorized", { status: 401 });

    // For DM conversations, we need to find the actual Matrix room
    // The conversationId might be a constructed ID like "dm:user1:user2"
    let roomId = conversationId;
    
    // If it's a constructed DM ID, try to find the actual room
    if (conversationId.startsWith("dm:")) {
      const userIds = conversationId.replace("dm:", "").split(":");
      const dmRooms = client.getRooms().filter(room => {
        const members = room.getJoinedMembers();
        return members.length === 2 && 
               userIds.every(userId => members.some(m => m.userId === userId));
      });
      roomId = dmRooms[0]?.roomId || conversationId;
    }

    const room = client.getRoom(roomId);
    if (!room) {
      // Return empty messages if room doesn't exist yet
      return NextResponse.json({ items: [], nextCursor: null });
    }

    // Get room timeline events (messages)
    const timeline = room.getLiveTimeline();
    const timelineEvents = timeline.getEvents();
    
    // Filter for message events and convert to DirectMessage format
    const messages: DirectMessage[] = timelineEvents
      .filter(event => event.getType() === 'm.room.message')
      .slice(-MESSAGES_BATCH) // Take last N messages
      .reverse() // Show newest first
      .map(event => {
        const sender = event.getSender() || "";
        const senderUser = client.getUser(sender);
        
        return {
          id: event.getId() || "",
          content: event.getContent().body || "",
          fileUrl: event.getContent().url || null,
          memberId: sender,
          conversationId: conversationId,
          deleted: false,
          createdAt: new Date(event.getTs() || Date.now()),
          updatedAt: new Date(event.getTs() || Date.now()),
          member: {
            id: sender,
            role: MemberRole.GUEST, // DM rooms don't have roles
            profileId: sender,
            serverId: "", // DM rooms don't belong to servers
            profile: {
              id: sender,
              userId: sender,
              name: senderUser?.displayName || sender.replace(/@|:.*/g, ''),
              imageUrl: senderUser?.avatarUrl || "",
              email: "",
              createdAt: new Date(),
              updatedAt: new Date()
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        };
      });

    // For pagination, we'd need to implement Matrix pagination tokens
    let nextCursor = null;
    if (messages.length === MESSAGES_BATCH) {
      nextCursor = messages[messages.length - 1].id;
    }

    return NextResponse.json({ items: messages, nextCursor });
  } catch (error) {
    console.error("[DIRECT_MESSAGES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
