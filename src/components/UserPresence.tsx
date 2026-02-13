"use client";

import React from 'react';
import { usePresence } from '@/hooks/use-presence';

interface UserPresenceProps {
  userId: string;
  className?: string;
  showLabel?: boolean;
}

const PRESENCE_STYLES = {
  online: 'bg-green-500',
  offline: 'bg-gray-500',
  unavailable: 'bg-yellow-500',
} as const;

const PRESENCE_LABELS = {
  online: 'Online',
  offline: 'Offline',
  unavailable: 'Away',
} as const;

/**
 * UserPresence - Displays a user's presence indicator
 * 
 * Uses the existing usePresence hook which properly integrates with Matrix SDK
 * for real-time presence updates.
 */
const UserPresence: React.FC<UserPresenceProps> = ({ 
  userId, 
  className = '',
  showLabel = true 
}) => {
  const { presence } = usePresence(userId);

  return (
    <div 
      className={`flex items-center space-x-2 ${className}`} 
      title={PRESENCE_LABELS[presence]}
    >
      <span 
        className={`
          inline-block w-3 h-3 rounded-full 
          ${PRESENCE_STYLES[presence]} 
          transition-colors duration-300 ease-in-out
        `}
      />
      {showLabel && (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {PRESENCE_LABELS[presence]}
        </span>
      )}
    </div>
  );
};

export default UserPresence;
