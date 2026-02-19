import React from "react";
import { redirect } from "next/navigation";

import { UserSidebar } from "@/components/user/user-sidebar";
import { getSessionCookie } from "@/lib/matrix/cookies";

export default async function UserAreaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get session from cookies
  const session = await getSessionCookie();
  
  if (!session?.accessToken) {
    return redirect("/sign-in");
  }

  return (
    <div className="h-full">
      {/* User sidebar positioned after the 72px spaces nav */}
      <div className="hidden md:flex h-full w-60 z-20 flex-col fixed inset-y-0 left-[72px]">
        <UserSidebar />
      </div>
      {/* Main content offset by the 240px user sidebar */}
      <main className="h-full md:pl-60">{children}</main>
    </div>
  );
}