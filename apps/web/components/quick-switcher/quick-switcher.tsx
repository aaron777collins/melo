'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useServerChannelNavigation, useQuickSearch } from '@/lib/url-routing';

interface QuickSwitcherProps {
  servers: any[];
  channels: any[];
  onClose: () => void;
}

export function QuickSwitcher({ 
  servers, 
  channels, 
  onClose 
}: QuickSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { navigateToServerChannel } = useServerChannelNavigation();
  const { performQuickSearch, searchResults } = useQuickSearch(servers, channels);

  // Handle keyboard shortcut (Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Update search results as query changes
  useEffect(() => {
    performQuickSearch(searchQuery);
  }, [searchQuery, performQuickSearch]);

  // Handle item selection
  const handleItemSelect = useCallback((item: any) => {
    if (item.serverId && item.channelId) {
      navigateToServerChannel(item.serverId, item.channelId);
    } else if (item.serverId) {
      navigateToServerChannel(item.serverId);
    }
    setIsOpen(false);
    onClose();
  }, [navigateToServerChannel, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-xl">
        <input 
          type="text" 
          placeholder="Search servers and channels..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-4 border-b dark:border-gray-700 focus:outline-none"
        />
        <ul className="max-h-96 overflow-y-auto">
          {searchResults.map((item, index) => (
            <li 
              key={index} 
              onClick={() => handleItemSelect(item)}
              className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
            >
              {item.name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Wrapper component to manage modal state
export function QuickSwitcherWrapper() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Placeholder for fetching servers and channels
  const servers = [
    { serverId: 'server1', name: 'General Server' },
    { serverId: 'server2', name: 'Tech Support' }
  ];
  
  const channels = [
    { serverId: 'server1', channelId: 'channel1', name: 'general' },
    { serverId: 'server1', channelId: 'channel2', name: 'random' },
    { serverId: 'server2', channelId: 'channel3', name: 'tech-help' }
  ];

  return (
    <>
      <QuickSwitcher 
        servers={servers} 
        channels={channels}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}