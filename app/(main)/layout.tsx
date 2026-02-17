import React from "react";

import { NavigationSidebar } from "@/components/navigation/navigation-sidebar";
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
        {/* Navigation sidebar - hidden on mobile, fixed on desktop */}
        <aside 
          id="navigation-sidebar"
          className="hidden md:flex h-full w-[72px] z-30 flex-col fixed inset-y-0"
          role="navigation"
          aria-label="Server and channel navigation"
        >
          <SectionErrorBoundary name="navigation-sidebar">
            <NavigationSidebar />
          </SectionErrorBoundary>
        </aside>

        {/* Main content area */}
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
