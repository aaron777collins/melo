import React from "react";
import { redirect } from "next/navigation";

import { currentProfile } from "@/lib/current-profile";
import { getMatrixClient } from "@/lib/matrix-client";

import { NavigationAction } from "@/components/navigation/navigation-action";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NavigationItem } from "@/components/navigation/navigation-item";
import { ModeToggle } from "@/components/mode-toggle";
import { MatrixUserButton } from "@/components/matrix-user-button";

export async function NavigationSidebar() {
  const profile = await currentProfile();

  if (!profile) return redirect("/login");

  const client = getMatrixClient();
  const servers: any[] = [];

  // Get Matrix spaces (servers) that the user is a member of
  if (client) {
    const rooms = client.getRooms();
    const spaces = rooms.filter(room => {
      const createEvent = room.currentState.getStateEvents("m.room.create")[0];
      return createEvent?.getContent()?.type === "m.space";
    });

    // Convert Matrix spaces to Discord-like server format
    servers.push(...spaces.map(space => ({
      id: space.roomId,
      name: space.name || "Unnamed Space",
      imageUrl: space.getAvatarUrl(client.getHomeserverUrl(), 48, 48, "crop") || "",
    })));
  }

  return (
    <div className="space-y-4 flex flex-col h-full items-center text-primary w-full dark:bg-[#1e1f22] bg-[#e3e5e8] py-3">
      <NavigationAction />
      <Separator className="h-[2px] bg-zinc-300 dark:bg-zinc-700 rounded-md w-10 mx-auto" />
      <ScrollArea className="flex-1 w-full">
        {servers.map((server) => (
          <div key={server.id} className="mb-4">
            <NavigationItem
              id={server.id}
              imageUrl={server.imageUrl}
              name={server.name}
            />
          </div>
        ))}
      </ScrollArea>
      <div className="pb-3 mt-auto flex items-center flex-col gap-y-4">
        <ModeToggle />
        <MatrixUserButton />
      </div>
    </div>
  );
}
