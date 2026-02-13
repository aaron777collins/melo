'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { QuickSwitcherWrapper } from '@/apps/web/components/quick-switcher/quick-switcher';

export default function ChannelPage({ 
  params 
}: { 
  params: { 
    serverId: string, 
    channelId: string 
  } 
}) {
  const pathname = usePathname();

  // Verify URL matches expected format
  useEffect(() => {
    // Validate server and channel IDs
    if (!params.serverId || !params.channelId) {
      console.error('Invalid server or channel ID');
      // Optionally redirect to a default or error page
    }
  }, [params.serverId, params.channelId]);

  return (
    <div>
      {/* Quick Switcher */}
      <QuickSwitcherWrapper />

      {/* Channel Content */}
      <div>
        <h1>Server {params.serverId}, Channel {params.channelId}</h1>
        {/* Actual channel content goes here */}
      </div>
    </div>
  );
}