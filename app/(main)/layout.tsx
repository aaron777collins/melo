import React from "react";

import { SpacesNavigation } from "@/components/navigation/spaces-navigation";
import { SectionErrorBoundary, PageErrorBoundary } from "@/components/error-boundary";
import { SkipNavigation, LiveRegions, KeyboardNavigationHints } from "@/src/components/accessibility/skip-navigation";

export default async function MainLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Skip navigation links for keyboard users */}
      <SkipNavigation />
      
      {/* Live regions for screen reader announcements */}
      <LiveRegions />
      
      {/* Keyboard navigation help for screen readers */}
      <KeyboardNavigationHints />
      
      <div className="h-full" role="application" aria-label="Melo Chat Application">
        {/* Spaces Navigation - Discord-style server list on far left (72px) */}
        <aside 
          id="spaces-navigation"
          className="hidden md:flex h-full w-[72px] z-30 flex-col fixed inset-y-0 left-0"
          role="navigation"
          aria-label="Spaces navigation"
        >
          <SectionErrorBoundary name="spaces-navigation">
            <SpacesNavigation />
          </SectionErrorBoundary>
        </aside>

        {/* Main content area - only offset by the 72px nav sidebar */}
        {/* Child routes (servers, @me) handle their own secondary sidebars */}
        <div className="md:pl-[72px] h-full">
          <main 
            id="main-content"
            className="h-full"
            role="main"
            aria-label="Chat interface main content"
            tabIndex={-1} // Allow programmatic focus for skip links
          >
            <PageErrorBoundary name="main-content">
              {children}
            </PageErrorBoundary>
          </main>
        </div>
      </div>
    </>
  );
}
