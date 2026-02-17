"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Download, Smartphone, Monitor, Zap, Wifi, Bell } from 'lucide-react';
import { useIsPWA } from '@/hooks/use-service-worker';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface InstallPromptProps {
  className?: string;
  variant?: 'banner' | 'card' | 'minimal';
  autoHide?: boolean;
  hideDelay?: number;
}

export function PWAInstallPrompt({ 
  className = "",
  variant = "banner",
  autoHide = true,
  hideDelay = 10000
}: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [userChoice, setUserChoice] = useState<string | null>(null);
  const isPWA = useIsPWA();

  useEffect(() => {
    // Don't show if already running as PWA
    if (isPWA) {
      setShowPrompt(false);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      
      console.log('[PWA Install] beforeinstallprompt fired');
      setDeferredPrompt(promptEvent);
      setShowPrompt(true);

      // Auto-hide after delay if enabled
      if (autoHide) {
        setTimeout(() => {
          setShowPrompt(false);
        }, hideDelay);
      }
    };

    const handleAppInstalled = () => {
      console.log('[PWA Install] App installed');
      setDeferredPrompt(null);
      setShowPrompt(false);
      setUserChoice('installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isPWA, autoHide, hideDelay]);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      console.warn('[PWA Install] No deferred prompt available');
      return;
    }

    try {
      setIsInstalling(true);
      
      // Show the install prompt
      await deferredPrompt.prompt();
      
      // Wait for the user to respond
      const choiceResult = await deferredPrompt.userChoice;
      console.log('[PWA Install] User choice:', choiceResult.outcome);
      
      setUserChoice(choiceResult.outcome);
      
      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA Install] User accepted the install prompt');
      } else {
        console.log('[PWA Install] User dismissed the install prompt');
      }
      
      // Clean up
      setDeferredPrompt(null);
      setShowPrompt(false);
      
    } catch (error) {
      console.error('[PWA Install] Error during install:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDeferredPrompt(null);
  };

  // Don't render if no prompt available, user already dismissed, or running as PWA
  if (!deferredPrompt || !showPrompt || isPWA) {
    return null;
  }

  if (variant === 'minimal') {
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <Card className="w-80 shadow-lg border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <Download className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Install Melo
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add to home screen for quick access
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleInstall}
                  disabled={isInstalling}
                  className="h-8 px-3 text-xs"
                >
                  {isInstalling ? 'Installing...' : 'Install'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div className={`fixed top-0 left-0 right-0 z-50 ${className}`}>
        <div className="bg-primary/10 border-b border-primary/20 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <Download className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Install Melo for a better experience
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Get offline access, faster loading, and push notifications
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleInstall}
                  disabled={isInstalling}
                >
                  {isInstalling ? 'Installing...' : 'Install App'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default card variant
  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <Card className="w-96 shadow-lg border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Install Melo</CardTitle>
              <Badge variant="secondary" className="text-xs">
                PWA
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-8 w-8 p-0 -mt-1 -mr-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Install Melo as a Progressive Web App for the best experience
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Smartphone className="h-3 w-3" />
              <span>Mobile optimized</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Monitor className="h-3 w-3" />
              <span>Desktop app-like</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Wifi className="h-3 w-3" />
              <span>Works offline</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Zap className="h-3 w-3" />
              <span>Faster loading</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Bell className="h-3 w-3" />
              <span>Push notifications</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Download className="h-3 w-3" />
              <span>No app store needed</span>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="pt-0">
          <div className="flex gap-2 w-full">
            <Button
              onClick={handleInstall}
              disabled={isInstalling}
              className="flex-1"
            >
              {isInstalling ? 'Installing...' : 'Install Now'}
            </Button>
            <Button
              variant="outline"
              onClick={handleDismiss}
              className="px-4"
            >
              Later
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

// Hook to access install prompt state
export function useInstallPrompt() {
  const [canInstall, setCanInstall] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const isPWA = useIsPWA();

  useEffect(() => {
    if (isPWA) {
      setCanInstall(false);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setInstallPrompt(promptEvent);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setCanInstall(false);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isPWA]);

  const install = async () => {
    if (!installPrompt) return;

    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      
      if (choice.outcome === 'accepted') {
        setCanInstall(false);
        setInstallPrompt(null);
      }
      
      return choice;
    } catch (error) {
      console.error('[PWA Install] Install failed:', error);
      throw error;
    }
  };

  return {
    canInstall,
    install,
    isPWA,
  };
}