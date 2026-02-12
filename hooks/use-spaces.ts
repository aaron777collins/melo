"use client";

import { useState, useEffect } from "react";
import type { SpaceNavItem } from "@/lib/matrix/types/space";

/**
 * Hook state for spaces
 */
interface UseSpacesState {
  /** List of spaces the user has joined */
  spaces: SpaceNavItem[];
  /** Whether spaces are being loaded */
  isLoading: boolean;
  /** Error message if loading failed */
  error: string | null;
  /** Refresh the spaces list */
  refresh: () => void;
}

/**
 * Hook to get the user's joined spaces for the navigation sidebar
 * 
 * TODO: Replace with Matrix SDK integration (p1-2-b, p1-4-a)
 * This is a temporary implementation that returns mock data.
 * Once MatrixProvider and SpaceService are implemented, this will
 * fetch real spaces from the Matrix homeserver.
 * 
 * @returns Spaces state and actions
 * 
 * @example
 * ```tsx
 * function ServerList() {
 *   const { spaces, isLoading, error } = useSpaces();
 *   
 *   if (isLoading) return <Skeleton />;
 *   if (error) return <Error message={error} />;
 *   
 *   return spaces.map(space => (
 *     <NavigationItem key={space.id} {...space} />
 *   ));
 * }
 * ```
 */
export function useSpaces(): UseSpacesState {
  const [spaces, setSpaces] = useState<SpaceNavItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSpaces = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual Matrix API call
      // const client = useMatrixClient();
      // const spaces = await client.getSpaces();
      
      // For now, return empty array - spaces will populate once
      // Matrix sync is implemented
      await new Promise(resolve => setTimeout(resolve, 100));
      setSpaces([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load spaces");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSpaces();
  }, []);

  return {
    spaces,
    isLoading,
    error,
    refresh: loadSpaces,
  };
}

/**
 * Hook to get unread DM count
 * 
 * TODO: Replace with Matrix SDK integration
 */
export function useUnreadDMCount(): number {
  // TODO: Implement with Matrix SDK
  return 0;
}
