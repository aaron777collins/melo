import React from 'react';
import { cn } from '@/lib/utils';
import rolesService from '@/lib/matrix/roles';

// Define role display names to map power levels to readable names
const POWER_LEVEL_DISPLAY_NAMES: Record<number, string> = {
  [rolesService.MATRIX_POWER_LEVELS.ADMIN]: 'Admin',
  [rolesService.MATRIX_POWER_LEVELS.MODERATOR]: 'Mod',
  [rolesService.MATRIX_POWER_LEVELS.MEMBER]: 'Member',
};

// Use existing color system from the previous user badge
export const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-red-500 text-white',
  admin: 'bg-orange-500 text-white',
  moderator: 'bg-blue-500 text-white',
  member: 'bg-green-500 text-white',
  guest: 'bg-gray-500 text-white',
};

// Extend role hierarchy with power levels
export const ROLE_HIERARCHY = [
  rolesService.MATRIX_POWER_LEVELS.ADMIN,
  rolesService.MATRIX_POWER_LEVELS.MODERATOR,
  rolesService.MATRIX_POWER_LEVELS.MEMBER,
];

export interface UserBadgeProps {
  /** Power level of the user (0-100) */
  powerLevel: number;
  /** Optional custom roles */
  customRoles?: string[];
  /** Optional class to apply to badge */
  className?: string;
}

export const UserBadge: React.FC<UserBadgeProps> = ({ 
  powerLevel, 
  customRoles = [],
  className 
}) => {
  // First check if user has a custom role from the hierarchy
  const customRole = customRoles.length > 0 
    ? ROLE_HIERARCHY.find(role => 
        customRoles.includes(role.toString())
      ) || customRoles[0]
    : null;

  // If custom role exists, use its color
  const topColor = customRole 
    ? (ROLE_COLORS[customRole] || ROLE_COLORS.guest)
    : (ROLE_COLORS[powerLevel.toString()] || 
       rolesService.getDefaultColorForPowerLevel(powerLevel));

  // Determine the display name 
  const displayName = customRole 
    ? customRole
    : (POWER_LEVEL_DISPLAY_NAMES[powerLevel] || 
       (powerLevel >= 100 ? 'Admin' : 
        powerLevel >= 50 ? 'Mod' : 
        powerLevel > 0 ? 'Member' : 'Guest'));

  return (
    <span 
      className={cn(
        'inline-block px-2 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider',
        topColor,
        className
      )}
      title={`Power Level: ${powerLevel}`}
    >
      {displayName}
    </span>
  );
};

export const Username: React.FC<{
  name: string;
  powerLevel: number;
  customRoles?: string[];
  className?: string;
}> = ({ name, powerLevel, customRoles, className }) => {
  return (
    <div className="flex items-center gap-2">
      <span className={cn('font-semibold', className)}>{name}</span>
      <UserBadge powerLevel={powerLevel} customRoles={customRoles} />
    </div>
  );
};

export default UserBadge;