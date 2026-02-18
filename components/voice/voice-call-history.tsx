"use client";

import React, { useState } from "react";
import { 
  Clock, 
  Phone, 
  PhoneOff, 
  Video, 
  Users, 
  Calendar,
  Filter,
  Search,
  Trash2,
  RefreshCw
} from "lucide-react";
import { formatDistanceToNow, format, isToday, isYesterday, subDays } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ActionTooltip } from "@/components/action-tooltip";
import { useVoiceChannelManager, VoiceCallHistoryItem } from "@/hooks/use-voice-channel-manager";

interface VoiceCallHistoryProps {
  className?: string;
}

export function VoiceCallHistory({ className }: VoiceCallHistoryProps) {
  const { callHistory } = useVoiceChannelManager();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState<"all" | "voice" | "video" | "today" | "week">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "duration">("newest");

  // Filter and sort call history
  const filteredAndSortedCalls = React.useMemo(() => {
    let filtered = callHistory;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(call => 
        call.channelName.toLowerCase().includes(term) ||
        call.spaceName.toLowerCase().includes(term)
      );
    }

    // Apply type/date filters
    switch (filterBy) {
      case "voice":
        filtered = filtered.filter(call => !call.isVideoCall);
        break;
      case "video":
        filtered = filtered.filter(call => call.isVideoCall);
        break;
      case "today":
        filtered = filtered.filter(call => isToday(call.startTime));
        break;
      case "week":
        const weekAgo = subDays(new Date(), 7);
        filtered = filtered.filter(call => call.startTime > weekAgo.getTime());
        break;
    }

    // Apply sorting
    switch (sortBy) {
      case "newest":
        filtered = filtered.sort((a, b) => b.startTime - a.startTime);
        break;
      case "oldest":
        filtered = filtered.sort((a, b) => a.startTime - b.startTime);
        break;
      case "duration":
        filtered = filtered.sort((a, b) => (b.duration || 0) - (a.duration || 0));
        break;
    }

    return filtered;
  }, [callHistory, searchTerm, filterBy, sortBy]);

  const formatCallDuration = (duration?: number) => {
    if (!duration) return "< 1 min";
    
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    
    if (minutes === 0) {
      return `${seconds}s`;
    } else if (minutes < 60) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  };

  const formatCallDate = (timestamp: number) => {
    const date = new Date(timestamp);
    
    if (isToday(date)) {
      return `Today at ${format(date, 'h:mm a')}`;
    } else if (isYesterday(date)) {
      return `Yesterday at ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, yyyy \'at\' h:mm a');
    }
  };

  const getEndReasonIcon = (reason: VoiceCallHistoryItem["endReason"]) => {
    switch (reason) {
      case "left":
        return <PhoneOff className="h-3 w-3 text-zinc-500" />;
      case "kicked":
        return <PhoneOff className="h-3 w-3 text-red-500" />;
      case "disconnected":
      case "error":
        return <PhoneOff className="h-3 w-3 text-orange-500" />;
      default:
        return <PhoneOff className="h-3 w-3 text-zinc-500" />;
    }
  };

  const getEndReasonText = (reason: VoiceCallHistoryItem["endReason"]) => {
    switch (reason) {
      case "left":
        return "Left call";
      case "kicked":
        return "Removed from call";
      case "disconnected":
        return "Connection lost";
      case "error":
        return "Call failed";
      default:
        return "Call ended";
    }
  };

  const clearHistory = () => {
    // TODO: Implement clear history functionality
    console.log("Clear history requested");
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Call History
        </h3>
        
        <div className="flex items-center gap-2">
          <ActionTooltip label="Clear all history">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearHistory}
              className="h-8 w-8 p-0 text-zinc-500 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </ActionTooltip>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search calls..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Calls</SelectItem>
              <SelectItem value="voice">Voice Only</SelectItem>
              <SelectItem value="video">Video Only</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="duration">Duration</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Call History List */}
      <ScrollArea className="h-96">
        {filteredAndSortedCalls.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            {callHistory.length === 0 ? (
              <>
                <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No call history yet</p>
                <p className="text-sm">Your voice and video calls will appear here</p>
              </>
            ) : (
              <>
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No calls found</p>
                <p className="text-sm">Try adjusting your search or filters</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredAndSortedCalls.map((call) => (
              <CallHistoryItem
                key={call.id}
                call={call}
                formatDuration={formatCallDuration}
                formatDate={formatCallDate}
                getEndReasonIcon={getEndReasonIcon}
                getEndReasonText={getEndReasonText}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Statistics */}
      {callHistory.length > 0 && (
        <div className="mt-6 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
          <h4 className="font-medium mb-3 text-sm text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">
            Statistics
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-zinc-500 dark:text-zinc-400">Total Calls</p>
              <p className="font-semibold">{callHistory.length}</p>
            </div>
            <div>
              <p className="text-zinc-500 dark:text-zinc-400">Voice Calls</p>
              <p className="font-semibold">
                {callHistory.filter(call => !call.isVideoCall).length}
              </p>
            </div>
            <div>
              <p className="text-zinc-500 dark:text-zinc-400">Video Calls</p>
              <p className="font-semibold">
                {callHistory.filter(call => call.isVideoCall).length}
              </p>
            </div>
            <div>
              <p className="text-zinc-500 dark:text-zinc-400">Total Time</p>
              <p className="font-semibold">
                {formatCallDuration(
                  callHistory.reduce((total, call) => total + (call.duration || 0), 0)
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Individual call history item component
interface CallHistoryItemProps {
  call: VoiceCallHistoryItem;
  formatDuration: (duration?: number) => string;
  formatDate: (timestamp: number) => string;
  getEndReasonIcon: (reason: VoiceCallHistoryItem["endReason"]) => React.ReactNode;
  getEndReasonText: (reason: VoiceCallHistoryItem["endReason"]) => string;
}

function CallHistoryItem({
  call,
  formatDuration,
  formatDate,
  getEndReasonIcon,
  getEndReasonText,
}: CallHistoryItemProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="p-3 rounded-lg border dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`p-2 rounded-full ${
            call.isVideoCall 
              ? "bg-blue-500/20 text-blue-600" 
              : "bg-green-500/20 text-green-600"
          }`}>
            {call.isVideoCall ? (
              <Video className="h-4 w-4" />
            ) : (
              <Phone className="h-4 w-4" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">#{call.channelName}</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
              {call.spaceName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>{call.participants.length}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatDuration(call.duration)}</span>
          </div>
          
          <ActionTooltip label={getEndReasonText(call.endReason)}>
            <div className="flex items-center gap-1">
              {getEndReasonIcon(call.endReason)}
            </div>
          </ActionTooltip>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span>{formatDate(call.startTime)}</span>
        
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-auto p-1 text-xs">
              Details
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {call.isVideoCall ? (
                  <Video className="h-4 w-4 text-blue-600" />
                ) : (
                  <Phone className="h-4 w-4 text-green-600" />
                )}
                Call Details
              </DialogTitle>
              <DialogDescription>
                Information about this {call.isVideoCall ? "video" : "voice"} call
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Channel</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  #{call.channelName} in {call.spaceName}
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-2">Duration</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  {formatDuration(call.duration)}
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-2">Started</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  {formatDate(call.startTime)}
                </p>
              </div>
              
              {call.endTime && (
                <div>
                  <p className="text-sm font-medium mb-2">Ended</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300 flex items-center gap-2">
                    {formatDate(call.endTime)}
                    <span className="text-zinc-500">
                      ({getEndReasonText(call.endReason)})
                    </span>
                  </p>
                </div>
              )}
              
              <div>
                <p className="text-sm font-medium mb-2">Participants ({call.participants.length})</p>
                <div className="text-sm text-zinc-600 dark:text-zinc-300 space-y-1">
                  {call.participants.map((participant, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Users className="h-3 w-3" />
                      {participant}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}