import React, { useState, useEffect } from 'react';
import { PresenceState } from '../services/matrix-presence';
import useMatrixClient from '../hooks/useMatrixClient'; // Assuming this hook exists

interface UserPresenceProps {
  userId: string;
  className?: string;
}

const PRESENCE_STYLES: Record<PresenceState, string> = {
  online: 'bg-green-500',
  offline: 'bg-gray-500',
  away: 'bg-yellow-500',
  'do-not-disturb': 'bg-red-500'
};

const PRESENCE_LABELS: Record<PresenceState, string> = {
  online: 'Online',
  offline: 'Offline',
  away: 'Away',
  'do-not-disturb': 'Do Not Disturb'
};

const UserPresence: React.FC<UserPresenceProps> = ({ userId, className = '' }) => {
  const [presenceState, setPresenceState] = useState<PresenceState>('offline');
  const matrixClient = useMatrixClient();
  const presenceService = matrixClient?.presenceService;

  useEffect(() => {
    if (!presenceService) return;

    // Initial presence fetch
    const initialState = presenceService.getUserPresence(userId);
    setPresenceState(initialState);

    // Subscribe to presence changes
    const unsubscribe = presenceService.subscribeToUserPresence(userId, (newState) => {
      setPresenceState(newState);
    });

    return () => {
      unsubscribe();
    };
  }, [userId, presenceService]);

  if (!presenceService) return null;

  return (
    <div 
      className={`flex items-center space-x-2 ${className}`} 
      title={PRESENCE_LABELS[presenceState]}
    >
      <span 
        className={`
          inline-block w-3 h-3 rounded-full 
          ${PRESENCE_STYLES[presenceState]} 
          transition-colors duration-300 ease-in-out
        `}
      />
      <span className="text-sm text-gray-700">
        {PRESENCE_LABELS[presenceState]}
      </span>
    </div>
  );
};

export default UserPresence;