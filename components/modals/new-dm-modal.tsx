"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useModal } from '@/hooks/use-modal-store';
import { useMatrixClient } from '@/hooks/use-matrix-client';

// Types for Matrix user search results
interface MatrixUser {
  user_id: string;
  display_name?: string;
  avatar_url?: string;
}

interface MatrixUserSearchResponse {
  results: MatrixUser[];
  limited: boolean;
}

interface NewDMModalProps {
  isOpen?: boolean;
}

/**
 * New DM Creation Modal Component
 * 
 * Provides user search interface and Matrix DM room creation integration.
 * Covers AC-2 and AC-3 from US-P2-04:
 * - AC-2: New DM modal with user search interface
 * - AC-3: User selection creates/opens DM conversation
 */
export function NewDMModal({ isOpen: propIsOpen }: NewDMModalProps) {
  const { isOpen: modalIsOpen, type, onClose } = useModal();
  const { client } = useMatrixClient();
  const router = useRouter();

  // Use prop isOpen if provided (for testing), otherwise use modal store
  const isModalOpen = propIsOpen !== undefined ? propIsOpen : (modalIsOpen && type === 'newDM');

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<MatrixUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreatingDM, setIsCreatingDM] = useState(false);

  // Get current user ID to filter out self from results
  const currentUserId = client?.getUserId();

  // Debounced search effect
  useEffect(() => {
    if (!searchTerm.trim() || !client) {
      setSearchResults([]);
      return;
    }

    const searchDebounceTimer = setTimeout(async () => {
      try {
        setIsSearching(true);
        
        const response = await client.searchUserDirectory({
          search_term: searchTerm.trim(),
          limit: 10,
        }) as MatrixUserSearchResponse;

        // Filter out the current user from results
        const filteredResults = response.results.filter(
          user => user.user_id !== currentUserId
        );

        setSearchResults(filteredResults);
      } catch (error) {
        console.error('User search failed:', error);
        toast.error('Failed to search users. Please try again.');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(searchDebounceTimer);
  }, [searchTerm, client, currentUserId]);

  // Create DM with selected user
  const createDMWithUser = async (targetUser: MatrixUser) => {
    if (!client || isCreatingDM) return;

    try {
      setIsCreatingDM(true);

      // Create a Matrix DM room
      const response = await client.createRoom({
        is_direct: true,
        invite: [targetUser.user_id],
        preset: 'private_chat',
      });

      // Navigate to the new DM conversation
      router.push(`/channels/@me/${response.room_id}`);
      
      // Close the modal
      if (onClose) {
        onClose();
      }

      // Show success message
      toast.success('Direct message conversation created!');

      // Reset state
      setSearchTerm('');
      setSearchResults([]);
    } catch (error: any) {
      console.error('Failed to create DM:', error);
      
      // Handle specific error types
      if (error.httpStatus === 429) {
        toast.error('Rate limited. Please wait and try again.');
      } else {
        toast.error('Failed to create conversation. Please try again.');
      }
    } finally {
      setIsCreatingDM(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
    // Reset state when closing
    setSearchTerm('');
    setSearchResults([]);
    setIsCreatingDM(false);
  };

  // Handle keyboard events
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      handleClose();
    }
  };

  // Generate user avatar fallback (first letter of display name or user ID)
  const getUserAvatarFallback = (user: MatrixUser) => {
    if (user.display_name) {
      return user.display_name.charAt(0).toUpperCase();
    }
    return user.user_id.charAt(1).toUpperCase(); // Skip @ symbol
  };

  // Memoized search results component
  const SearchResultsComponent = useMemo(() => {
    if (isSearching) {
      return (
        <div className="flex items-center justify-center py-8 text-zinc-500">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-500 rounded-full animate-spin" />
            <span>Searching...</span>
          </div>
        </div>
      );
    }

    if (!searchTerm.trim()) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
          <MessageCircle className="w-12 h-12 mb-4 text-zinc-400" />
          <p className="text-lg font-medium mb-1">Type to search for users</p>
          <p className="text-sm">Enter a username or display name to find people</p>
        </div>
      );
    }

    if (searchResults.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
          <MessageCircle className="w-12 h-12 mb-4 text-zinc-400" />
          <p className="text-lg font-medium mb-1">No users found</p>
          <p className="text-sm">Try a different search term</p>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {searchResults.map((user) => (
          <button
            key={user.user_id}
            data-testid={`user-result-${user.user_id}`}
            onClick={() => createDMWithUser(user)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                createDMWithUser(user);
              }
            }}
            disabled={isCreatingDM}
            className="w-full flex items-center space-x-3 p-3 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
          >
            <Avatar className="w-10 h-10">
              <AvatarImage 
                src={user.avatar_url ? `${client?.getHomeserverUrl()}/_matrix/media/r0/thumbnail/${user.avatar_url.replace('mxc://', '')}?width=40&height=40&method=crop` : undefined} 
                alt={user.display_name || user.user_id}
              />
              <AvatarFallback className="bg-indigo-500 text-white text-sm font-medium">
                {getUserAvatarFallback(user)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                {user.display_name || user.user_id}
              </p>
              {user.display_name && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                  {user.user_id}
                </p>
              )}
            </div>
            {isCreatingDM && (
              <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-500 rounded-full animate-spin" />
            )}
          </button>
        ))}
      </div>
    );
  }, [searchTerm, searchResults, isSearching, isCreatingDM, client, createDMWithUser]);

  if (!isModalOpen) {
    return null;
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent 
        data-testid="new-dm-modal"
        className="sm:max-w-md"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              New Direct Message
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              aria-label="Close modal"
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search for users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          {/* Loading/Creating State */}
          {isCreatingDM && (
            <div className="flex items-center justify-center py-4 text-zinc-600 dark:text-zinc-400">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-500 rounded-full animate-spin" />
                <span>Creating conversation...</span>
              </div>
            </div>
          )}

          {/* Search Results */}
          <ScrollArea className="h-80" data-testid="user-search-results">
            {SearchResultsComponent}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}