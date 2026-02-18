import { redirect } from "next/navigation";

import { currentProfile } from "@/lib/current-profile";
import { getMatrixClient } from "@/lib/matrix-client";

interface ServerIdPageProps {
  params: {
    serverId: string;
  };
}

export default async function ServerIdPage({ params }: ServerIdPageProps) {
  const profile = await currentProfile();

  if (!profile) {
    redirect("/sign-in");
    return;
  }

  const client = getMatrixClient();
  if (!client) {
    redirect("/sign-in");
    return;
  }

  // Get the space (server) and find a default channel
  const space = client.getRoom(params.serverId);
  if (!space || !space.hasMembershipState(client.getUserId() || "", "join")) {
    redirect("/");
    return;
  }

  // Find child rooms (channels) in this space
  const spaceChildren = space.getCanonicalAlias() || space.roomId;
  const rooms = client.getRooms().filter(room => {
    // In a real Matrix setup, we'd check the space relationship
    // For now, we'll use a simple heuristic or find the first room
    return room.getType() === "m.room" && room !== space;
  });

  // Find a general channel or use the first available channel
  const generalChannel = rooms.find(room => 
    room.name?.toLowerCase().includes("general") || 
    room.getCanonicalAlias()?.includes("general")
  );
  
  const initialChannel = generalChannel || rooms[0];

  if (initialChannel) {
    return redirect(`/servers/${params.serverId}/channels/${initialChannel.roomId}`);
  }

  // If no channels found, stay on server page
  return (
    <div className="flex flex-col h-full items-center justify-center text-gray-500">
      <p>No channels available in this server</p>
    </div>
  );
}
