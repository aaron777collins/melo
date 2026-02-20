/**
 * Mobile Navigation Component
 * 
 * Provides comprehensive mobile navigation for MELO V2, ensuring all
 * navigation elements are accessible on mobile devices.
 * 
 * Addresses responsive issues found in p4-3-a, p4-3-b, p4-3-c:
 * - Ensures spaces navigation is accessible on mobile
 * - Provides touch-friendly navigation toggles
 * - Maintains consistent behavior across all routes
 */

'use client';

import React from 'react';
import { Menu, X, Hash, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { SpacesNavigation } from '@/components/navigation/spaces-navigation';
import { ServerSidebar } from '@/components/server/server-sidebar';

interface MobileNavigationProps {
  /**
   * Current server/space ID (if in a server context)
   */
  serverId?: string;
  /**
   * Show spaces navigation (server list)
   */
  showSpaces?: boolean;
  /**
   * Show server sidebar (channel list)
   */
  showServerSidebar?: boolean;
  /**
   * Show settings navigation
   */
  showSettings?: boolean;
  /**
   * Current route context
   */
  context?: 'server' | 'dm' | 'settings' | 'general';
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Main mobile navigation toggle button
 */
export function MobileNavigationToggle({ 
  serverId,
  showSpaces = true,
  showServerSidebar = true,
  showSettings = false,
  context = 'general',
  className
}: MobileNavigationProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  
  // Determine what navigation to show based on context
  const showSpacesNav = showSpaces && (context === 'server' || context === 'general');
  const showServerNav = showServerSidebar && serverId && context === 'server';
  
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn(
            // Only show on mobile/tablet
            "md:hidden",
            // Ensure proper touch target size
            "min-w-[44px] min-h-[44px]",
            // Visual styling
            "flex items-center justify-center",
            "hover:bg-accent",
            className
          )}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      
      <SheetContent 
        side="left" 
        className="p-0 flex gap-0 w-auto max-w-[90vw]"
        aria-label="Mobile navigation"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation Menu</SheetTitle>
        </SheetHeader>
        
        {/* Spaces Navigation Column */}
        {showSpacesNav && (
          <div className="w-[72px] h-full bg-[#1e1f22] dark:bg-[#1e1f22] flex flex-col">
            <ScrollArea className="flex-1">
              <SpacesNavigation />
            </ScrollArea>
          </div>
        )}
        
        {/* Server Sidebar Column */}
        {showServerNav && (
          <div className="w-60 h-full bg-card border-r">
            <ScrollArea className="flex-1">
              <ServerSidebar serverId={serverId!} />
            </ScrollArea>
          </div>
        )}
        
        {/* Settings Navigation (if no server context) */}
        {showSettings && !showServerNav && (
          <div className="w-60 h-full bg-card">
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Settings
              </h3>
              <div className="space-y-2">
                <Button variant="ghost" className="w-full justify-start min-h-[44px]">
                  Profile
                </Button>
                <Button variant="ghost" className="w-full justify-start min-h-[44px]">
                  Appearance
                </Button>
                <Button variant="ghost" className="w-full justify-start min-h-[44px]">
                  Notifications
                </Button>
                <Button variant="ghost" className="w-full justify-start min-h-[44px]">
                  Security
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Fallback navigation if no specific context */}
        {!showSpacesNav && !showServerNav && !showSettings && (
          <div className="w-60 h-full bg-card p-4">
            <h3 className="text-lg font-semibold mb-4">Navigation</h3>
            <div className="space-y-2">
              <Button variant="ghost" className="w-full justify-start min-h-[44px]">
                <Hash className="w-4 h-4 mr-2" />
                Direct Messages
              </Button>
              <Button variant="ghost" className="w-full justify-start min-h-[44px]">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/**
 * Responsive navigation wrapper that automatically shows appropriate navigation
 * based on route context
 */
interface ResponsiveNavigationProps {
  children: React.ReactNode;
  serverId?: string;
  context?: 'server' | 'dm' | 'settings' | 'general';
}

export function ResponsiveNavigation({ children, serverId, context }: ResponsiveNavigationProps) {
  return (
    <div className="h-full relative">
      {/* Mobile Navigation Toggle - positioned absolutely for consistent placement */}
      <div className="md:hidden absolute top-3 left-3 z-50">
        <MobileNavigationToggle
          serverId={serverId}
          context={context}
          showSpaces={context === 'server' || context === 'general'}
          showServerSidebar={!!serverId && context === 'server'}
          showSettings={context === 'settings'}
        />
      </div>
      
      {/* Main content */}
      {children}
    </div>
  );
}

/**
 * Enhanced mobile toggle specifically for server routes
 */
export function EnhancedMobileToggle({ serverId }: { serverId: string }) {
  return (
    <MobileNavigationToggle
      serverId={serverId}
      context="server"
      showSpaces={true}
      showServerSidebar={true}
      className="md:hidden"
    />
  );
}

/**
 * Mobile-optimized chat header that includes responsive navigation
 */
interface ResponsiveChatHeaderProps {
  serverId: string;
  name: string;
  type: "channel" | "conversation";
  imageUrl?: string;
  children?: React.ReactNode;
}

export function ResponsiveChatHeader({
  serverId,
  name,
  type,
  imageUrl,
  children
}: ResponsiveChatHeaderProps) {
  return (
    <div className="text-md font-semibold px-3 flex items-center h-12 border-neutral-200 dark:border-neutral-800 border-b-2">
      {/* Enhanced mobile toggle with full navigation */}
      <EnhancedMobileToggle serverId={serverId} />
      
      {/* Channel/conversation indicator */}
      {type === "channel" && (
        <Hash className="w-5 h-5 text-zinc-500 dark:text-zinc-400 mr-2" />
      )}
      
      {/* Name and additional content */}
      <p className="font-semibold text-md text-black dark:text-white truncate">
        {name}
      </p>
      
      {/* Right side content */}
      <div className="ml-auto flex items-center gap-2">
        {children}
      </div>
    </div>
  );
}

/**
 * Hook to provide responsive navigation state and helpers
 */
export function useResponsiveNavigation(context?: string) {
  const [isMobileNavOpen, setIsMobileNavOpen] = React.useState(false);
  const [screenSize, setScreenSize] = React.useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  
  React.useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setScreenSize('mobile');
      } else if (width < 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  
  return {
    isMobile: screenSize === 'mobile',
    isTablet: screenSize === 'tablet',
    isDesktop: screenSize === 'desktop',
    isMobileNavOpen,
    setIsMobileNavOpen,
    showMobileNav: screenSize !== 'desktop'
  };
}