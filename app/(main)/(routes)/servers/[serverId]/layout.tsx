import React from "react";
import { redirect } from "next/navigation";

import { ServerSidebar } from "@/components/server/server-sidebar";
import { getSessionCookie } from "@/lib/matrix/cookies";

export default async function ServerIdLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { serverId: string };
}) {
  // Get session from cookies (properly decoded)
  const session = await getSessionCookie();
  
  if (!session?.accessToken) {
    return redirect("/sign-in");
  }
  
  // Decode the Matrix space ID
  const spaceId = decodeURIComponent(params.serverId);

  return (
    <div className="h-full">
      <div className="hidden md:flex h-full w-60 z-20 flex-col fixed inset-y-0">
        <ServerSidebar serverId={spaceId} />
      </div>
      <main className="h-full md:pl-60">{children}</main>
    </div>
  );
}
