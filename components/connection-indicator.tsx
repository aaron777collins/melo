"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Wifi, WifiOff, RotateCw, AlertCircle, CheckCircle2 } from "lucide-react";
import {  SyncState  } from "@/lib/matrix/matrix-sdk-exports";

import { ActionTooltip } from "@/components/action-tooltip";
import { useMatrix } from "@/components/providers/matrix-provider";
import { cn } from "@/lib/utils";

/**
 * Connection Status Component
 * 
 * Visual indicator for Matrix sync connection state with auto-retry functionality.
 * 
 * States:
 * - Green (connected): PREPARED, SYNCING  
 * - Yellow (connecting): CATCHUP, RECONNECTING
 * - Red (error): ERROR, STOPPED
 * 
 * Features:
 * - Color-coded status indicator
 * - Tooltip with connection details
 * - Auto-retry on disconnect
 * - Clickable for detailed status
 */

interface ConnectionIndicatorProps {
  /** Position the indicator in the UI */
  className?: string;
  /** Show label text alongside indicator */
  showLabel?: boolean;
  /** Auto-retry interval in milliseconds */
  retryInterval?: number;
}

export function ConnectionIndicator({ 
  className,
  showLabel = false,
  retryInterval = 5000 
}: ConnectionIndicatorProps) {
  const { client, syncState, isReady, isSyncing, syncError } = useMatrix();
  const [retryCount, setRetryCount] = useState(0);
  const [isManualRetrying, setIsManualRetrying] = useState(false);

  // Map sync states to our visual states
  const getConnectionState = () => {
    if (!client || !syncState) {
      return { status: 'disconnected', color: 'red', label: 'Not connected' };
    }

    switch (syncState) {
      case SyncState.Prepared:
      case SyncState.Syncing:
        return { status: 'connected', color: 'green', label: 'Connected' };
        
      case SyncState.Catchup:
      case SyncState.Reconnecting:
        return { status: 'connecting', color: 'yellow', label: 'Reconnecting' };
        
      case SyncState.Error:
      case SyncState.Stopped:
      default:
        return { status: 'error', color: 'red', label: 'Connection failed' };
    }
  };

  const connectionState = getConnectionState();

  // Auto-retry logic for error states
  const attemptRetry = useCallback(async () => {
    if (!client || connectionState.status === 'connected') return;

    try {
      setIsManualRetrying(true);
      
      // If client is stopped, restart sync
      if (syncState === SyncState.Stopped) {
        await client.startClient();
      }
      
      setRetryCount(prev => prev + 1);
    } catch (error) {
      console.error('[ConnectionIndicator] Retry failed:', error);
    } finally {
      setIsManualRetrying(false);
    }
  }, [client, syncState, connectionState.status]);

  // Auto-retry effect
  useEffect(() => {
    if (connectionState.status === 'error' && retryCount < 3) {
      const timer = setTimeout(attemptRetry, retryInterval);
      return () => clearTimeout(timer);
    }
  }, [connectionState.status, retryCount, retryInterval, attemptRetry]);

  // Reset retry count when successfully connected
  useEffect(() => {
    if (connectionState.status === 'connected') {
      setRetryCount(0);
    }
  }, [connectionState.status]);

  // Get color classes
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'green':
        return {
          bg: 'bg-green-500',
          text: 'text-green-500',
          hover: 'hover:bg-green-600'
        };
      case 'yellow':
        return {
          bg: 'bg-yellow-500',
          text: 'text-yellow-500',
          hover: 'hover:bg-yellow-600'
        };
      case 'red':
      default:
        return {
          bg: 'bg-red-500',
          text: 'text-red-500',
          hover: 'hover:bg-red-600'
        };
    }
  };

  const colors = getColorClasses(connectionState.color);

  // Get status icon
  const getStatusIcon = () => {
    if (isManualRetrying) {
      return <RotateCw className="h-3 w-3 animate-spin" />;
    }

    switch (connectionState.status) {
      case 'connected':
        return <CheckCircle2 className="h-3 w-3" />;
      case 'connecting':
        return <RotateCw className="h-3 w-3 animate-pulse" />;
      case 'error':
        return <AlertCircle className="h-3 w-3" />;
      case 'disconnected':
      default:
        return <WifiOff className="h-3 w-3" />;
    }
  };

  // Build tooltip content with details
  const getTooltipContent = () => {
    let content = connectionState.label;
    
    if (syncError) {
      content += `\nError: ${syncError.message}`;
    }
    
    if (syncState) {
      content += `\nSync state: ${syncState}`;
    }
    
    if (retryCount > 0) {
      content += `\nRetries: ${retryCount}/3`;
    }
    
    if (connectionState.status === 'error' && retryCount < 3) {
      content += '\nAuto-retrying...';
    }

    if (connectionState.status === 'connected' && isSyncing) {
      content += '\nSyncing messages...';
    }

    content += '\n\nClick for details';
    
    return content;
  };

  // Handle click for detailed status
  const handleClick = () => {
    if (connectionState.status === 'error') {
      attemptRetry();
    } else {
      // TODO: Could open a detailed connection status modal
      console.log('Connection status details:', {
        syncState,
        isReady,
        isSyncing,
        syncError,
        retryCount
      });
    }
  };

  return (
    <ActionTooltip label={getTooltipContent()} side="top">
      <button 
        onClick={handleClick}
        className={cn(
          "flex items-center gap-2 transition-all duration-200 ease-in-out",
          "hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
          className
        )}
        disabled={isManualRetrying}
      >
        {/* Status Indicator Dot */}
        <div className="relative flex items-center">
          <div 
            className={cn(
              "h-3 w-3 rounded-full transition-all duration-200 ease-in-out",
              colors.bg,
              isManualRetrying && "animate-pulse"
            )} 
          />
          
          {/* Pulse animation for connecting states */}
          {connectionState.status === 'connecting' && (
            <div 
              className={cn(
                "absolute inset-0 h-3 w-3 rounded-full animate-ping",
                colors.bg,
                "opacity-75"
              )} 
            />
          )}
        </div>

        {/* Optional Icon */}
        <div className={cn("transition-colors duration-200", colors.text)}>
          {getStatusIcon()}
        </div>

        {/* Optional Label */}
        {showLabel && (
          <span className={cn(
            "text-xs font-medium transition-colors duration-200",
            colors.text
          )}>
            {connectionState.label}
          </span>
        )}
      </button>
    </ActionTooltip>
  );
}

// Export convenience wrapper for common usage patterns
export function ConnectionIndicatorCompact(props: Omit<ConnectionIndicatorProps, 'showLabel'>) {
  return <ConnectionIndicator {...props} showLabel={false} />;
}

export function ConnectionIndicatorWithLabel(props: Omit<ConnectionIndicatorProps, 'showLabel'>) {
  return <ConnectionIndicator {...props} showLabel={true} />;
}