import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

import { currentProfile } from "@/lib/current-profile";
import { getMatrixClient } from "@/lib/matrix-client";

export async function POST(req: Request) {
  try {
    const { name, imageUrl } = await req.json();
    const profile = await currentProfile();
    const client = getMatrixClient();

    if (!profile || !client) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Create a Matrix Space (equivalent to Discord Server)
    const spaceCreation = await client.createRoom({
      creation_content: {
        type: "m.space"
      },
      name: name,
      topic: `Space for ${name}`,
      initial_state: [
        {
          type: "m.room.avatar",
          state_key: "",
          content: {
            url: imageUrl
          }
        }
      ],
      power_level_content_override: {
        users: {
          [profile.userId]: 100 // Make creator admin
        }
      }
    });

    const spaceId = spaceCreation.room_id;

    // Create a default "general" room in the space
    const generalRoom = await client.createRoom({
      name: "general",
      topic: "General discussion",
      initial_state: [
        {
          type: "m.space.parent",
          state_key: spaceId,
          content: {
            canonical: true,
            via: [client.getDomain() || "matrix.org"]
          }
        }
      ]
    });

    // Add the general room to the space
    await client.sendStateEvent(spaceId, "m.space.child", generalRoom.room_id, {
      via: [client.getDomain() || "matrix.org"]
    });

    // Return server data in Discord-like format for UI compatibility
    const server = {
      id: spaceId,
      name,
      imageUrl,
      inviteCode: uuidv4(), // Generate a placeholder invite code
      profileId: profile.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      channels: [
        {
          id: generalRoom.room_id,
          name: "general",
          type: "TEXT",
          profileId: profile.id,
          serverId: spaceId,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
      members: [
        {
          id: uuidv4(),
          role: "ADMIN",
          profileId: profile.id,
          serverId: spaceId,
          createdAt: new Date(),
          updatedAt: new Date(),
          profile: profile
        }
      ]
    };

    return NextResponse.json(server);
  } catch (error) {
    console.error("[SERVERS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
