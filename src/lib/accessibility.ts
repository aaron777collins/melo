/**
 * Accessibility utilities for HAOS
 * 
 * Provides utilities for:
 * - ARIA labels and descriptions
 * - Keyboard navigation
 * - Screen reader announcements
 * - Focus management
 * - Reduced motion preferences
 * - High contrast mode detection
 */

// Screen reader announcement utilities
export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement is read
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

// Focus management utilities
export const trapFocus = (element: HTMLElement) => {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  ) as NodeListOf<HTMLElement>;
  
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  
  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    
    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };
  
  element.addEventListener('keydown', handleTabKey);
  
  // Focus first element
  firstElement?.focus();
  
  // Return cleanup function
  return () => {
    element.removeEventListener('keydown', handleTabKey);
  };
};

// Keyboard navigation utilities
export const createKeyboardHandler = (handlers: Record<string, (event: React.KeyboardEvent | KeyboardEvent) => void>) => {
  return (event: React.KeyboardEvent) => {
    const key = event.key;
    const handler = handlers[key];
    
    if (handler) {
      event.preventDefault();
      handler(event);
    }
  };
};

// ARIA utilities
export const generateId = (prefix: string = 'haos') => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};

export const createAriaLabel = (base: string, context?: string, state?: string) => {
  let label = base;
  
  if (context) {
    label += `, ${context}`;
  }
  
  if (state) {
    label += `, ${state}`;
  }
  
  return label;
};

// Media queries for accessibility preferences
export const prefersReducedMotion = () => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const prefersHighContrast = () => {
  return window.matchMedia('(prefers-contrast: high)').matches;
};

export const prefersDarkScheme = () => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

// Focus management for modals and dropdowns
export const restoreFocus = (previousFocus: HTMLElement | null) => {
  if (previousFocus && typeof previousFocus.focus === 'function') {
    previousFocus.focus();
  }
};

// Escape key handler
export const useEscapeKey = (callback: () => void) => {
  return (event: React.KeyboardEvent | KeyboardEvent) => {
    if (event.key === 'Escape') {
      callback();
    }
  };
};

// High contrast theme utility
export const isHighContrastMode = () => {
  // Check for Windows high contrast mode
  if (window.matchMedia('(-ms-high-contrast: active)').matches) {
    return true;
  }
  
  // Check for prefers-contrast: high
  if (window.matchMedia('(prefers-contrast: high)').matches) {
    return true;
  }
  
  return false;
};

// Reduced motion utility
export const shouldReduceMotion = () => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Screen reader detection (not 100% reliable but useful for optimization)
export const isScreenReaderActive = () => {
  // Check for common screen reader indicators
  const userAgent = navigator.userAgent.toLowerCase();
  const hasScreenReaderUA = userAgent.includes('jaws') || 
                           userAgent.includes('nvda') || 
                           userAgent.includes('sapi') ||
                           userAgent.includes('voiceover');
  
  // Check for accessibility API usage indicators
  const hasA11yIndicators = window.speechSynthesis || 
                           (window as any).navigator?.mediaDevices || 
                           document.hasFocus && !document.hasFocus();
  
  return hasScreenReaderUA || hasA11yIndicators;
};

// Chat message accessibility utilities
export const createChatMessageLabel = (
  author: string, 
  content: string, 
  timestamp: string, 
  isEdited?: boolean,
  replyCount?: number
) => {
  let label = `Message from ${author}, ${timestamp}. ${content}`;
  
  if (isEdited) {
    label += ' (edited)';
  }
  
  if (replyCount && replyCount > 0) {
    label += `. ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`;
  }
  
  return label;
};

// Live region update for chat
export const updateChatLiveRegion = (message: string) => {
  const liveRegion = document.getElementById('chat-live-region');
  if (liveRegion) {
    liveRegion.textContent = message;
  }
};

// Navigation announcement utilities
export const announceNavigation = (destination: string) => {
  announceToScreenReader(`Navigated to ${destination}`, 'polite');
};

export const announceChannelChange = (channelName: string, channelType: 'text' | 'voice') => {
  announceToScreenReader(`Switched to ${channelType} channel ${channelName}`, 'polite');
};

// Status announcements
export const announceConnectionStatus = (status: 'connected' | 'disconnected' | 'connecting') => {
  const messages = {
    connected: 'Connected to server',
    disconnected: 'Disconnected from server',
    connecting: 'Connecting to server'
  };
  
  announceToScreenReader(messages[status], 'assertive');
};

export const announceNotificationCount = (count: number) => {
  if (count === 0) {
    announceToScreenReader('No unread notifications', 'polite');
  } else {
    announceToScreenReader(`${count} unread ${count === 1 ? 'notification' : 'notifications'}`, 'polite');
  }
};