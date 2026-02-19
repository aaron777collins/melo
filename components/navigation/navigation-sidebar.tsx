"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

import { NavigationAction } from "@/components/navigation/navigation-action";
import { NavigationItem } from "@/components/navigation/navigation-item";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ModeToggle } from "@/components/mode-toggle";
import { UserPanel } from "@/components/navigation/user-panel";
import { useSpaces } from "@/hooks/use-spaces";
import { useMatrixAuth } from "@/components/providers/matrix-auth-provider";

export function NavigationSidebar() {
  const { user, isLoading } = useMatrixAuth();
  const { spaces, isLoading: spacesLoading } = useSpaces();
  const router = useRouter();

  // Redirect if not authenticated (matches Discord clone pattern)
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/");
    }
  }, [isLoading, user, router]);

  // Don't render if not authenticated
  if (!isLoading && !user) {
    return null;
  }

  // Show loading state while data loads
  if (isLoading || spacesLoading) {
    return (
      <div className="space-y-4 flex flex-col h-full items-center text-primary w-full dark:bg-[#1e1f22] bg-[#e3e5e8] py-3">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse bg-zinc-700 dark:bg-zinc-700 h-[48px] w-[48px] rounded-[24px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 flex flex-col h-full items-center text-primary w-full dark:bg-[#1e1f22] bg-[#e3e5e8] py-3">
      <NavigationAction />
      <Separator className="h-[2px] bg-zinc-300 dark:bg-zinc-700 rounded-md w-10 mx-auto" />
      <ScrollArea className="flex-1 w-full">
        {spaces.map((space) => (
          <div key={space.id} className="mb-4">
            <NavigationItem
              id={space.id}
              imageUrl={space.avatarUrl}
              name={space.name}
              hasUnread={space.hasUnread}
              mentionCount={space.mentionCount}
            />
          </div>
        ))}
      </ScrollArea>
      <div className="pb-3 mt-auto flex items-center flex-col gap-y-4">
        <ModeToggle />
        <UserPanel />
      </div>
    </div>
  );
}