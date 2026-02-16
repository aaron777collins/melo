"use client";

/**
 * Enhanced 404 Not Found Page Component
 * 
 * Provides a user-friendly 404 page with helpful navigation options,
 * search suggestions, and recovery paths for HAOS-V2.
 */

import React, { useState, useEffect } from "react";
import { 
  Search, 
  Home, 
  MessageCircle, 
  Users, 
  Settings, 
  ArrowLeft,
  Compass,
  Clock,
  ExternalLink,
  Lightbulb
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

// =============================================================================
// Types
// =============================================================================

interface QuickAction {
  icon: React.ComponentType<any>;
  label: string;
  description: string;
  href: string;
  color: string;
}

interface SuggestionItem {
  title: string;
  path: string;
  description: string;
  category: 'chat' | 'server' | 'settings' | 'help';
}

// =============================================================================
// Quick Actions Data
// =============================================================================

const quickActions: QuickAction[] = [
  {
    icon: Home,
    label: "Go Home",
    description: "Return to the main dashboard",
    href: "/",
    color: "text-blue-500"
  },
  {
    icon: MessageCircle,
    label: "Browse Chats",
    description: "View your direct messages and channels",
    href: "/channels/@me",
    color: "text-green-500"
  },
  {
    icon: Users,
    label: "Find Servers",
    description: "Explore and join Matrix servers",
    href: "/servers/discover",
    color: "text-purple-500"
  },
  {
    icon: Settings,
    label: "Settings",
    description: "Manage your account and preferences",
    href: "/settings/profile",
    color: "text-orange-500"
  }
];

// =============================================================================
// Suggestions Data (could be dynamic based on user's activity)
// =============================================================================

const suggestions: SuggestionItem[] = [
  {
    title: "Create a Server",
    path: "/servers/create",
    description: "Start your own Matrix space",
    category: "server"
  },
  {
    title: "Join Server with Invite",
    path: "/invite",
    description: "Enter an invite code to join a server",
    category: "server"
  },
  {
    title: "Privacy Settings",
    path: "/settings/privacy",
    description: "Control your privacy and security",
    category: "settings"
  },
  {
    title: "Appearance",
    path: "/settings/appearance",
    description: "Customize themes and display options",
    category: "settings"
  },
  {
    title: "Help Center",
    path: "/help",
    description: "Get help using HAOS",
    category: "help"
  },
  {
    title: "Keyboard Shortcuts",
    path: "/settings/keybinds",
    description: "Learn useful keyboard shortcuts",
    category: "help"
  }
];

// =============================================================================
// Search Functionality
// =============================================================================

function usePageSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SuggestionItem[]>([]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results = suggestions.filter(
      item =>
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
    );

    setSearchResults(results);
  }, [searchQuery]);

  return { searchQuery, setSearchQuery, searchResults };
}

// =============================================================================
// Recent Pages Hook (using localStorage)
// =============================================================================

function useRecentPages() {
  const [recentPages, setRecentPages] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const recent = JSON.parse(localStorage.getItem('haos-recent-pages') || '[]');
      setRecentPages(recent.slice(0, 3)); // Show only last 3
    } catch {
      setRecentPages([]);
    }
  }, []);

  return recentPages;
}

// =============================================================================
// Main Not Found Component
// =============================================================================

export default function NotFound() {
  const router = useRouter();
  const { searchQuery, setSearchQuery, searchResults } = usePageSearch();
  const recentPages = useRecentPages();
  const [currentPath, setCurrentPath] = useState("");

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentPath(window.location.pathname);
    }
  }, []);

  const handleGoBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  const handleQuickSearch = (suggestion: SuggestionItem) => {
    router.push(suggestion.path);
  };

  const getCategoryIcon = (category: SuggestionItem['category']) => {
    switch (category) {
      case 'chat':
        return MessageCircle;
      case 'server':
        return Users;
      case 'settings':
        return Settings;
      case 'help':
        return Lightbulb;
      default:
        return Compass;
    }
  };

  const getCategoryColor = (category: SuggestionItem['category']) => {
    switch (category) {
      case 'chat':
        return 'text-green-500';
      case 'server':
        return 'text-purple-500';
      case 'settings':
        return 'text-orange-500';
      case 'help':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Main Error Card */}
        <Card className="p-8 text-center border-slate-200 dark:border-slate-800">
          <div className="space-y-6">
            {/* 404 Animation */}
            <div className="relative">
              <div className="text-8xl font-bold text-slate-200 dark:text-slate-800 select-none">
                404
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Compass className="h-16 w-16 text-slate-400 animate-spin" style={{
                  animationDuration: '3s',
                  animationTimingFunction: 'ease-in-out'
                }} />
              </div>
            </div>

            {/* Title and Description */}
            <div className="space-y-4">
              <h1 className="text-3xl font-bold text-foreground">
                Page Not Found
              </h1>
              <p className="text-lg text-muted-foreground max-w-md mx-auto">
                The page you're looking for doesn't exist or may have been moved.
              </p>
              
              {/* Show current path */}
              {currentPath && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Looking for: <code className="font-mono text-foreground">{currentPath}</code>
                  </p>
                </div>
              )}
            </div>

            {/* Search Box */}
            <div className="space-y-4">
              <div className="relative max-w-md mx-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search for pages, settings, or features..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <Card className="max-w-md mx-auto p-4 space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Search Results
                  </h3>
                  {searchResults.map((result) => {
                    const CategoryIcon = getCategoryIcon(result.category);
                    return (
                      <button
                        key={result.path}
                        onClick={() => handleQuickSearch(result)}
                        className="w-full flex items-start gap-3 p-2 rounded-md hover:bg-muted transition-colors text-left"
                      >
                        <CategoryIcon className={`h-4 w-4 mt-0.5 ${getCategoryColor(result.category)}`} />
                        <div>
                          <p className="font-medium text-sm">{result.title}</p>
                          <p className="text-xs text-muted-foreground">{result.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </Card>
              )}
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {quickActions.map((action) => (
                  <Button
                    key={action.href}
                    variant="outline"
                    onClick={() => router.push(action.href)}
                    className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-muted/50"
                  >
                    <action.icon className={`h-6 w-6 ${action.color}`} />
                    <div className="text-center">
                      <div className="font-medium">{action.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {action.description}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {/* Navigation Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={handleGoBack} variant="default" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </Button>
              <Button onClick={() => router.push('/')} variant="outline" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Home
              </Button>
            </div>
          </div>
        </Card>

        {/* Recent Pages */}
        {recentPages.length > 0 && (
          <Card className="p-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recently Visited
              </h3>
              <div className="space-y-2">
                {recentPages.map((path) => (
                  <button
                    key={path}
                    onClick={() => router.push(path)}
                    className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors text-left"
                  >
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    <code className="font-mono text-sm">{path}</code>
                  </button>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Helpful Links */}
        <Card className="p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Helpful Links</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {suggestions.slice(0, 6).map((suggestion) => {
                const CategoryIcon = getCategoryIcon(suggestion.category);
                return (
                  <button
                    key={suggestion.path}
                    onClick={() => router.push(suggestion.path)}
                    className="flex items-start gap-3 p-3 rounded-md hover:bg-muted transition-colors text-left"
                  >
                    <CategoryIcon className={`h-4 w-4 mt-0.5 ${getCategoryColor(suggestion.category)}`} />
                    <div>
                      <p className="font-medium text-sm">{suggestion.title}</p>
                      <p className="text-xs text-muted-foreground">{suggestion.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            If you believe this is an error, please{" "}
            <button
              onClick={() => window.open('https://github.com/your-repo/issues', '_blank')}
              className="underline hover:text-foreground transition-colors"
            >
              report it
            </button>
            {" "}or contact support.
          </p>
        </div>
      </div>
    </div>
  );
}