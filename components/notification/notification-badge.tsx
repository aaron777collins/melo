import React from 'react';
import { cn } from '@/lib/utils';
import { NotificationBadgeProps, NotificationType } from '@/types/notifications';

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count = 0,
  type = 'default',
  className,
}) => {
  if (count <= 0) return null;

  const typeClassMap: Record<NotificationType, string> = {
    default: 'bg-gray-500 text-white',
    mention: 'bg-red-500 text-white',
    highlight: 'bg-yellow-500 text-black',
  };

  return (
    <div 
      className={cn(
        'absolute min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-semibold',
        typeClassMap[type],
        className
      )}
    >
      {count > 99 ? '99+' : count}
    </div>
  );
};