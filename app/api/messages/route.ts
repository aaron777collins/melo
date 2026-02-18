import { NextResponse } from "next/server";
import { Message, MemberRole } from "@/types";

import { currentProfile } from "@/lib/current-profile";
import { getMatrixClient } from "@/lib/matrix-client";

const MESSAGES_BATCH = 10;

export async function GET(req: Request) {
  try {
    const profile = await currentProfile();
    const { searchParams } = new URL(req.url);

    const cursor = searchParams.get("cursor");
    const channelId = searchParams.get("channelId");

    if (!profile) return new NextResponse("Unauthorized", { status: 401 });

    if (!channelId)
      return new NextResponse("Channel ID Missing", { status: 400 });

    const client = getMatrixClient();
    if (!client) return new NextResponse("Unauthorized", { status: 401 });

    const room = client.getRoom(channelId);
    if (!room) return new NextResponse("Channel not found", { status: 404 });

    // Get room timeline events (messages)
    const timeline = room.getLiveTimeline();
    const timelineEvents = timeline.getEvents();
    
    // Filter for message events and convert to our Message format
    const messages: Message[] = timelineEvents
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
          channelId: channelId,
          deleted: false,
          createdAt: new Date(event.getTs() || Date.now()),
          updatedAt: new Date(event.getTs() || Date.now()),
          member: {
            id: sender,
            role: MemberRole.GUEST, // Would get from room power levels
            profileId: sender,
            serverId: "", // Would need to determine from context
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
    // For now, return simple cursor-based on message count
    let nextCursor = null;
    if (messages.length === MESSAGES_BATCH) {
      nextCursor = messages[messages.length - 1].id;
    }

    return NextResponse.json({ items: messages, nextCursor });
  } catch (error) {
    console.error("[MESSAGES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
