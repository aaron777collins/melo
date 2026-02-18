import React from "react";
import { redirect } from "next/navigation";

import { currentProfile } from "@/lib/current-profile";
import { getMatrixClient } from "@/lib/matrix-client";

interface InviteCodPageProps {
  params: {
    inviteCode: string;
  };
}

export default async function InviteCodPage({
  params: { inviteCode }
}: InviteCodPageProps) {
  const profile = await currentProfile();

  if (!profile) return redirect("/sign-in");

  if (!inviteCode) return redirect("/");

  const client = getMatrixClient();
  if (!client) return redirect("/sign-in");

  try {
    // In Matrix, invite codes are typically room/space aliases or IDs
    // Try to resolve the invite code to a room/space ID
    let roomIdToJoin = inviteCode;
    
    // If it looks like an alias, resolve it
    if (inviteCode.startsWith('#')) {
      try {
        const roomIdResponse = await client.getRoomIdForAlias(inviteCode);
        roomIdToJoin = roomIdResponse.room_id;
      } catch (error) {
        console.error("Failed to resolve room alias:", error);
        return redirect("/");
      }
    }

    // Check if user is already a member
    const existingRoom = client.getRoom(roomIdToJoin);
    if (existingRoom && existingRoom.hasMembershipState(client.getUserId() || "", "join")) {
      return redirect(`/servers/${roomIdToJoin}`);
    }

    // Try to join the room/space
    try {
      await client.joinRoom(roomIdToJoin);
      return redirect(`/servers/${roomIdToJoin}`);
    } catch (error) {
      console.error("Failed to join room:", error);
      return (
        <div className="h-full flex items-center justify-center">
          <div className="bg-white dark:bg-[#313338] p-8 rounded-lg shadow-md">
            <h1 className="text-xl font-bold text-center mb-4 text-gray-900 dark:text-white">
              Invalid Invite
            </h1>
            <p className="text-center text-gray-600 dark:text-gray-400">
              The invite link is invalid or has expired.
            </p>
          </div>
        </div>
      );
    }
  } catch (error) {
    console.error("Invite processing error:", error);
    return redirect("/");
  }
}
