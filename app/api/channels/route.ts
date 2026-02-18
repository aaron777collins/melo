import { NextResponse } from "next/server";

import { currentProfile } from "@/lib/current-profile";
import { getMatrixClient } from "@/lib/matrix-client";

export async function POST(req: Request) {
  try {
    const profile = await currentProfile();
    const { name, type } = await req.json();
    const { searchParams } = new URL(req.url);
    const client = getMatrixClient();

    const serverId = searchParams.get("serverId");

    if (!profile || !client) return new NextResponse("Unauthorized", { status: 401 });

    if (!serverId)
      return new NextResponse("Server ID is Missing", { status: 400 });

    if (name === "general")
      return new NextResponse("Name cannot be 'general'", { status: 400 });

    // Check if user has permission in the space (serverId is spaceId in Matrix)
    const space = client.getRoom(serverId);
    if (!space) {
      return new NextResponse("Space not found", { status: 404 });
    }

    // Check user's power level in the space
    const powerLevels = space.currentState.getStateEvents("m.room.power_levels")[0];
    const userPowerLevel = powerLevels?.getContent()?.users?.[profile.userId] || 0;
    
    if (userPowerLevel < 50) { // Require at least moderator level
      return new NextResponse("Insufficient permissions", { status: 403 });
    }

    // Create a new room (channel) in Matrix
    const newRoom = await client.createRoom({
      name: name,
      topic: `${type === "VOICE" ? "Voice" : "Text"} channel in ${space.name}`,
      initial_state: [
        {
          type: "m.space.parent",
          state_key: serverId,
          content: {
            canonical: true,
            via: [client.getDomain() || "matrix.org"]
          }
        }
      ]
    });

    // Add the new room to the space
    await client.sendStateEvent(serverId, "m.space.child", newRoom.room_id, {
      via: [client.getDomain() || "matrix.org"]
    });

    // Return channel data in Discord-like format
    const channel = {
      id: newRoom.room_id,
      name,
      type,
      profileId: profile.id,
      serverId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Return updated space data (mimicking the server update)
    const server = {
      id: serverId,
      name: space.name,
      channels: [channel] // In a real implementation, you'd get all channels
    };

    return NextResponse.json(server);
  } catch (error) {
    console.error("[CHANNELS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
