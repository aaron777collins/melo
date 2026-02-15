"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

import { useModal } from "@/hooks/use-modal-store";

interface TenorGif {
  id: string;
  title: string;
  content_description: string;
  media_formats: {
    gif: {
      url: string;
      preview: string;
      dims: [number, number];
      size: number;
    };
    tinygif: {
      url: string;
      preview: string;
      dims: [number, number];
      size: number;
    };
    nanogif: {
      url: string;
      preview: string;
      dims: [number, number];
      size: number;
    };
  };
}

interface TenorResponse {
  results: TenorGif[];
  next: string;
}

const TENOR_API_KEY = process.env.NEXT_PUBLIC_TENOR_API_KEY;
const TENOR_BASE_URL = "https://tenor.googleapis.com/v2";

export function GifPickerModal() {
  const { isOpen, onClose, type, data } = useModal();
  const [searchQuery, setSearchQuery] = useState("");
  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isModalOpen = isOpen && type === "gifPicker";
  const { onGifSelect } = data;

  // Load trending GIFs on modal open
  useEffect(() => {
    if (isModalOpen) {
      loadTrendingGifs();
      // Focus search input when modal opens
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isModalOpen]);

  const loadTrendingGifs = async () => {
    if (!TENOR_API_KEY || TENOR_API_KEY === 'YOUR_TENOR_API_KEY_HERE') {
      setError("Tenor API key not configured. Please set NEXT_PUBLIC_TENOR_API_KEY in your environment variables.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${TENOR_BASE_URL}/trending?key=${TENOR_API_KEY}&client_key=haos&limit=20&media_filter=gif,tinygif`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data: TenorResponse = await response.json();
      setGifs(data.results);
    } catch (err) {
      console.error("Failed to load trending GIFs:", err);
      setError("Failed to load GIFs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const searchGifs = async (query: string) => {
    if (!TENOR_API_KEY || TENOR_API_KEY === 'YOUR_TENOR_API_KEY_HERE') {
      setError("Tenor API key not configured");
      return;
    }

    if (!query.trim()) {
      loadTrendingGifs();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${TENOR_BASE_URL}/search?key=${TENOR_API_KEY}&client_key=haos&q=${encodeURIComponent(query)}&limit=20&media_filter=gif,tinygif`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data: TenorResponse = await response.json();
      setGifs(data.results);
    } catch (err) {
      console.error("Failed to search GIFs:", err);
      setError("Failed to search GIFs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchGifs(searchQuery);
  };

  const handleGifSelect = (gif: TenorGif) => {
    // Use the regular gif URL for sending, tinygif for preview if available
    const gifUrl = gif.media_formats.gif?.url || gif.media_formats.tinygif?.url;
    if (gifUrl && onGifSelect) {
      onGifSelect(gifUrl);
    }
    handleClose();
  };

  const handleClose = () => {
    setSearchQuery("");
    setGifs([]);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Choose a GIF</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for GIFs..."
                className="pl-10"
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
          </form>

          {/* Error Message */}
          {error && (
            <div className="text-center py-4">
              <p className="text-red-500 text-sm">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadTrendingGifs()}
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* GIF Grid */}
          <ScrollArea className="h-96">
            {loading && gifs.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading GIFs...</span>
              </div>
            ) : gifs.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-1">
                {gifs.map((gif) => (
                  <button
                    key={gif.id}
                    onClick={() => handleGifSelect(gif)}
                    className="relative aspect-square rounded-lg overflow-hidden hover:opacity-80 transition-opacity bg-muted"
                    title={gif.content_description || gif.title}
                  >
                    <img
                      src={gif.media_formats.tinygif?.url || gif.media_formats.nanogif?.url || gif.media_formats.gif?.preview}
                      alt={gif.content_description || gif.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        // Try fallback URL if image fails to load
                        const target = e.target as HTMLImageElement;
                        if (gif.media_formats.gif?.preview && target.src !== gif.media_formats.gif.preview) {
                          target.src = gif.media_formats.gif.preview;
                        }
                      }}
                    />
                  </button>
                ))}
              </div>
            ) : !loading && !error ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No GIFs found</p>
                <p className="text-sm text-muted-foreground mt-1">Try a different search term</p>
              </div>
            ) : null}
          </ScrollArea>

          {/* Footer */}
          <div className="flex justify-between items-center pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Powered by Tenor
            </p>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}