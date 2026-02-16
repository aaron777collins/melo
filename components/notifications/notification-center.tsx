/**
 * Notification Center Component
 * 
 * In-app notification center that displays unread messages, mentions,
 * and other notifications. Features real-time updates and action handling.
 */

"use client";

import React, { useState, useEffect } from "react";
import { 
  Bell, 
  BellOff,
  X,
  Check,
  CheckCheck,
  Trash2,
  Settings,
  MessageCircle,
  AtSign,
  Users,
  UserPlus,
  Hash,
  MessageSquare,
  Heart,
  ChevronDown,
  ChevronUp,
  Filter,
  Clock
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { useNotifications } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NotificationType, type NotificationData } from "@/lib/matrix/notifications";

// =============================================================================
// Types
// =============================================================================

interface NotificationCenterProps {
  className?: string;
  compact?: boolean;
}

interface NotificationItemProps {
  notification: NotificationData;
  onMarkRead: (id: string) => void;
  onNavigate: (roomId: string, eventId?: string) => void;
  compact?: boolean;
}

type NotificationFilter = "all" | "unread" | "mentions" | "dms" | "invites";

// =============================================================================
// Utility Functions
// =============================================================================

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case NotificationType.DirectMessage:
      return MessageCircle;
    case NotificationType.Mention:
    case NotificationType.KeywordHighlight:
      return AtSign;
    case NotificationType.RoomInvite:
      return UserPlus;
    case NotificationType.ThreadReply:
      return MessageSquare;
    case NotificationType.Reaction:
      return Heart;
    case NotificationType.RoomMessage:
      return Hash;
    default:
      return Bell;
  }
}

function getNotificationColor(type: NotificationType): string {
  switch (type) {
    case NotificationType.DirectMessage:
      return "text-blue-500";
    case NotificationType.Mention:
    case NotificationType.KeywordHighlight:
      return "text-red-500";
    case NotificationType.RoomInvite:
      return "text-green-500";
    case NotificationType.ThreadReply:
      return "text-purple-500";
    case NotificationType.Reaction:
      return "text-pink-500";
    default:
      return "text-muted-foreground";
  }
}

function getNotificationTypeName(type: NotificationType): string {
  switch (type) {
    case NotificationType.DirectMessage:
      return "Direct Message";
    case NotificationType.Mention:
      return "Mention";
    case NotificationType.KeywordHighlight:
      return "Keyword";
    case NotificationType.RoomInvite:
      return "Invitation";
    case NotificationType.ThreadReply:
      return "Thread Reply";
    case NotificationType.Reaction:
      return "Reaction";
    case NotificationType.RoomMessage:
      return "Message";
    default:
      return "Notification";
  }
}

// =============================================================================
// Components
// =============================================================================

/**
 * Individual notification item
 */
function NotificationItem({ 
  notification, 
  onMarkRead, 
  onNavigate,
  compact = false 
}: NotificationItemProps) {
  const Icon = getNotificationIcon(notification.type);
  const iconColor = getNotificationColor(notification.type);
  const typeName = getNotificationTypeName(notification.type);
  
  const handleClick = () => {
    if (!notification.read) {
      onMarkRead(notification.id);
    }
    if (notification.roomId) {
      onNavigate(notification.roomId, notification.eventId);
    }
  };

  const handleMarkRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkRead(notification.id);
  };

  return (
    <Card 
      className={`
        cursor-pointer transition-all hover:shadow-md group
        ${notification.read ? 'opacity-60' : 'ring-1 ring-primary/20'}
        ${compact ? 'p-2' : ''}
      `}
      onClick={handleClick}
    >
      <CardContent className={compact ? "p-3" : "p-4"}>
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <Avatar className={compact ? "h-8 w-8" : "h-10 w-10"}>
            {notification.avatar ? (
              <AvatarImage src={notification.avatar} />
            ) : (
              <AvatarFallback>
                <Icon className={`h-4 w-4 ${iconColor}`} />
              </AvatarFallback>
            )}
          </Avatar>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {/* Title */}
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={`font-medium truncate ${compact ? 'text-sm' : ''}`}>
                    {notification.title}
                  </h4>
                  <Badge variant="secondary" className={`text-xs ${compact ? 'px-1.5 py-0' : ''}`}>
                    {typeName}
                  </Badge>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                  )}
                </div>

                {/* Body */}
                <p className={`text-muted-foreground line-clamp-2 ${compact ? 'text-xs' : 'text-sm'}`}>
                  {notification.body}
                </p>

                {/* Timestamp */}
                <div className="flex items-center gap-2 mt-2">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!notification.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={handleMarkRead}
                    title="Mark as read"
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Notification filter and controls
 */
function NotificationControls({ 
  filter, 
  onFilterChange, 
  unreadCount, 
  onMarkAllRead, 
  onClearAll 
}: {
  filter: NotificationFilter;
  onFilterChange: (filter: NotificationFilter) => void;
  unreadCount: number;
  onMarkAllRead: () => void;
  onClearAll: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      {/* Filter */}
      <Select value={filter} onValueChange={(value) => onFilterChange(value as NotificationFilter)}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="unread">Unread</SelectItem>
          <SelectItem value="mentions">Mentions</SelectItem>
          <SelectItem value="dms">Direct Messages</SelectItem>
          <SelectItem value="invites">Invitations</SelectItem>
        </SelectContent>
      </Select>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={onMarkAllRead}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all read ({unreadCount})
          </Button>
        )}
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48">
            <div className="space-y-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start text-destructive"
                onClick={onClearAll}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear all
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

/**
 * Empty state component
 */
function EmptyState({ filter }: { filter: NotificationFilter }) {
  const getMessage = () => {
    switch (filter) {
      case "unread":
        return "No unread notifications";
      case "mentions":
        return "No mentions";
      case "dms":
        return "No direct messages";
      case "invites":
        return "No invitations";
      default:
        return "No notifications yet";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <BellOff className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">{getMessage()}</h3>
      <p className="text-sm text-muted-foreground max-w-md">
        {filter === "all" 
          ? "When you receive notifications, they'll appear here."
          : "Change your filter to see other notifications."
        }
      </p>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Main notification center component
 */
export function NotificationCenter({ className, compact = false }: NotificationCenterProps) {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    isLoading,
    error
  } = useNotifications();

  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case "unread":
        return !notification.read;
      case "mentions":
        return notification.type === NotificationType.Mention || 
               notification.type === NotificationType.KeywordHighlight;
      case "dms":
        return notification.type === NotificationType.DirectMessage;
      case "invites":
        return notification.type === NotificationType.RoomInvite;
      default:
        return true;
    }
  });

  // Handle navigation to room
  const handleNavigate = (roomId: string, eventId?: string) => {
    if (typeof window !== "undefined") {
      const url = eventId ? `/rooms/${roomId}#${eventId}` : `/rooms/${roomId}`;
      window.location.href = url;
    }
  };

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <X className="h-5 w-5" />
            Notification Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {error.message}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </CardTitle>
          </div>
          
          {!compact && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
        
        {!compact && (
          <CardDescription>
            Real-time notifications from your Matrix rooms and direct messages
          </CardDescription>
        )}
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="pt-0">
          {/* Controls */}
          {!compact && (
            <NotificationControls
              filter={filter}
              onFilterChange={setFilter}
              unreadCount={unreadCount}
              onMarkAllRead={markAllAsRead}
              onClearAll={clearAll}
            />
          )}

          {/* Notifications List */}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <EmptyState filter={filter} />
          ) : (
            <ScrollArea className={compact ? "h-64" : "h-96"}>
              <div className="space-y-3">
                {filteredNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkRead={markAsRead}
                    onNavigate={handleNavigate}
                    compact={compact}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      )}
    </Card>
  );
}

/**
 * Compact notification bell with popover
 */
export function NotificationBell({ className }: { className?: string }) {
  const { unreadCount, isLoading } = useNotifications();
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className={`relative ${className}`}>
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-96 p-0" align="end">
        <NotificationCenter compact />
      </PopoverContent>
    </Popover>
  );
}

export default NotificationCenter;