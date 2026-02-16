'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUnreadCounts } from '@/hooks/use-unread-counts';
import { NotificationBadge } from '@/components/notification/notification-badge';
import { 
  MessageCircle, 
  Settings, 
  Users, 
  Bell, 
  HelpCircle 
} from 'lucide-react';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ElementType;
  requiresNotification?: boolean;
}

export const NavigationSidebar = () => {
  const pathname = usePathname();
  const { unreadCounts } = useUnreadCounts();

  const navigationItems: NavigationItem[] = [
    { 
      name: 'Direct Messages', 
      href: '/channels/dms', 
      icon: MessageCircle,
      requiresNotification: true 
    },
    { 
      name: 'Notifications', 
      href: '/notifications', 
      icon: Bell,
      requiresNotification: true 
    },
    { 
      name: 'Friends', 
      href: '/friends', 
      icon: Users 
    },
    { 
      name: 'Settings', 
      href: '/settings', 
      icon: Settings 
    },
    { 
      name: 'Help', 
      href: '/help', 
      icon: HelpCircle 
    }
  ];

  const getNotificationCount = (item: NavigationItem) => {
    switch (item.name) {
      case 'Direct Messages':
        return Object.values(unreadCounts.directMessages).reduce((total, dm) => total + dm.totalUnread, 0);
      case 'Notifications':
        return unreadCounts.totalUnread;
      default:
        return 0;
    }
  };

  return (
    <div className="fixed left-[72px] top-0 w-[240px] h-full bg-gray-800 p-4 border-r border-gray-700 flex flex-col">
      <nav className="space-y-2">
        {navigationItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const notificationCount = getNotificationCount(item);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center p-2 rounded-md transition-colors duration-200 group",
                isActive 
                  ? "bg-gray-700 text-white" 
                  : "text-gray-400 hover:bg-gray-700 hover:text-gray-200"
              )}
            >
              <item.icon className="w-5 h-5 mr-3" />
              <span className="flex-grow">{item.name}</span>
              
              {item.requiresNotification && notificationCount > 0 && (
                <NotificationBadge 
                  count={notificationCount}
                  type={item.name === 'Notifications' ? 'highlight' : 'default'}
                  className="absolute right-1"
                />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};