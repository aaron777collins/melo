import React from "react";
import { redirect } from "next/navigation";

import { getSessionCookie } from "@/lib/matrix/cookies";
import { DMList } from "@/components/navigation/dm-list";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ClientWrapper } from "@/components/client-wrapper";
import { MessageCircle, Users, Search } from "lucide-react";

/**
 * Direct Messages page (/channels/@me)
 * 
 * Main content area that works with UserSidebar layout.
 * Shows DM list and welcome area with enhanced Discord-like functionality.
 */
export default async function DMPage() {
  // Get session from cookies
  const session = await getSessionCookie();
  
  if (!session?.accessToken || !session?.userId) {
    return redirect("/sign-in");
  }

  return (
    <div className="flex h-full">
      {/* DM List Area - positioned as main content */}
      <div className="flex flex-col h-full w-60 bg-[#2f3136] dark:bg-[#2f3136] border-r border-zinc-200 dark:border-zinc-800">
        {/* Header with actions */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <h1 className="text-lg font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Direct Messages
          </h1>
        </div>

        {/* Search bar */}
        <div className="px-3 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Find or start a conversation"
              className="w-full pl-10 pr-3 py-2 text-sm bg-zinc-700 dark:bg-zinc-700 text-zinc-200 placeholder-zinc-400 rounded-md border-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <Separator className="bg-zinc-200 dark:bg-zinc-700" />

        {/* DM List */}
        <ScrollArea className="flex-1">
          <ClientWrapper fallback={
            <div className="p-4 text-sm text-zinc-500 dark:text-zinc-400">
              Loading conversations...
            </div>
          }>
            <DMList />
          </ClientWrapper>
        </ScrollArea>
      </div>

      {/* Main content area - Welcome message or selected content */}
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-[#36393f]">
        <div className="text-center max-w-md mx-auto px-8">
          {/* Icon */}
          <div className="mx-auto w-32 h-32 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-6 shadow-lg">
            <MessageCircle className="w-16 h-16 text-white" />
          </div>
          
          {/* Welcome content */}
          <h2 className="text-3xl font-bold text-zinc-800 dark:text-zinc-200 mb-4">
            Your place to talk
          </h2>
          
          <p className="text-zinc-600 dark:text-zinc-400 mb-8 leading-relaxed">
            Select a conversation from the sidebar to start chatting, or start a new conversation with someone from your servers.
          </p>
          
          {/* Quick actions */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
              <Users className="h-5 w-5 text-indigo-500" />
              <div className="text-left flex-1">
                <p className="font-medium text-zinc-800 dark:text-zinc-200 text-sm">
                  Find friends from servers
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Click on any user in your servers to start a conversation
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
              <Search className="h-5 w-5 text-green-500" />
              <div className="text-left flex-1">
                <p className="font-medium text-zinc-800 dark:text-zinc-200 text-sm">
                  Search conversations
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Use the search bar above to quickly find existing chats
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}