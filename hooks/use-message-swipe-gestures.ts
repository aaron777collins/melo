"use client";

/**
 * Message Swipe Gestures Hook
 * 
 * Provides swipe gesture support for individual chat messages with mobile-friendly actions.
 * - Swipe right: Quick reply
 * - Swipe left: Message actions (react, copy, delete)
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import {  MatrixEvent  } from "@/lib/matrix/matrix-sdk-exports";

interface MessageSwipeOptions {
  /** Minimum distance (px) to register a swipe. Default: 60 */
  threshold?: number;
  /** Maximum time (ms) for a swipe gesture. Default: 400 */
  maxTime?: number;
  /** How far to translate the message during swipe. Default: 80px */
  translateDistance?: number;
  /** Animation duration in ms. Default: 200 */
  animationDuration?: number;
}

interface MessageSwipeCallbacks {
  onSwipeRightStart?: (event: MatrixEvent) => void;
  onSwipeRightEnd?: (event: MatrixEvent) => void;
  onSwipeLeftStart?: (event: MatrixEvent) => void;
  onSwipeLeftEnd?: (event: MatrixEvent) => void;
  onQuickReply?: (event: MatrixEvent) => void;
  onShowActions?: (event: MatrixEvent) => void;
}

interface TouchData {
  startX: number;
  startY: number;
  startTime: number;
  currentX: number;
  isActive: boolean;
  rightStarted?: boolean;
  leftStarted?: boolean;
}

/**
 * Hook for adding swipe gesture support to individual chat messages
 */
export function useMessageSwipeGestures<T extends HTMLElement = HTMLDivElement>(
  event: MatrixEvent,
  callbacks: MessageSwipeCallbacks = {},
  options: MessageSwipeOptions = {}
) {
  const {
    threshold = 60,
    maxTime = 400,
    translateDistance = 80,
    animationDuration = 200
  } = options;
  
  const {
    onSwipeRightStart,
    onSwipeRightEnd,
    onSwipeLeftStart,
    onSwipeLeftEnd,
    onQuickReply,
    onShowActions
  } = callbacks;

  const elementRef = useRef<T | null>(null);
  const touchDataRef = useRef<TouchData | null>(null);
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  const [swipeTransform, setSwipeTransform] = useState(0);
  const animationRef = useRef<number>();

  const resetSwipe = useCallback(() => {
    if (elementRef.current) {
      elementRef.current.style.transform = 'translateX(0px)';
      elementRef.current.style.transition = `transform ${animationDuration}ms ease-out`;
    }
    setSwipeTransform(0);
    setIsSwipeActive(false);
    touchDataRef.current = null;
    
    // Clear transition after animation
    setTimeout(() => {
      if (elementRef.current) {
        elementRef.current.style.transition = '';
      }
    }, animationDuration);
  }, [animationDuration]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Only handle single finger touches
    if (e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    touchDataRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      currentX: touch.clientX,
      isActive: true
    };

    // Remove any existing transition for smooth real-time movement
    if (elementRef.current) {
      elementRef.current.style.transition = 'none';
    }
    
    setIsSwipeActive(true);
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const touchData = touchDataRef.current;
    if (!touchData || !touchData.isActive || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchData.startX;
    const deltaY = Math.abs(touch.clientY - touchData.startY);
    
    // If vertical movement is too much, cancel the swipe
    if (deltaY > 50) {
      resetSwipe();
      return;
    }
    
    // Only allow horizontal swipes within reasonable bounds
    const clampedDelta = Math.max(-translateDistance, Math.min(translateDistance, deltaX));
    
    // Update current position
    touchData.currentX = touch.clientX;
    setSwipeTransform(clampedDelta);
    
    if (elementRef.current) {
      elementRef.current.style.transform = `translateX(${clampedDelta}px)`;
    }

    // Trigger start callbacks when threshold is exceeded
    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0 && !touchData.rightStarted) {
        touchData.rightStarted = true;
        onSwipeRightStart?.(event);
      } else if (deltaX < 0 && !touchData.leftStarted) {
        touchData.leftStarted = true;
        onSwipeLeftStart?.(event);
      }
    }

    // Prevent default to avoid scrolling issues
    if (Math.abs(deltaX) > 10) {
      e.preventDefault();
    }
  }, [event, threshold, translateDistance, onSwipeRightStart, onSwipeLeftStart, resetSwipe]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const touchData = touchDataRef.current;
    if (!touchData || !touchData.isActive) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchData.startX;
    const deltaTime = Date.now() - touchData.startTime;
    const velocity = Math.abs(deltaX) / deltaTime;

    // Reset the swipe with animation
    resetSwipe();

    // Check if gesture qualifies as a swipe
    const isValidSwipe = deltaTime <= maxTime && Math.abs(deltaX) > threshold;
    const isFastSwipe = velocity > 0.5; // pixels per ms
    
    if (isValidSwipe || isFastSwipe) {
      if (deltaX > 0) {
        // Right swipe - Quick reply
        onSwipeRightEnd?.(event);
        onQuickReply?.(event);
      } else {
        // Left swipe - Show actions
        onSwipeLeftEnd?.(event);
        onShowActions?.(event);
      }
    }
  }, [event, threshold, maxTime, onSwipeRightEnd, onSwipeLeftEnd, onQuickReply, onShowActions, resetSwipe]);

  // Setup event listeners
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Use passive listeners for performance, except touchmove which needs preventDefault
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', resetSwipe, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', resetSwipe);
      
      // Clear any ongoing animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, resetSwipe]);

  return {
    elementRef,
    isSwipeActive,
    swipeTransform,
    resetSwipe
  };
}

/**
 * Pre-configured message swipe hook for common chat actions
 */
export function useChatMessageSwipe(
  event: MatrixEvent,
  {
    onReply,
    onReact,
    onCopy,
    onEdit,
    onDelete
  }: {
    onReply?: (event: MatrixEvent) => void;
    onReact?: (event: MatrixEvent) => void;
    onCopy?: (event: MatrixEvent) => void;
    onEdit?: (event: MatrixEvent) => void;
    onDelete?: (event: MatrixEvent) => void;
  }
) {
  return useMessageSwipeGestures(
    event,
    {
      onQuickReply: onReply,
      onShowActions: (event: MatrixEvent) => {
        // Show action menu or perform primary action
        onReact?.(event);
      },
      onSwipeRightStart: () => {
        // Optional: Show reply preview/hint
      },
      onSwipeLeftStart: () => {
        // Optional: Show actions preview/hint
      }
    },
    {
      threshold: 60,
      maxTime: 400,
      translateDistance: 100,
      animationDuration: 250
    }
  );
}

export default useMessageSwipeGestures;