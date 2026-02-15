import React from 'react';
import { cn } from '@/lib/utils';

// Role definitions with color mapping
export const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-red-500 text-white',
  admin: 'bg-orange-500 text-white',
  moderator: 'bg-blue-500 text-white',
  member: 'bg-green-500 text-white',
  guest: 'bg-gray-500 text-white',
};

// Role hierarchy (top role has priority)
export const ROLE_HIERARCHY = [
  'owner',
  'admin', 
  'moderator',
  'member',
  'guest'
];

export interface UserBadgeProps {
  roles: string[];
  className?: string;
}

export const UserBadge: React.FC<UserBadgeProps> = ({ 
  roles, 
  className 
}) => {
  // Get the highest priority role
  const topRole = roles.length > 0 
    ? ROLE_HIERARCHY.find(hierarchyRole => 
        roles.includes(hierarchyRole)
      ) || roles[0]
    : 'guest';

  // Fallback to 'guest' if no valid role found
  const roleColor = ROLE_COLORS[topRole] || ROLE_COLORS.guest;

  return (
    <span 
      className={cn(
        'inline-block px-2 py-0.5 rounded-md text-xs font-semibold uppercase',
        roleColor,
        className
      )}
    >
      {topRole}
    </span>
  );
};

export const Username: React.FC<{
  name: string;
  roles: string[];
  className?: string;
}> = ({ name, roles, className }) => {
  return (
    <div className="flex items-center gap-2">
      <span className={cn('font-semibold', className)}>{name}</span>
      <UserBadge roles={roles} />
    </div>
  );
};

export default UserBadge;