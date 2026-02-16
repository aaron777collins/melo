/**
 * Accessibility hook for HAOS
 * 
 * Manages accessibility preferences and provides utilities
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  announceToScreenReader, 
  prefersReducedMotion, 
  prefersHighContrast,
  shouldReduceMotion,
  isHighContrastMode
} from '@/src/lib/accessibility';

interface AccessibilitySettings {
  reducedMotion: boolean;
  highContrast: boolean;
  screenReaderOptimizations: boolean;
  enhancedFocus: boolean;
  announceNavigation: boolean;
  announceMessages: boolean;
}

export function useAccessibility() {
  // Accessibility preferences state
  const [settings, setSettings] = useState<AccessibilitySettings>({
    reducedMotion: false,
    highContrast: false,
    screenReaderOptimizations: false,
    enhancedFocus: true,
    announceNavigation: true,
    announceMessages: false, // Can be overwhelming, off by default
  });

  // System preference detection
  const [systemPreferences, setSystemPreferences] = useState({
    reducedMotion: false,
    highContrast: false,
    darkMode: false,
  });

  // Initialize system preferences
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateSystemPreferences = () => {
      setSystemPreferences({
        reducedMotion: shouldReduceMotion(),
        highContrast: isHighContrastMode(),
        darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
      });
    };

    updateSystemPreferences();

    // Listen for changes
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => updateSystemPreferences();

    reducedMotionQuery.addEventListener('change', handleChange);
    highContrastQuery.addEventListener('change', handleChange);
    darkModeQuery.addEventListener('change', handleChange);

    return () => {
      reducedMotionQuery.removeEventListener('change', handleChange);
      highContrastQuery.removeEventListener('change', handleChange);
      darkModeQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // Load saved settings
  useEffect(() => {
    const savedSettings = localStorage.getItem('haos-accessibility-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Failed to load accessibility settings:', error);
      }
    }
  }, []);

  // Save settings when they change
  useEffect(() => {
    localStorage.setItem('haos-accessibility-settings', JSON.stringify(settings));
  }, [settings]);

  // Update settings
  const updateSetting = useCallback((key: keyof AccessibilitySettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  // Announcement utilities
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (settings.screenReaderOptimizations || settings.announceNavigation) {
      announceToScreenReader(message, priority);
    }
  }, [settings.screenReaderOptimizations, settings.announceNavigation]);

  const announceNavigation = useCallback((destination: string) => {
    if (settings.announceNavigation) {
      announce(`Navigated to ${destination}`, 'polite');
    }
  }, [settings.announceNavigation, announce]);

  const announceMessage = useCallback((author: string, content: string) => {
    if (settings.announceMessages) {
      // Truncate long messages for announcements
      const truncatedContent = content.length > 100 ? 
        content.substring(0, 100) + '... message truncated' : 
        content;
      announce(`New message from ${author}: ${truncatedContent}`, 'polite');
    }
  }, [settings.announceMessages, announce]);

  const announceStatusChange = useCallback((status: string) => {
    announce(status, 'assertive');
  }, [announce]);

  // Computed preferences (combining user settings with system preferences)
  const effectivePreferences = {
    reducedMotion: settings.reducedMotion || systemPreferences.reducedMotion,
    highContrast: settings.highContrast || systemPreferences.highContrast,
    enhancedFocus: settings.enhancedFocus,
    screenReaderOptimizations: settings.screenReaderOptimizations,
    announceNavigation: settings.announceNavigation,
    announceMessages: settings.announceMessages,
  };

  // CSS classes for components
  const getAccessibilityClasses = useCallback(() => {
    const classes = [];

    if (effectivePreferences.reducedMotion) {
      classes.push('respect-motion-preference');
    }

    if (effectivePreferences.highContrast) {
      classes.push('high-contrast-mode');
    }

    if (effectivePreferences.enhancedFocus) {
      classes.push('enhanced-focus');
    }

    if (effectivePreferences.screenReaderOptimizations) {
      classes.push('screen-reader-optimized');
    }

    return classes.join(' ');
  }, [effectivePreferences]);

  // Focus management utilities
  const [focusedElementId, setFocusedElementId] = useState<string | null>(null);

  const setFocus = useCallback((elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.focus();
      setFocusedElementId(elementId);
    }
  }, []);

  const clearFocus = useCallback(() => {
    setFocusedElementId(null);
  }, []);

  return {
    settings,
    systemPreferences,
    effectivePreferences,
    updateSetting,
    announce,
    announceNavigation,
    announceMessage,
    announceStatusChange,
    getAccessibilityClasses,
    focusedElementId,
    setFocus,
    clearFocus,
  };
}

// Hook for components to check if they should respect reduced motion
export function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handleChange = () => setReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return reducedMotion;
}

// Hook for high contrast mode detection
export function useHighContrast() {
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkHighContrast = () => {
      const isHighContrast = window.matchMedia('(prefers-contrast: high)').matches ||
                            window.matchMedia('(-ms-high-contrast: active)').matches;
      setHighContrast(isHighContrast);
    };

    checkHighContrast();

    const contrastQuery = window.matchMedia('(prefers-contrast: high)');
    const msContrastQuery = window.matchMedia('(-ms-high-contrast: active)');

    const handleChange = () => checkHighContrast();

    contrastQuery.addEventListener('change', handleChange);
    msContrastQuery.addEventListener('change', handleChange);

    return () => {
      contrastQuery.removeEventListener('change', handleChange);
      msContrastQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return highContrast;
}