import React from "react";
import { redirect } from "next/navigation";

import { currentProfile } from "@/lib/current-profile";
import { getMatrixClient } from "@/lib/matrix-client";
import { ServerSidebar } from "@/components/server/server-sidebar";

export default async function ServerIdLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { serverId: string };
}) {
  const profile = await currentProfile();

  if (!profile) {
    redirect("/sign-in");
    return;
  }

  // In Matrix, serverId is a space ID - check if user is a member
  const client = getMatrixClient();
  if (!client) {
    redirect("/sign-in");
    return;
  }

  // Check if the space/server exists and user is a member
  const space = client.getRoom(params.serverId);
  if (!space || !space.hasMembershipState(client.getUserId() || "", "join")) {
    redirect("/");
    return;
  }

  return (
    <div className="h-full">
      <div className="hidden md:flex h-full w-60 z-20 flex-col fixed inset-y-0">
        <ServerSidebar serverId={params.serverId} />
      </div>
      <main className="h-full md:pl-60">{children}</main>
    </div>
  );
}
