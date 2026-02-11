/**
 * Placeholder auth module - will be replaced with Matrix SDK authentication
 * 
 * TODO: Implement Matrix authentication
 * - Matrix login/logout
 * - Session management
 * - User profile from Matrix
 */

import { redirect } from "next/navigation";

// Placeholder user type - will be replaced with Matrix user
export interface AuthUser {
  id: string;
  firstName?: string;
  lastName?: string;
  imageUrl: string;
  emailAddresses: { emailAddress: string }[];
}

// Placeholder auth state
export function auth(): { userId: string | null } {
  // TODO: Replace with Matrix session check
  // For now, return null (not authenticated)
  return { userId: null };
}

// Placeholder current user function
export async function currentUser(): Promise<AuthUser | null> {
  // TODO: Replace with Matrix user fetch
  return null;
}

// Placeholder redirect to sign in
export function redirectToSignIn() {
  return redirect("/sign-in");
}

// Placeholder useUser hook data
export function getClientUser(): { user: AuthUser | null; isLoaded: boolean } {
  // TODO: Replace with Matrix client-side auth
  return { user: null, isLoaded: true };
}
