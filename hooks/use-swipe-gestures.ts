"use client";

/**
 * Swipe Gestures Hook
 * 
 * Provides touch-based swipe gesture detection for mobile UX enhancements.
 * Supports horizontal and vertical swipes with configurable thresholds.
 */

import { useRef, useEffect, useCallback } from 'react';

interface SwipeOptions {
  /** Minimum distance (px) to register a swipe. Default: 50 */
  threshold?: number;
  /** Maximum time (ms) for a swipe gesture. Default: 300 */
  maxTime?: number;
  /** Prevent default touch behavior. Default: false */
  preventDefault?: boolean;
}

interface SwipeCallbacks {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

interface TouchData {
  startX: number;
  startY: number;
  startTime: number;
}

/**
 * Hook for adding swipe gesture support to any element
 */
export function useSwipeGestures(
  callbacks: SwipeCallbacks = {},
  options: SwipeOptions = {}
) {
  const {
    threshold = 50,
    maxTime = 300,
    preventDefault = false
  } = options;
  
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown
  } = callbacks;

  const touchDataRef = useRef<TouchData | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (preventDefault) {
      e.preventDefault();
    }
    
    const touch = e.touches[0];
    touchDataRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now()
    };
  }, [preventDefault]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (preventDefault) {
      e.preventDefault();
    }
    
    const touchData = touchDataRef.current;
    if (!touchData) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchData.startX;
    const deltaY = touch.clientY - touchData.startY;
    const deltaTime = Date.now() - touchData.startTime;

    // Reset touch data
    touchDataRef.current = null;

    // Check if gesture is within time limit
    if (deltaTime > maxTime) return;

    // Determine swipe direction
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Horizontal swipe (X movement > Y movement)
    if (absDeltaX > absDeltaY && absDeltaX > threshold) {
      if (deltaX > 0) {
        onSwipeRight?.();
      } else {
        onSwipeLeft?.();
      }
    }
    // Vertical swipe (Y movement > X movement)
    else if (absDeltaY > threshold) {
      if (deltaY > 0) {
        onSwipeDown?.();
      } else {
        onSwipeUp?.();
      }
    }
  }, [threshold, maxTime, preventDefault, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  // Setup event listeners
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Add passive listeners for better performance
    const touchStartOptions = { passive: !preventDefault };
    const touchEndOptions = { passive: !preventDefault };

    element.addEventListener('touchstart', handleTouchStart, touchStartOptions);
    element.addEventListener('touchend', handleTouchEnd, touchEndOptions);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd, preventDefault]);

  return elementRef;
}

/**
 * Pre-configured swipe hook for chat interface
 * - Swipe right: Show navigation/server sidebar
 * - Swipe left: Show member list sidebar
 */
export function useChatSwipeGestures({
  onShowNavigation,
  onShowMembers,
  onHideSidebar
}: {
  onShowNavigation?: () => void;
  onShowMembers?: () => void;
  onHideSidebar?: () => void;
}) {
  return useSwipeGestures(
    {
      onSwipeRight: onShowNavigation,
      onSwipeLeft: onShowMembers,
      onSwipeUp: onHideSidebar,
    },
    {
      threshold: 60, // Slightly higher threshold for chat
      maxTime: 400,  // Allow slightly longer swipes
      preventDefault: false, // Don't interfere with scrolling
    }
  );
}

/**
 * Pre-configured swipe hook for modal/sheet navigation
 * - Swipe down: Close modal/sheet
 */
export function useModalSwipeGestures({
  onClose
}: {
  onClose?: () => void;
}) {
  return useSwipeGestures(
    {
      onSwipeDown: onClose,
    },
    {
      threshold: 80, // Higher threshold for modal close
      maxTime: 300,
      preventDefault: false,
    }
  );
}

export default useSwipeGestures;