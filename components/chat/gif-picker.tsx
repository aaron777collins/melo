"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { tenorAPI, TenorGif } from "@/lib/gif-api";

interface GifPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onGifSelect: (gifUrl: string) => void;
}

export function GifPicker({ isOpen, onClose, onGifSelect }: GifPickerProps) {
  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>();

  // Load trending GIFs on initial open
  const loadTrendingGifs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await tenorAPI.getTrendingGifs(20);
      setGifs(response.results);
      setNextCursor(response.next);
    } catch (err) {
      setError("Failed to load trending GIFs");
      console.error("Error loading trending GIFs:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Search GIFs based on query
  const searchGifs = useCallback(async (query: string) => {
    if (!query.trim()) {
      loadTrendingGifs();
      return;
    }

    setIsSearching(true);
    setError(null);
    
    try {
      const response = await tenorAPI.searchGifs(query, 20);
      setGifs(response.results);
      setNextCursor(response.next);
    } catch (err) {
      setError("Failed to search GIFs");
      console.error("Error searching GIFs:", err);
    } finally {
      setIsSearching(false);
    }
  }, [loadTrendingGifs]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchGifs(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchGifs]);

  // Load trending GIFs when modal opens
  useEffect(() => {
    if (isOpen && gifs.length === 0) {
      loadTrendingGifs();
    }
  }, [isOpen, loadTrendingGifs, gifs.length]);

  // Handle GIF selection
  const handleGifClick = useCallback((gif: TenorGif) => {
    const gifUrl = tenorAPI.getOptimalGifUrl(gif);
    onGifSelect(gifUrl);
    onClose();
  }, [onGifSelect, onClose]);

  // Handle search input change
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Choose a GIF</DialogTitle>
        </DialogHeader>
        
        <div className="p-6 pt-4">
          {/* Search Input */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search for GIFs..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Loading State */}
          {(isLoading || isSearching) && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">
                {isLoading ? "Loading trending GIFs..." : "Searching..."}
              </span>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && !isSearching && (
            <div className="text-center py-12">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={loadTrendingGifs} variant="outline">
                Try Again
              </Button>
            </div>
          )}

          {/* GIF Grid */}
          {!isLoading && !isSearching && !error && gifs.length > 0 && (
            <ScrollArea className="h-96 w-full">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {gifs.map((gif) => {
                  const gifUrl = tenorAPI.getOptimalGifUrl(gif);
                  const dimensions = tenorAPI.getGifDimensions(gif);
                  
                  return (
                    <button
                      key={gif.id}
                      onClick={() => handleGifClick(gif)}
                      className="relative group aspect-video bg-muted rounded-md overflow-hidden hover:ring-2 hover:ring-primary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <img
                        src={gifUrl}
                        alt={gif.content_description || gif.title || "GIF"}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          // Hide broken images
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                      
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
                      
                      {/* Title overlay */}
                      {gif.title && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                          <p className="text-white text-xs font-medium truncate">
                            {gif.title}
                          </p>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          {/* No Results */}
          {!isLoading && !isSearching && !error && gifs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery 
                  ? `No GIFs found for "${searchQuery}"`
                  : "No trending GIFs available"
                }
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              Powered by Tenor
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}