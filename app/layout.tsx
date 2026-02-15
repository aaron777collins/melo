import "./globals.css";
import { cn } from "@/lib/utils";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { ModalProvider } from "@/components/providers/modal-provider";
import { MatrixAuthProvider } from "@/components/providers/matrix-auth-provider";
import { MatrixProvider } from "@/components/providers/matrix-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { AppErrorBoundary, SectionErrorBoundary } from "@/components/error-boundary";

import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";

const openSans = Open_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HAOS",
  description: "Home Automation OS - Discord-style interface for Matrix"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(openSans.className, "bg-white dark:bg-[#313338]")}>
        <AppErrorBoundary>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            storageKey="haos-theme"
          >
            <SectionErrorBoundary name="matrix-auth">
              <MatrixAuthProvider>
                <SectionErrorBoundary name="matrix-client">
                  <MatrixProvider>
                    <SectionErrorBoundary name="modals">
                      <ModalProvider />
                    </SectionErrorBoundary>
                    <SectionErrorBoundary name="query-provider">
                      <QueryProvider>{children}</QueryProvider>
                    </SectionErrorBoundary>
                  </MatrixProvider>
                </SectionErrorBoundary>
              </MatrixAuthProvider>
            </SectionErrorBoundary>
          </ThemeProvider>
        </AppErrorBoundary>
      </body>
    </html>
  );
}
