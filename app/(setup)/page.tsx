import React from "react";
import { redirect } from "next/navigation";

import { initialProfile } from "@/lib/initial-profile";
import { getMatrixClient } from "@/lib/matrix-client";
import { InitialModal } from "@/components/modals/initial-modal";

export default async function SetupPage() {
  const profile = await initialProfile();

  const client = getMatrixClient();
  if (!client) return redirect("/sign-in");

  // Get user's joined rooms and find spaces (servers)
  const rooms = client.getRooms();
  const spaces = rooms.filter(room => room.getType() === "m.space");
  
  // If user is in any spaces, redirect to the first one
  if (spaces.length > 0) {
    return redirect(`/servers/${spaces[0].roomId}`);
  }

  return <InitialModal />;
}
