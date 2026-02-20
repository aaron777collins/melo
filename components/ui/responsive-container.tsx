/**
 * Responsive Container Component
 * 
 * Ensures consistent responsive behavior across all MELO V2 components.
 * Addresses common responsive issues found in breakpoint testing.
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  /**
   * Maximum width to prevent horizontal scrolling on small screens
   */
  maxWidth?: 'screen' | 'container' | 'content' | false;
  /**
   * Whether to add mobile-safe padding
   */
  mobilePadding?: boolean;
  /**
   * Whether to ensure minimum touch targets on mobile
   */
  touchTargets?: boolean;
  /**
   * Custom className for additional styling
   */
  className?: string;
  /**
   * Prevent horizontal overflow
   */
  preventOverflow?: boolean;
}

export function ResponsiveContainer({
  children,
  maxWidth = 'screen',
  mobilePadding = false,
  touchTargets = false,
  preventOverflow = true,
  className
}: ResponsiveContainerProps) {
  return (
    <div
      className={cn(
        // Base responsive container
        'w-full',
        
        // Max width constraints to prevent horizontal scrolling
        maxWidth === 'screen' && 'max-w-screen overflow-x-hidden',
        maxWidth === 'container' && 'max-w-7xl mx-auto',
        maxWidth === 'content' && 'max-w-4xl mx-auto',
        
        // Prevent horizontal overflow
        preventOverflow && 'overflow-x-hidden',
        
        // Mobile-safe padding
        mobilePadding && 'px-4 md:px-6 lg:px-8',
        
        // Touch target improvements on mobile
        touchTargets && [
          '[&_button]:min-h-[44px] [&_button]:min-w-[44px]',
          '[&_[role="button"]]:min-h-[44px] [&_[role="button"]]:min-w-[44px]',
          '[&_a]:min-h-[44px]'
        ],
        
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Responsive Grid Component
 * 
 * Ensures grid layouts work properly across all breakpoints
 */
interface ResponsiveGridProps {
  children: React.ReactNode;
  /**
   * Grid columns at different breakpoints: [mobile, tablet, desktop]
   */
  columns?: [number, number, number];
  /**
   * Gap between grid items
   */
  gap?: 'sm' | 'md' | 'lg';
  /**
   * Custom className
   */
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
    <div
      className={cn(
        'grid w-full',
        `grid-cols-${mobile}`,
        `md:grid-cols-${tablet}`,
        `lg:grid-cols-${desktop}`,
        gap === 'sm' && 'gap-2',
        gap === 'md' && 'gap-4',
        gap === 'lg' && 'gap-6',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Responsive Sidebar Component
 * 
 * Handles the common Discord pattern of sidebars that are:
 * - Hidden on mobile
 * - Toggleable on tablet  
 * - Always visible on desktop
 */
interface ResponsiveSidebarProps {
  children: React.ReactNode;
  /**
   * Sidebar position
   */
  side: 'left' | 'right';
  /**
   * Width on desktop (in rem or px)
   */
  width?: string;
  /**
   * Whether to show toggle button on mobile/tablet
   */
  showToggle?: boolean;
  /**
   * Toggle button label for accessibility
   */
  toggleLabel?: string;
  /**
   * Custom className
   */
  className?: string;
}

export function ResponsiveSidebar({
  children,
  side = 'left',
  width = '15rem',
  showToggle = true,
  toggleLabel = 'Toggle sidebar',
  className
}: ResponsiveSidebarProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  
  return (
    <>
      {/* Desktop Sidebar - Always visible */}
      <aside
        className={cn(
          'hidden lg:flex flex-col bg-card border-r',
          side === 'left' && 'fixed left-0 inset-y-0',
          side === 'right' && 'fixed right-0 inset-y-0',
          className
        )}
        style={{ width }}
        role="navigation"
        aria-label={`${side} sidebar`}
      >
        {children}
      </aside>
      
      {/* Mobile/Tablet Toggle Button */}
      {showToggle && (
        <button
          className="lg:hidden fixed z-50 top-4 left-4 p-2 rounded-md bg-card border min-h-[44px] min-w-[44px] flex items-center justify-center"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={toggleLabel}
          aria-expanded={isOpen}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      )}
      
      {/* Mobile/Tablet Overlay Sidebar */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsOpen(false)}
            aria-label="Close sidebar"
          />
          
          {/* Sidebar */}
          <aside
            className={cn(
              'lg:hidden fixed inset-y-0 z-50 flex flex-col bg-card transform transition-transform duration-200',
              side === 'left' && 'left-0',
              side === 'right' && 'right-0',
              className
            )}
            style={{ width }}
            role="navigation"
            aria-label={`${side} sidebar`}
          >
            <div className="flex justify-end p-2">
              <button
                className="p-2 rounded-md hover:bg-accent min-h-[44px] min-w-[44px] flex items-center justify-center"
                onClick={() => setIsOpen(false)}
                aria-label="Close sidebar"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            {children}
          </aside>
        </>
      )}
    </>
  );
}

/**
 * Responsive Modal Component
 * 
 * Ensures modals are properly sized at all breakpoints:
 * - Full screen on mobile
 * - Responsive sizing on tablet
 * - Max width on desktop
 */
interface ResponsiveModalProps {
  children: React.ReactNode;
  /**
   * Whether modal is open
   */
  isOpen: boolean;
  /**
   * Close modal handler
   */
  onClose: () => void;
  /**
   * Modal title for accessibility
   */
  title?: string;
  /**
   * Maximum width on desktop
   */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Custom className
   */
  className?: string;
}

export function ResponsiveModal({
  children,
  isOpen,
  onClose,
  title = 'Modal',
  maxWidth = 'md',
  className
}: ResponsiveModalProps) {
  // Close on escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        aria-label="Close modal"
      />
      
      {/* Modal */}
      <div
        className={cn(
          // Mobile: Full screen with margin
          'relative w-full h-full m-4 bg-card rounded-lg shadow-lg',
          
          // Tablet+: Responsive sizing
          'md:w-auto md:h-auto md:min-w-[32rem]',
          maxWidth === 'sm' && 'md:max-w-sm',
          maxWidth === 'md' && 'md:max-w-md',
          maxWidth === 'lg' && 'md:max-w-lg',
          maxWidth === 'xl' && 'md:max-w-xl',
          
          // Prevent overflow
          'max-h-full overflow-y-auto',
          
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Close button */}
        <button
          className="absolute top-4 right-4 p-2 rounded-md hover:bg-accent min-h-[44px] min-w-[44px] flex items-center justify-center z-10"
          onClick={onClose}
          aria-label="Close modal"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        
        {children}
      </div>
    </div>
  );
}