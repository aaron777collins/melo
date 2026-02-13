"use client";

import React, { useState } from "react";
import { Member, Profile } from "@prisma/client";
import { Users, X } from "lucide-react";

import { MemberSidebar } from "@/components/chat/member-sidebar";
import { ActionTooltip } from "@/components/action-tooltip";
import { cn } from "@/lib/utils";

interface ChatLayoutProps {
  children: React.ReactNode;
  members?: (Member & { profile: Profile })[];
  onlineMembers?: string[];
  showMembersToggle?: boolean;
  className?: string;
}

/**
 * Discord-style chat layout with toggleable member sidebar
 * 
 * Layout structure:
 * [Main Content Area] [Member Sidebar - toggleable]
 * 
 * Features:
 * - Toggleable member sidebar (240px wide)
 * - Responsive - hides on mobile, shows on desktop
 * - Smooth transitions when toggling
 * - Member list with online/offline status
 */
export function ChatLayout({ 
  children, 
  members = [], 
  onlineMembers = [],
  showMembersToggle = true,
  className 
}: ChatLayoutProps) {
  const [showMemberSidebar, setShowMemberSidebar] = useState(true);

  return (
    <div className={cn("flex h-full relative", className)}>
      {/* Main content area */}
      <div className={cn(
        "flex-1 flex flex-col transition-all duration-200",
        showMemberSidebar && showMembersToggle 
          ? "mr-0 lg:mr-60" // Make space for sidebar on large screens
          : "mr-0"
      )}>
        {children}
        
        {/* Member toggle button - floating on mobile, integrated on desktop */}
        {showMembersToggle && members.length > 0 && (
          <div className="absolute top-2 right-2 z-10 lg:hidden">
            <ActionTooltip
              label={showMemberSidebar ? "Hide Members" : "Show Members"}
              side="left"
            >
              <button
                onClick={() => setShowMemberSidebar(!showMemberSidebar)}
                className="p-2 bg-zinc-900/80 hover:bg-zinc-900 text-white rounded-md transition-colors"
              >
                {showMemberSidebar ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Users className="h-4 w-4" />
                )}
              </button>
            </ActionTooltip>
          </div>
        )}
      </div>

      {/* Member sidebar - toggleable */}
      {showMembersToggle && showMemberSidebar && members.length > 0 && (
        <>
          {/* Mobile overlay */}
          <div 
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setShowMemberSidebar(false)}
          />
          
          {/* Sidebar */}
          <div className={cn(
            "fixed right-0 top-0 bottom-0 z-30 transition-transform duration-200",
            "lg:relative lg:z-auto",
            "w-60 flex-shrink-0"
          )}>
            <MemberSidebar 
              members={members}
              onlineMembers={onlineMembers}
              className="h-full border-l border-zinc-200 dark:border-zinc-800"
            />
            
            {/* Desktop close button */}
            <div className="hidden lg:block absolute top-2 left-2">
              <ActionTooltip label="Hide Members" side="left">
                <button
                  onClick={() => setShowMemberSidebar(false)}
                  className="p-1 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </ActionTooltip>
            </div>
          </div>
        </>
      )}

      {/* Desktop member toggle button when sidebar is hidden */}
      {showMembersToggle && !showMemberSidebar && members.length > 0 && (
        <div className="hidden lg:flex absolute top-2 right-2 z-10">
          <ActionTooltip label="Show Members" side="left">
            <button
              onClick={() => setShowMemberSidebar(true)}
              className="p-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-md transition-colors"
            >
              <Users className="h-4 w-4" />
            </button>
          </ActionTooltip>
        </div>
      )}
    </div>
  );
}