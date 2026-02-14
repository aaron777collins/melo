"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, Hash, Users, Globe, Lock, Plus, X, Loader2, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { UserAvatar } from "@/components/user-avatar";
import { ActionTooltip } from "@/components/action-tooltip";

import { useModal } from "@/hooks/use-modal-store";
import {
  searchPublicSpaces,
  getFeaturedSpaces,
  joinDiscoveredSpace,
  canJoinSpace,
  getSpaceCategories,
  type DiscoveredSpace,
  type SpaceSearchFilters,
  type SpaceCategory,
} from "@/apps/web/services/matrix-room-directory";

// =============================================================================
// Types
// =============================================================================

type DiscoveryView = 'main' | 'create';

// =============================================================================
// Main Component
// =============================================================================

export function ServerDiscoveryModal() {
  const { isOpen, type, onClose, onOpen } = useModal();
  const router = useRouter();
  
  const isModalOpen = isOpen && type === "serverDiscovery";
  
  // View state
  const [currentView, setCurrentView] = useState<DiscoveryView>('main');
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isSearching, setIsSearching] = useState(false);
  
  // Data state
  const [featuredSpaces, setFeaturedSpaces] = useState<DiscoveredSpace[]>([]);
  const [searchResults, setSearchResults] = useState<DiscoveredSpace[]>([]);
  const [categories] = useState<SpaceCategory[]>(getSpaceCategories());
  const [isLoadingFeatured, setIsLoadingFeatured] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Join state tracking
  const [joiningSpaces, setJoiningSpaces] = useState<Set<string>>(new Set());

  // =============================================================================
  // Data Loading
  // =============================================================================

  const loadFeaturedSpaces = useCallback(async () => {
    try {
      setIsLoadingFeatured(true);
      const featured = await getFeaturedSpaces();
      setFeaturedSpaces(featured);
    } catch (error) {
      console.error('Failed to load featured spaces:', error);
      setError('Failed to load featured spaces');
    } finally {
      setIsLoadingFeatured(false);
    }
  }, []);

  const performSearch = useCallback(async (query: string, category: string) => {
    try {
      setIsSearching(true);
      
      const filters: SpaceSearchFilters = {};
      
      if (query.trim()) {
        filters.query = query.trim();
      }
      
      if (category !== 'all') {
        const categoryName = categories.find(c => c.id === category)?.name;
        if (categoryName) {
          filters.categories = [categoryName];
        }
      }
      
      const result = await searchPublicSpaces(filters, { limit: 30 });
      setSearchResults(result.spaces);
    } catch (error) {
      console.error('Search failed:', error);
      // TODO: Show error toast when toast system is implemented
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [categories]);

  // =============================================================================
  // Effects
  // =============================================================================

  useEffect(() => {
    if (isModalOpen) {
      loadFeaturedSpaces();
      setCurrentView('main');
      setSearchQuery('');
      setSelectedCategory('all');
      setSearchResults([]);
    }
  }, [isModalOpen, loadFeaturedSpaces]);

  // Debounced search effect
  useEffect(() => {
    if (!searchQuery.trim() && selectedCategory === 'all') {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      performSearch(searchQuery, selectedCategory);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedCategory, performSearch]);

  // =============================================================================
  // Event Handlers
  // =============================================================================

  const handleJoinSpace = async (space: DiscoveredSpace) => {
    try {
      // Check if user can join
      const canJoin = await canJoinSpace(space.id);
      if (!canJoin) {
        console.warn('Cannot join space - already a member or not allowed');
        return;
      }

      setJoiningSpaces(prev => new Set(prev).add(space.id));
      
      await joinDiscoveredSpace(space.id);
      
      console.log(`Successfully joined ${space.name}!`);
      
      // Close modal and navigate to the space
      onClose();
      router.push(`/servers/${space.id}`);
      
    } catch (error) {
      console.error('Failed to join space:', error);
      // TODO: Show error toast when toast system is implemented
    } finally {
      setJoiningSpaces(prev => {
        const next = new Set(prev);
        next.delete(space.id);
        return next;
      });
    }
  };

  const handleCreateServer = () => {
    setCurrentView('create');
    onClose();
    onOpen('createServer');
  };

  const handleClose = () => {
    onClose();
    setCurrentView('main');
    setSearchQuery('');
    setSelectedCategory('all');
    setSearchResults([]);
  };

  // =============================================================================
  // Render Helpers
  // =============================================================================

  const renderSpaceCard = (space: DiscoveredSpace) => {
    const isJoining = joiningSpaces.has(space.id);
    
    return (
      <div
        key={space.id}
        className="group relative bg-white/5 hover:bg-white/10 rounded-lg p-4 transition-all duration-200 border border-zinc-700/50 hover:border-zinc-600/50"
      >
        {/* Space Avatar & Info */}
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-shrink-0">
            {space.avatarUrl ? (
              <img
                src={space.avatarUrl}
                alt={space.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                {space.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-sm truncate">
              {space.name}
            </h3>
            <div className="flex items-center gap-2 text-zinc-400 text-xs mt-1">
              <Users size={12} />
              <span>{space.memberCount.toLocaleString()} members</span>
              
              {space.guestCanJoin && (
                <ActionTooltip label="Guest access available">
                  <Globe size={12} className="text-emerald-400" />
                </ActionTooltip>
              )}
              
              {!space.worldReadable && (
                <ActionTooltip label="Private space">
                  <Lock size={12} className="text-yellow-400" />
                </ActionTooltip>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {space.topic && (
          <p className="text-zinc-400 text-xs mb-3 line-clamp-2">
            {space.topic}
          </p>
        )}

        {/* Tags */}
        {space.tags && space.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {space.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-xs bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
              >
                {tag}
              </Badge>
            ))}
            {space.tags.length > 3 && (
              <Badge
                variant="secondary"
                className="text-xs bg-zinc-700 text-zinc-400"
              >
                +{space.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Join Button */}
        <Button
          onClick={() => handleJoinSpace(space)}
          disabled={isJoining}
          size="sm"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {isJoining ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Joining...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Join Space
            </>
          )}
        </Button>
      </div>
    );
  };

  // =============================================================================
  // Main Render
  // =============================================================================

  const showSearchResults = searchQuery.trim() || selectedCategory !== 'all';

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-zinc-800 border-zinc-700 p-0 overflow-hidden max-w-4xl max-h-[80vh]">
        
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-zinc-700">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold text-white">
              Discover Servers
            </DialogTitle>
            <Button
              onClick={handleClose}
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <p className="text-sm text-zinc-400 mt-1">
            Find and join public Matrix spaces from across the network
          </p>
        </DialogHeader>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md">
            <p className="text-red-400 text-sm">{error}</p>
            <Button
              onClick={() => setError(null)}
              variant="ghost"
              size="sm"
              className="ml-2 h-auto p-0 text-red-400 hover:text-red-300"
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Search & Filters */}
        <div className="px-6 py-4 border-b border-zinc-700/50">
          <div className="flex gap-4 mb-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-4 h-4" />
              <Input
                placeholder="Search for spaces..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-700/50 border-zinc-600 text-white placeholder:text-zinc-400 focus:border-indigo-500"
              />
            </div>
            
            {/* Create Server Button */}
            <Button
              onClick={handleCreateServer}
              variant="outline"
              className="border-emerald-500 text-emerald-400 hover:bg-emerald-500 hover:text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Server
            </Button>
          </div>

          {/* Category Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <Button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                variant={selectedCategory === category.id ? "default" : "ghost"}
                size="sm"
                className={`whitespace-nowrap ${
                  selectedCategory === category.id
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
                }`}
              >
                {category.icon && <span className="mr-2">{category.icon}</span>}
                {category.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 px-6 py-4">
          {/* Loading State */}
          {isSearching && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <span className="ml-3 text-zinc-400">Searching spaces...</span>
            </div>
          )}

          {/* Search Results */}
          {!isSearching && showSearchResults && (
            <div>
              <h3 className="text-white font-semibold mb-4">
                Search Results
                {searchResults.length > 0 && (
                  <span className="text-zinc-400 font-normal ml-2">
                    ({searchResults.length} found)
                  </span>
                )}
              </h3>
              
              {searchResults.length === 0 ? (
                <div className="text-center py-12">
                  <Hash className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                  <p className="text-zinc-400 text-lg mb-2">No spaces found</p>
                  <p className="text-zinc-500 text-sm">
                    Try adjusting your search or browse featured spaces below
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  {searchResults.map(renderSpaceCard)}
                </div>
              )}
              
              <Separator className="bg-zinc-700 my-6" />
            </div>
          )}

          {/* Featured Spaces */}
          {!showSearchResults && (
            <div>
              <h3 className="text-white font-semibold mb-4">Featured Spaces</h3>
              
              {isLoadingFeatured ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                  <span className="ml-3 text-zinc-400">Loading featured spaces...</span>
                </div>
              ) : featuredSpaces.length === 0 ? (
                <div className="text-center py-12">
                  <Hash className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                  <p className="text-zinc-400 text-lg mb-2">No featured spaces available</p>
                  <p className="text-zinc-500 text-sm">
                    Try searching for specific spaces or create your own
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {featuredSpaces.map(renderSpaceCard)}
                </div>
              )}
            </div>
          )}
        </ScrollArea>

      </DialogContent>
    </Dialog>
  );
}