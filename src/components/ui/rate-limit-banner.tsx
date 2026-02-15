"use client";

import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, AlertTriangle } from 'lucide-react';

interface RateLimitBannerProps {
  isRateLimited: boolean;
  resetTime: number;
  remaining?: number;
  limit?: number;
  className?: string;
}

export function RateLimitBanner({
  isRateLimited,
  resetTime,
  remaining,
  limit,
  className
}: RateLimitBannerProps) {
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    if (!isRateLimited) return;

    const updateTimer = () => {
      const remaining = Math.max(0, resetTime - Date.now());
      setTimeRemaining(remaining);
      
      if (remaining <= 0) {
        // Rate limit has expired, could trigger a callback here
        return;
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [isRateLimited, resetTime]);

  if (!isRateLimited || timeRemaining <= 0) {
    return null;
  }

  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  const formatRemainingRequests = () => {
    if (remaining !== undefined && limit !== undefined) {
      return ` You have ${remaining}/${limit} requests remaining.`;
    }
    return '';
  };

  return (
    <Alert variant="destructive" className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Rate limit exceeded. Please wait {formatTime(timeRemaining)} before making more requests.
        {formatRemainingRequests()}
      </AlertDescription>
    </Alert>
  );
}