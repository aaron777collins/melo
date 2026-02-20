/**
 * Mobile Toggle Component - Enhanced for Responsive Design
 * 
 * Provides mobile navigation for MELO V2 with improvements to address
 * responsive design issues found in p4-3-a, p4-3-b, p4-3-c:
 * - Ensures proper touch target size (>=44px)
 * - Prevents horizontal scrollbar issues 
 * - Provides accessible navigation for all screen sizes
 */

import React from "react";
import { Menu } from "lucide-react";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { NavigationSidebar } from "@/components/navigation/navigation-sidebar";
import { ServerSidebar } from "@/components/server/server-sidebar";
import { cn } from "@/lib/utils";

interface MobileToggleProps {
  serverId: string;
  /**
   * Additional CSS classes
   */
  className?: string;
}

export function MobileToggle({ serverId, className }: MobileToggleProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn(
            // Only show on mobile/tablet
            "md:hidden",
            // Ensure proper touch target size (44px minimum for accessibility)
            "min-w-[44px] min-h-[44px]",
            // Centering and hover effects
            "flex items-center justify-center",
            "hover:bg-accent transition-colors",
            // Custom styling
            className
          )}
          aria-label="Open navigation menu"
          aria-expanded={isOpen}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      
      <SheetContent 
        side="left" 
        className={cn(
          "p-0 flex gap-0",
          // Prevent horizontal overflow on small screens
          "w-auto max-w-[calc(100vw-2rem)]",
          // Ensure proper mobile display
          "overflow-x-hidden"
        )}
        aria-label="Mobile navigation menu"
      >
        {/* Spaces Navigation (Server List) - Discord Style */}
        <div className={cn(
          "w-[72px] h-full",
          // Discord spaces navigation background color
          "bg-[#1e1f22] dark:bg-[#1e1f22]",
          // Prevent horizontal overflow
          "flex-shrink-0 overflow-x-hidden overflow-y-auto"
        )}>
          <NavigationSidebar />
        </div>
        
        {/* Server Sidebar (Channel List) */}
        <div className={cn(
          "w-60 h-full",
          // Standard card background
          "bg-card border-r border-border",
          // Prevent horizontal overflow
          "flex-shrink-0 overflow-x-hidden overflow-y-auto",
          // Minimum width to prevent content squashing
          "min-w-0"
        )}>
          <ServerSidebar serverId={serverId} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Enhanced Mobile Toggle with additional responsive features
 */
export function EnhancedMobileToggle({ 
  serverId,
  showSpaces = true,
  showServerSidebar = true 
}: { 
  serverId: string;
  showSpaces?: boolean;
  showServerSidebar?: boolean;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  
  // Auto-close on screen size change to desktop
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) { // md breakpoint
        setIsOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn(
            "md:hidden min-w-[44px] min-h-[44px]",
            "flex items-center justify-center",
            "hover:bg-accent transition-colors"
          )}
          aria-label="Open navigation menu"
          aria-expanded={isOpen}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      
      <SheetContent 
        side="left" 
        className={cn(
          "p-0 flex gap-0",
          "max-w-[calc(100vw-2rem)] overflow-x-hidden",
          // Adjust width based on what's shown
          showSpaces && showServerSidebar && "w-[332px]", // 72 + 260
          !showSpaces && showServerSidebar && "w-60",
          showSpaces && !showServerSidebar && "w-[72px]"
        )}
        aria-label="Mobile navigation menu"
      >
        {/* Spaces Navigation */}
        {showSpaces && (
          <div className="w-[72px] h-full bg-[#1e1f22] dark:bg-[#1e1f22] flex-shrink-0 overflow-x-hidden overflow-y-auto">
            <NavigationSidebar />
          </div>
        )}
        
        {/* Server Sidebar */}
        {showServerSidebar && (
          <div className="w-60 h-full bg-card border-r border-border flex-shrink-0 overflow-x-hidden overflow-y-auto min-w-0">
            <ServerSidebar serverId={serverId} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
