/**
 * Responsive Layout Components
 * 
 * Addresses specific responsive layout issues found in breakpoint testing:
 * - Prevents horizontal scrollbars at all breakpoints
 * - Ensures proper sidebar behavior on mobile/tablet/desktop
 * - Maintains Discord-style layout patterns across screen sizes
 * 
 * Fixes issues identified in p4-3-a, p4-3-b, p4-3-c:
 * - Mobile: Sidebars hidden, content full-width, touch-friendly
 * - Tablet: Hybrid layout with toggleable sidebars
 * - Desktop: Full three-column layout like Discord
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  /**
   * Show left sidebar (spaces navigation)
   */
  showLeftSidebar?: boolean;
  /**
   * Show center sidebar (channels, settings, etc.)
   */
  showCenterSidebar?: boolean;
  /**
   * Show right sidebar (members, info, etc.)
   */
  showRightSidebar?: boolean;
  /**
   * Left sidebar width in pixels
   */
  leftSidebarWidth?: number;
  /**
   * Center sidebar width in pixels
   */
  centerSidebarWidth?: number;
  /**
   * Right sidebar width in pixels
   */
  rightSidebarWidth?: number;
  /**
   * Left sidebar content
   */
  leftSidebar?: React.ReactNode;
  /**
   * Center sidebar content
   */
  centerSidebar?: React.ReactNode;
  /**
   * Right sidebar content
   */
  rightSidebar?: React.ReactNode;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Main responsive layout component that handles Discord-style three-column layout
 */
export function ResponsiveLayout({
  children,
  showLeftSidebar = false,
  showCenterSidebar = false,
  showRightSidebar = false,
  leftSidebarWidth = 72,
  centerSidebarWidth = 240,
  rightSidebarWidth = 240,
  leftSidebar,
  centerSidebar,
  rightSidebar,
  className
}: ResponsiveLayoutProps) {
  // Calculate total sidebar width for main content offset
  const totalLeftOffset = (showLeftSidebar ? leftSidebarWidth : 0) + (showCenterSidebar ? centerSidebarWidth : 0);
  const totalRightOffset = showRightSidebar ? rightSidebarWidth : 0;
  
  return (
    <div className={cn("h-full relative overflow-hidden", className)}>
      {/* Left Sidebar - Spaces Navigation (Hidden on mobile) */}
      {showLeftSidebar && leftSidebar && (
        <aside
          className={cn(
            "hidden lg:flex h-full z-30 flex-col fixed inset-y-0 left-0",
            "bg-[#1e1f22] dark:bg-[#1e1f22]" // Discord spaces navigation background
          )}
          style={{ width: leftSidebarWidth }}
          role="navigation"
          aria-label="Spaces navigation"
        >
          <div className="h-full overflow-y-auto overflow-x-hidden">
            {leftSidebar}
          </div>
        </aside>
      )}
      
      {/* Center Sidebar - Channels/Settings/etc (Hidden on mobile, toggleable on tablet) */}
      {showCenterSidebar && centerSidebar && (
        <aside
          className={cn(
            "hidden md:flex h-full z-20 flex-col fixed inset-y-0",
            "bg-card border-r border-border"
          )}
          style={{ 
            left: showLeftSidebar ? leftSidebarWidth : 0,
            width: centerSidebarWidth 
          }}
          role="complementary"
          aria-label="Navigation sidebar"
        >
          <div className="h-full overflow-y-auto overflow-x-hidden">
            {centerSidebar}
          </div>
        </aside>
      )}
      
      {/* Right Sidebar - Members/Info (Hidden on mobile/tablet) */}
      {showRightSidebar && rightSidebar && (
        <aside
          className={cn(
            "hidden xl:flex h-full z-10 flex-col fixed inset-y-0 right-0",
            "bg-card border-l border-border"
          )}
          style={{ width: rightSidebarWidth }}
          role="complementary"
          aria-label="Members sidebar"
        >
          <div className="h-full overflow-y-auto overflow-x-hidden">
            {rightSidebar}
          </div>
        </aside>
      )}
      
      {/* Main Content Area - Responsive with proper offsets */}
      <main
        className={cn(
          "h-full transition-all duration-200",
          // Mobile: No offsets (sidebars hidden)
          "w-full",
          // Tablet: Only center sidebar offset if present
          showCenterSidebar && "md:pl-60",
          // Desktop: Full sidebar offsets
          `lg:pl-[${totalLeftOffset}px]`,
          // Right sidebar offset
          showRightSidebar && `xl:pr-[${rightSidebarWidth}px]`,
          // Prevent horizontal overflow
          "overflow-x-hidden"
        )}
        style={{
          // Use inline styles for dynamic calculations
          paddingLeft: window?.innerWidth >= 1024 ? `${totalLeftOffset}px` : 
                      window?.innerWidth >= 768 && showCenterSidebar ? `${centerSidebarWidth}px` : 0,
          paddingRight: window?.innerWidth >= 1280 && showRightSidebar ? `${rightSidebarWidth}px` : 0
        }}
        role="main"
        aria-label="Main content"
      >
        <div className="h-full w-full overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}

/**
 * Discord-style main layout wrapper
 */
export function DiscordStyleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full w-full overflow-hidden">
      {children}
    </div>
  );
}

/**
 * No-overflow container to prevent horizontal scrolling issues
 */
interface NoOverflowContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function NoOverflowContainer({ children, className }: NoOverflowContainerProps) {
  return (
    <div className={cn(
      "w-full h-full overflow-x-hidden",
      // Ensure content doesn't exceed viewport
      "max-w-full",
      // Handle potential flex overflow
      "min-w-0",
      className
    )}>
      {children}
    </div>
  );
}

/**
 * Mobile-first content wrapper
 */
interface MobileFirstContentProps {
  children: React.ReactNode;
  /**
   * Add mobile-safe padding
   */
  safePadding?: boolean;
  /**
   * Ensure minimum touch targets
   */
  touchTargets?: boolean;
  className?: string;
}

export function MobileFirstContent({ 
  children, 
  safePadding = false,
  touchTargets = false,
  className 
}: MobileFirstContentProps) {
  return (
    <div className={cn(
      // Mobile-first approach
      "w-full h-full",
      // Prevent overflow
      "overflow-x-hidden max-w-full",
      // Safe padding for mobile
      safePadding && "px-4 md:px-6 lg:px-8",
      // Touch target improvements
      touchTargets && [
        "[&_button]:min-h-[44px] [&_button]:min-w-[44px]",
        "[&_[role='button']]:min-h-[44px] [&_[role='button']]:min-w-[44px]",
        "[&_a]:min-h-[44px] [&_a]:inline-flex [&_a]:items-center"
      ],
      className
    )}>
      {children}
    </div>
  );
}

/**
 * Responsive flex container that prevents overflow
 */
interface ResponsiveFlexProps {
  children: React.ReactNode;
  direction?: 'row' | 'col';
  wrap?: boolean;
  gap?: 'sm' | 'md' | 'lg';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  align?: 'start' | 'center' | 'end' | 'stretch';
  className?: string;
}

export function ResponsiveFlex({
  children,
  direction = 'row',
  wrap = false,
  gap = 'md',
  justify = 'start',
  align = 'start',
  className
}: ResponsiveFlexProps) {
  return (
    <div className={cn(
      'flex',
      direction === 'row' ? 'flex-row' : 'flex-col',
      wrap && 'flex-wrap',
      gap === 'sm' && 'gap-2',
      gap === 'md' && 'gap-4',
      gap === 'lg' && 'gap-6',
      justify === 'start' && 'justify-start',
      justify === 'center' && 'justify-center',
      justify === 'end' && 'justify-end',
      justify === 'between' && 'justify-between',
      justify === 'around' && 'justify-around',
      align === 'start' && 'items-start',
      align === 'center' && 'items-center',
      align === 'end' && 'items-end',
      align === 'stretch' && 'items-stretch',
      // Prevent overflow in flex containers
      'min-w-0 overflow-x-hidden',
      className
    )}>
      {children}
    </div>
  );
}

/**
 * Responsive grid that prevents overflow and maintains proper spacing
 */
interface ResponsiveGridProps {
  children: React.ReactNode;
  /**
   * Columns at different breakpoints: [mobile, tablet, desktop]
   */
  columns?: [number, number, number];
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ResponsiveGrid({
  children,
  columns = [1, 2, 3],
  gap = 'md',
  className
}: ResponsiveGridProps) {
  const [mobile, tablet, desktop] = columns;
  
  return (
    <div className={cn(
      'grid w-full overflow-x-hidden',
      // Grid columns responsive
      `grid-cols-${mobile}`,
      `md:grid-cols-${tablet}`,
      `lg:grid-cols-${desktop}`,
      // Gap sizing
      gap === 'sm' && 'gap-2',
      gap === 'md' && 'gap-4', 
      gap === 'lg' && 'gap-6',
      // Ensure grid items don't overflow
      '[&>*]:min-w-0 [&>*]:overflow-hidden',
      className
    )}>
      {children}
    </div>
  );
}

/**
 * Hook to detect and prevent horizontal overflow
 */
export function useOverflowPrevention() {
  const [hasOverflow, setHasOverflow] = React.useState(false);
  
  React.useEffect(() => {
    const checkOverflow = () => {
      const hasHorizontalOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth;
      setHasOverflow(hasHorizontalOverflow);
      
      if (hasHorizontalOverflow) {
        console.warn('Horizontal overflow detected!', {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
        });
      }
    };
    
    // Check on mount
    checkOverflow();
    
    // Check on resize
    window.addEventListener('resize', checkOverflow);
    
    // Check on DOM changes (throttled)
    let timeoutId: NodeJS.Timeout;
    const observer = new MutationObserver(() => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkOverflow, 100);
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });
    
    return () => {
      window.removeEventListener('resize', checkOverflow);
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, []);
  
  return { hasOverflow };
}