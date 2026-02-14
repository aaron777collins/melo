import React from "react";
import { redirect } from "next/navigation";

import { currentProfile } from "@/lib/current-profile";
import { DMList } from "@/components/navigation/dm-list";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

/**
 * Direct Messages page (/channels/@me)
 * 
 * Displays list of DM conversations, similar to Discord's DM list.
 * Allows users to:
 * - View existing DM conversations
 * - Start new conversations
 * - Quick search/filter DMs
 */
export default async function DMPage() {
  const profile = await currentProfile();

  if (!profile) {
    return redirect("/");
  }

  return (
    <div className="flex h-full">
      {/* Left sidebar - DM list */}
      <div className="flex flex-col h-full w-60 bg-[#2f3136] dark:bg-[#2f3136]">
        {/* Header */}
        <div className="flex items-center px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <h1 className="text-lg font-semibold text-zinc-700 dark:text-zinc-200">
            Direct Messages
          </h1>
        </div>

        {/* Search bar */}
        <div className="px-3 py-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Find or start a conversation"
              className="w-full px-3 py-2 text-sm bg-zinc-700 dark:bg-zinc-700 text-zinc-200 placeholder-zinc-400 rounded-md border-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <Separator className="bg-zinc-200 dark:bg-zinc-700" />

        {/* DM List */}
        <ScrollArea className="flex-1">
          <DMList />
        </ScrollArea>
      </div>

      {/* Right content area - Welcome message or selected DM */}
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-[#36393f]">
        <div className="text-center">
          <div className="mx-auto w-24 h-24 bg-indigo-500 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-12 h-12 text-white"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-200 mb-2">
            Welcome to Direct Messages
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 max-w-sm">
            Select a conversation to start chatting, or search for someone to start a new conversation.
          </p>
        </div>
      </div>
    </div>
  );
}