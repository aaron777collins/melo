"use client";

import React, { useState, useId } from "react";
import { Member, Profile } from "@/lib/haos-types";
import { Users, X } from "lucide-react";

import { MemberSidebar } from "@/components/chat/member-sidebar";
import { ActionTooltip } from "@/components/action-tooltip";
import { SectionErrorBoundary } from "@/components/error-boundary";
import { useChatSwipeGestures } from "@/hooks/use-swipe-gestures";
import { useAccessibility } from "@/src/hooks/use-accessibility";
import { createKeyboardHandler } from "@/src/lib/accessibility";
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
  const { announce, effectivePreferences } = useAccessibility();
  
  // Generate unique IDs for accessibility
  const chatAreaId = useId();
  const memberSidebarId = useId();
  const toggleButtonId = useId();

  // Swipe gestures for mobile navigation
  const swipeRef = useChatSwipeGestures({
    onShowMembers: () => {
      if (members.length > 0 && showMembersToggle) {
        setShowMemberSidebar(true);
        announce("Member list opened", 'polite');
      }
    },
    onHideSidebar: () => {
      if (showMemberSidebar) {
        setShowMemberSidebar(false);
        announce("Member list closed", 'polite');
      }
    }
  });

  // Handle member sidebar toggle
  const handleMemberSidebarToggle = () => {
    const newState = !showMemberSidebar;
    setShowMemberSidebar(newState);
    announce(
      `Member list ${newState ? 'opened' : 'closed'}. ${newState ? 'Press Escape to close.' : ''}`, 
      'polite'
    );
  };

  // Keyboard shortcuts
  const handleKeyDown = createKeyboardHandler({
    'Escape': () => {
      if (showMemberSidebar) {
        setShowMemberSidebar(false);
        announce("Member list closed", 'polite');
      }
    },
    'Alt+M': () => {
      if (showMembersToggle && members.length > 0) {
        handleMemberSidebarToggle();
      }
    }
  });

  return (
    <div 
      className={cn(
        "flex h-full relative",
        effectivePreferences.reducedMotion && "respect-motion-preference",
        className
      )}
      onKeyDown={handleKeyDown}
      role="main"
      aria-label="Chat interface"
    >
      {/* Main content area with swipe gestures */}
      <main 
        id={chatAreaId}
        ref={swipeRef as React.RefObject<HTMLDivElement>}
        className={cn(
          "flex-1 flex flex-col",
          effectivePreferences.reducedMotion ? "" : "transition-all duration-200",
          showMemberSidebar && showMembersToggle 
            ? "mr-0 lg:mr-60" // Make space for sidebar on large screens
            : "mr-0"
        )}
        role="region"
        aria-label="Chat messages and input"
        aria-describedby={showMemberSidebar ? memberSidebarId : undefined}
      >
        {children}
        
        {/* Member toggle button - floating on mobile, integrated on desktop */}
        {showMembersToggle && members.length > 0 && (
          <div className="absolute top-2 right-2 z-10 lg:hidden">
            <ActionTooltip
              label={showMemberSidebar ? "Hide Members (Alt+M)" : "Show Members (Alt+M)"}
              side="left"
            >
              <button
                id={toggleButtonId}
                onClick={handleMemberSidebarToggle}
                className={cn(
                  "p-2 bg-zinc-900/80 hover:bg-zinc-900 text-white rounded-md transition-colors focus-enhanced",
                  effectivePreferences.highContrast && "high-contrast-button"
                )}
                aria-label={showMemberSidebar ? "Hide member list" : "Show member list"}
                aria-expanded={showMemberSidebar}
                aria-controls={memberSidebarId}
                aria-keyshortcuts="Alt+M"
              >
                {showMemberSidebar ? (
                  <X className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Users className="h-4 w-4" aria-hidden="true" />
                )}
                <span className="sr-only">
                  {showMemberSidebar ? 'Hide' : 'Show'} member list. 
                  {members.length} members, {onlineMembers.length} online.
                </span>
              </button>
            </ActionTooltip>
          </div>
        )}
      </main>

      {/* Member sidebar - toggleable */}
      {showMembersToggle && showMemberSidebar && members.length > 0 && (
        <>
          {/* Mobile overlay */}
          <div 
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => {
              setShowMemberSidebar(false);
              announce("Member list closed", 'polite');
            }}
            aria-hidden="true"
          />
          
          {/* Sidebar */}
          <aside 
            id={memberSidebarId}
            className={cn(
              "fixed right-0 top-0 bottom-0 z-30",
              "lg:relative lg:z-auto",
              "w-60 flex-shrink-0",
              effectivePreferences.reducedMotion ? "" : "transition-transform duration-200",
              effectivePreferences.highContrast && "high-contrast-bg high-contrast-border"
            )}
            role="complementary"
            aria-label={`Member list - ${members.length} members, ${onlineMembers.length} online`}
            aria-live="polite"
          >
            <SectionErrorBoundary name="member-sidebar">
              <MemberSidebar 
                members={members}
                onlineMembers={onlineMembers}
                className="h-full border-l border-zinc-200 dark:border-zinc-800"
              />
            </SectionErrorBoundary>
            
            {/* Desktop close button */}
            <div className="hidden lg:block absolute top-2 left-2">
              <ActionTooltip label="Hide Members (Escape)" side="left">
                <button
                  onClick={() => {
                    setShowMemberSidebar(false);
                    announce("Member list closed", 'polite');
                  }}
                  className={cn(
                    "p-1 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors focus-enhanced",
                    effectivePreferences.highContrast && "high-contrast-button"
                  )}
                  aria-label="Close member list"
                  aria-keyshortcuts="Escape"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </ActionTooltip>
            </div>
          </aside>
        </>
      )}

      {/* Desktop member toggle button when sidebar is hidden */}
      {showMembersToggle && !showMemberSidebar && members.length > 0 && (
        <div className="hidden lg:flex absolute top-2 right-2 z-10">
          <ActionTooltip label="Show Members (Alt+M)" side="left">
            <button
              onClick={handleMemberSidebarToggle}
              className={cn(
                "p-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-md transition-colors focus-enhanced",
                effectivePreferences.highContrast && "high-contrast-button"
              )}
              aria-label={`Show member list. ${members.length} members available.`}
              aria-expanded={false}
              aria-controls={memberSidebarId}
              aria-keyshortcuts="Alt+M"
            >
              <Users className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">
                Show member list. {members.length} members, {onlineMembers.length} online.
              </span>
            </button>
          </ActionTooltip>
        </div>
      )}

      {/* Screen reader shortcuts help */}
      <div className="sr-only" role="region" aria-label="Keyboard shortcuts">
        <p>Keyboard shortcuts for chat interface:</p>
        <ul>
          <li>Alt+M: Toggle member list</li>
          <li>Escape: Close member list</li>
          <li>Tab: Navigate between interface elements</li>
        </ul>
      </div>
    </div>
  );
}