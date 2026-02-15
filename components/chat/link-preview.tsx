"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * OpenGraph metadata interface
 */
export interface OpenGraphData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  type?: string;
}

/**
 * Props for LinkPreview component
 */
interface LinkPreviewProps {
  /**
   * The URL to generate a preview for
   */
  url: string;
  
  /**
   * Optional CSS class name
   */
  className?: string;
  
  /**
   * Whether to show the preview inline or as a card
   */
  variant?: "inline" | "card";
  
  /**
   * Maximum width of the preview
   */
  maxWidth?: string;
}

/**
 * Utility to extract URLs from text
 */
export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s<>"]+[^\s<>".,;:])/gi;
  return text.match(urlRegex) || [];
}

/**
 * Link Preview Component - Shows OpenGraph metadata for URLs
 */
export function LinkPreview({ 
  url, 
  className,
  variant = "card",
  maxWidth = "400px"
}: LinkPreviewProps) {
  const [ogData, setOgData] = useState<OpenGraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchPreview = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/og-preview?url=${encodeURIComponent(url)}`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        const data: OpenGraphData = await response.json();
        
        if (isMounted) {
          setOgData(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load preview');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Add a small delay to prevent excessive API calls
    const timer = setTimeout(fetchPreview, 300);
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [url]);

  // Loading state
  if (loading) {
    return (
      <div
        className={cn(
          "animate-pulse bg-muted rounded-md",
          variant === "card" ? "h-24 p-3" : "h-6",
          className
        )}
        style={{ maxWidth }}
      >
        <div className="flex space-x-3">
          {variant === "card" && (
            <div className="w-16 h-16 bg-muted-foreground/20 rounded-md" />
          )}
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted-foreground/20 rounded" />
            <div className="h-3 bg-muted-foreground/20 rounded w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card 
        className={cn(
          "border-destructive/50 bg-destructive/5",
          className
        )}
        style={{ maxWidth }}
      >
        <CardContent className="p-3">
          <div className="flex items-center space-x-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>Failed to load preview</span>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No data available - show minimal link
  if (!ogData || (!ogData.title && !ogData.description && !ogData.image)) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex items-center space-x-1 text-sm text-primary hover:underline",
          className
        )}
      >
        <span className="truncate">{url}</span>
        <ExternalLink className="h-3 w-3 flex-shrink-0" />
      </a>
    );
  }

  const hostname = new URL(url).hostname;

  // Inline variant - compact display
  if (variant === "inline") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex items-center space-x-2 text-sm hover:underline",
          className
        )}
      >
        {ogData.image && (
          <img
            src={ogData.image}
            alt=""
            className="w-4 h-4 rounded object-cover flex-shrink-0"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        <span className="text-primary truncate">
          {ogData.title || hostname}
        </span>
        <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
      </a>
    );
  }

  // Card variant - full preview card
  return (
    <Card 
      className={cn(
        "overflow-hidden hover:bg-accent/50 transition-colors cursor-pointer",
        className
      )}
      style={{ maxWidth }}
      onClick={() => window.open(url, '_blank')}
    >
      <CardContent className="p-0">
        <div className="flex">
          {ogData.image && (
            <div className="w-24 h-20 flex-shrink-0">
              <img
                src={ogData.image}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.parentElement?.remove();
                }}
              />
            </div>
          )}
          <div className="flex-1 p-3 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                {ogData.title && (
                  <h3 className="font-medium text-sm leading-tight text-foreground truncate">
                    {ogData.title}
                  </h3>
                )}
                {ogData.description && (
                  <p className="text-xs text-muted-foreground mt-1 overflow-hidden" style={{ 
                    display: '-webkit-box', 
                    WebkitLineClamp: 2, 
                    WebkitBoxOrient: 'vertical' 
                  }}>
                    {ogData.description}
                  </p>
                )}
                <div className="flex items-center mt-2 text-xs text-muted-foreground">
                  {ogData.siteName && (
                    <span className="truncate">{ogData.siteName}</span>
                  )}
                  {(!ogData.siteName || ogData.siteName !== hostname) && (
                    <span className="truncate">
                      {ogData.siteName ? ` • ${hostname}` : hostname}
                    </span>
                  )}
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground ml-2 flex-shrink-0" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Hook to extract and preview URLs from message content
 */
export function useMessageLinkPreviews(content: string) {
  const urls = extractUrls(content);
  const [previews, setPreviews] = useState<{ [url: string]: OpenGraphData | null }>({});
  const [loadingStates, setLoadingStates] = useState<{ [url: string]: boolean }>({});

  useEffect(() => {
    // Reset state when URLs change
    const newLoadingStates: { [url: string]: boolean } = {};
    urls.forEach(url => {
      newLoadingStates[url] = true;
    });
    setLoadingStates(newLoadingStates);
    
    // Fetch previews for new URLs
    urls.forEach(async (url) => {
      try {
        const response = await fetch(`/api/og-preview?url=${encodeURIComponent(url)}`);
        if (response.ok) {
          const data = await response.json();
          setPreviews(prev => ({ ...prev, [url]: data }));
        } else {
          setPreviews(prev => ({ ...prev, [url]: null }));
        }
      } catch (error) {
        setPreviews(prev => ({ ...prev, [url]: null }));
      } finally {
        setLoadingStates(prev => ({ ...prev, [url]: false }));
      }
    });
  }, [urls]);

  return {
    urls,
    previews,
    loadingStates,
    hasValidPreviews: urls.some(url => previews[url] && (previews[url]?.title || previews[url]?.image))
  };
}