import "./globals.css";
import { cn } from "@/lib/utils";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { ModalProvider } from "@/components/providers/modal-provider";
import { MatrixAuthProvider } from "@/components/providers/matrix-auth-provider";
import { MatrixProvider } from "@/components/providers/matrix-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { ServiceWorkerProvider } from "@/components/providers/service-worker-provider";
import { PWAInstallPrompt } from "@/components/pwa/install-prompt";
import { OnboardingWizardProvider } from "@/components/providers/onboarding-wizard-provider";
// NOTE: OnboardingProvider (tutorial modal) removed - consolidated into OnboardingWizardProvider
// Tutorial content now accessible from Settings > Tutorial
import { AppErrorBoundary, SectionErrorBoundary } from "@/components/error/error-boundary";
import { ErrorReportingProvider } from "@/hooks/use-error-reporting";
import { EnhancedErrorReportingProvider } from "@/components/providers/error-reporting-provider";

import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";

const openSans = Open_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Melo",
  description: "Home Automation OS - Discord-style interface for Matrix",
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Melo',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#5865f2',
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(openSans.className, "bg-white dark:bg-[#36393f]")}>
        <AppErrorBoundary>
          <EnhancedErrorReportingProvider>
            <ErrorReportingProvider config={{ 
              enableAutomaticReporting: process.env.NODE_ENV === 'production',
              enableUserFeedback: true,
              environment: process.env.NODE_ENV as any || 'development'
            }}>
            <ServiceWorkerProvider>
              <PWAInstallPrompt variant="minimal" />
              <ThemeProvider
                attribute="class"
                defaultTheme="dark"
                enableSystem
                storageKey="melo-theme"
              >
                <SectionErrorBoundary name="matrix-auth" enableAutoRecovery={true}>
                  <MatrixAuthProvider>
                    <SectionErrorBoundary name="onboarding" enableAutoRecovery={true}>
                      <OnboardingWizardProvider>
                          <SectionErrorBoundary name="matrix-client" enableAutoRecovery={true}>
                          <MatrixProvider>
                            <SectionErrorBoundary name="modals" enableAutoRecovery={false}>
                              <ModalProvider />
                            </SectionErrorBoundary>
                            <SectionErrorBoundary name="query-provider" enableAutoRecovery={true}>
                              <QueryProvider>{children}</QueryProvider>
                            </SectionErrorBoundary>
                          </MatrixProvider>
                        </SectionErrorBoundary>
                      </OnboardingWizardProvider>
                    </SectionErrorBoundary>
                  </MatrixAuthProvider>
                </SectionErrorBoundary>
              </ThemeProvider>
            </ServiceWorkerProvider>
            </ErrorReportingProvider>
          </EnhancedErrorReportingProvider>
        </AppErrorBoundary>
      </body>
    </html>
  );
}
