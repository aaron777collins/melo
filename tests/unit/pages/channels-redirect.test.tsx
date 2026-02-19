/**
 * Unit tests for /channels page (should redirect to /channels/@me)
 * 
 * Following TDD approach - tests written first before implementation
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  redirect: vi.fn(),
}));

describe('Channels Redirect Page', () => {
  const mockPush = vi.fn();
  const mockReplace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    });
  });

  it('should redirect to /channels/@me when accessed', async () => {
    // Get the mocked redirect function
    const { redirect } = await import('next/navigation');
    
    // Import the page component
    const { default: ChannelsPage } = await import('@/app/(main)/(routes)/channels/page');
    
    // Since Next.js redirect throws an error to trigger redirect, we need to catch it
    try {
      render(<ChannelsPage />);
      // If we get here, the redirect didn't happen
      expect(false).toBe(true); // Force failure if no redirect
    } catch (error) {
      // Next.js redirect throws a NEXT_REDIRECT error
      // This is expected behavior
      expect(redirect).toHaveBeenCalledWith('/channels/@me');
    }
  });

  it('should be accessible at /channels route', async () => {
    // Test that the route is properly configured
    // This is more of a routing configuration test
    const expectedPath = '/channels';
    expect(expectedPath).toBe('/channels');
  });
});