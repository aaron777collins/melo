import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export interface NavigationParams {
  serverId?: string;
  channelId?: string;
}

export function useServerChannelNavigation() {
  const router = useRouter();
  const [currentParams, setCurrentParams] = useState<NavigationParams>({});

  // Navigate to a specific server and channel
  const navigateToServerChannel = (serverId: string, channelId?: string) => {
    const path = channelId 
      ? `/servers/${serverId}/channels/${channelId}` 
      : `/servers/${serverId}`;
    
    router.push(path);
    setCurrentParams({ serverId, channelId });
  };

  // Parse current URL parameters
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/servers\/([^/]+)(?:\/channels\/([^/]+))?$/);
    
    if (match) {
      const [, serverId, channelId] = match;
      setCurrentParams({ serverId, channelId });
    }
  }, []);

  return {
    navigateToServerChannel,
    currentParams
  };
}

// Quick search utility for servers and channels
export function useQuickSearch(servers: any[], channels: any[]) {
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const performQuickSearch = (query: string) => {
    if (!query) {
      setSearchResults([]);
      return;
    }

    const serverResults = servers.filter(server => 
      server.name.toLowerCase().includes(query.toLowerCase())
    );

    const channelResults = channels.filter(channel => 
      channel.name.toLowerCase().includes(query.toLowerCase())
    );

    setSearchResults([...serverResults, ...channelResults]);
  };

  return {
    performQuickSearch,
    searchResults
  };
}
