/**
 * Skip Navigation Component
 * 
 * Provides skip links for keyboard users to quickly navigate to main content areas
 */

"use client";

import React from "react";
import { useAccessibility } from "@/src/hooks/use-accessibility";

interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

function SkipLink({ href, children, className = "" }: SkipLinkProps) {
  const { announceNavigation } = useAccessibility();
  
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.querySelector(href);
    
    if (target) {
      // Focus the target element
      (target as HTMLElement).focus();
      
      // Scroll to target if needed
      target.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
      
      // Announce navigation
      const targetName = target.getAttribute('aria-label') || 
                        target.getAttribute('title') || 
                        href.replace('#', '');
      announceNavigation(targetName);
    }
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className={`skip-link ${className}`}
    >
      {children}
    </a>
  );
}

export function SkipNavigation() {
  return (
    <div className="skip-navigation" role="navigation" aria-label="Skip to content">
      <SkipLink href="#main-content">
        Skip to main content
      </SkipLink>
      <SkipLink href="#navigation-sidebar">
        Skip to navigation
      </SkipLink>
      <SkipLink href="#chat-input">
        Skip to message input
      </SkipLink>
      <SkipLink href="#member-list">
        Skip to member list
      </SkipLink>
    </div>
  );
}

/**
 * Live Regions Component
 * 
 * Provides screen reader announcements for dynamic content changes
 */
export function LiveRegions() {
  return (
    <>
      {/* For chat messages and status updates */}
      <div
        id="chat-live-region"
        aria-live="polite"
        aria-atomic="false"
        className="sr-only"
      />
      
      {/* For navigation changes */}
      <div
        id="navigation-live-region"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      
      {/* For urgent status updates (connection issues, errors) */}
      <div
        id="status-live-region"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      />
      
      {/* For notification announcements */}
      <div
        id="notification-live-region"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
    </>
  );
}

/**
 * Accessibility Announcer Component
 * 
 * Utility component for making announcements to screen readers
 */
export function AccessibilityAnnouncer() {
  return (
    <div
      id="accessibility-announcer"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  );
}

/**
 * Focus Trap Component
 * 
 * Traps focus within a container for modals and dialogs
 */
interface FocusTrapProps {
  children: React.ReactNode;
  active: boolean;
  onEscape?: () => void;
  className?: string;
}

export function FocusTrap({ children, active, onEscape, className = "" }: FocusTrapProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element
    firstElement?.focus();

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      } else if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        onEscape();
      }
    };

    document.addEventListener('keydown', handleTabKey);

    return () => {
      document.removeEventListener('keydown', handleTabKey);
    };
  }, [active, onEscape]);

  return (
    <div
      ref={containerRef}
      className={className}
      role="dialog"
      aria-modal={active}
    >
      {children}
    </div>
  );
}

/**
 * Keyboard Navigation Hints Component
 * 
 * Provides keyboard shortcuts information
 */
export function KeyboardNavigationHints() {
  return (
    <div className="sr-only" role="region" aria-label="Keyboard navigation help">
      <h2>Keyboard Navigation</h2>
      <ul>
        <li>Tab: Navigate between interactive elements</li>
        <li>Shift + Tab: Navigate backwards</li>
        <li>Enter or Space: Activate buttons and links</li>
        <li>Arrow keys: Navigate within lists and menus</li>
        <li>Escape: Close dialogs and menus</li>
        <li>Alt + Up/Down: Navigate between channels</li>
        <li>Ctrl + K: Open search (when implemented)</li>
      </ul>
    </div>
  );
}