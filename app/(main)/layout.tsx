import React from "react";

import { NavigationSidebar } from "@/components/navigation/navigation-sidebar";
import { SectionErrorBoundary, PageErrorBoundary } from "@/components/error-boundary";

export default async function MainLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full">
      <div className="hidden md:flex h-full w-[72px] z-30 flex-col fixed inset-y-0">
        <SectionErrorBoundary name="navigation-sidebar">
          <NavigationSidebar />
        </SectionErrorBoundary>
      </div>
      <main className="md:pl-[72px] h-full">
        <PageErrorBoundary name="main-content">
          {children}
        </PageErrorBoundary>
      </main>
    </div>
  );
}
