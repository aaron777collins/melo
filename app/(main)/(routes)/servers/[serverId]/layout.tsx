import React from "react";
import { redirect } from "next/navigation";

import { ServerSidebar } from "@/components/server/server-sidebar";
import { getSessionCookie } from "@/lib/matrix/cookies";

export default async function ServerIdLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ serverId: string }>;
}) {
  // Next.js 15: params is async and must be awaited
  const { serverId } = await params;
  
  // Get session from cookies (properly decoded)
  const session = await getSessionCookie();
  
  if (!session?.accessToken) {
    return redirect("/sign-in");
  }
  
  // Decode the Matrix space ID
  const spaceId = decodeURIComponent(serverId);

  return (
    <div className="h-full">
      {/* Server sidebar positioned after the 72px spaces nav */}
      <div className="hidden md:flex h-full w-60 z-20 flex-col fixed inset-y-0 left-[72px]">
        <ServerSidebar serverId={spaceId} />
      </div>
      {/* Main content offset by the 240px server sidebar */}
      <main className="h-full md:pl-60">{children}</main>
    </div>
  );
}
