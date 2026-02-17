'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useParams, usePathname } from 'next/navigation';
import { useUnreadCounts } from '@/hooks/use-unread-counts';
import { NotificationBadge } from '@/components/notification/notification-badge';

interface ServerItemProps {
  id: string;
  name: string;
  icon?: string;
  href: string;
}

export const ServerSidebar = ({ servers }: { servers: ServerItemProps[] }) => {
  const pathname = usePathname();
  const params = useParams();
  const { unreadCounts } = useUnreadCounts();

  return (
    <div className="fixed left-0 top-0 h-full w-[72px] bg-gray-900 flex flex-col items-center py-3 space-y-2 overflow-y-auto">
      {servers.map((server) => {
        const isActive = pathname?.includes(server.href) ?? false;
        const serverUnreads = unreadCounts.servers[server.id] || { totalUnread: 0, mentionsUnread: 0 };
        
        return (
          <Link 
            key={server.id} 
            href={server.href} 
            className={cn(
              "relative group flex items-center justify-center w-12 h-12 rounded-[24px] transition-all duration-200 hover:rounded-[16px]",
              isActive 
                ? "bg-primary text-white rounded-[16px]" 
                : "bg-gray-700 text-gray-400 hover:bg-gray-600"
            )}
          >
            {/* Server Icon */}
            {server.icon ? (
              <img 
                src={server.icon} 
                alt={server.name} 
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <span className="font-bold text-sm">
                {server.name.charAt(0).toUpperCase()}
              </span>
            )}

            {/* Unread Badge */}
            {serverUnreads.totalUnread > 0 && (
              <NotificationBadge 
                count={serverUnreads.totalUnread}
                type={serverUnreads.mentionsUnread > 0 ? 'mention' : 'default'}
                className="absolute -top-1 -right-1"
              />
            )}

            {/* Hover Tooltip */}
            <div className="absolute left-full ml-4 z-50 bg-black text-white text-sm px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {server.name}
            </div>
          </Link>
        );
      })}
    </div>
  );
};