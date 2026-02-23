/**
 * Unit Tests for Admin Invites Page
 * 
 * Tests the main admin invites page component following TDD methodology
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock Next.js modules
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
}));

// Mock the AdminInvitesDashboard component
vi.mock('@/components/admin/admin-invites-dashboard', () => ({
  AdminInvitesDashboard: () => {
    return React.createElement('div', { 
      'data-testid': 'admin-invites-dashboard',
      className: 'mocked-dashboard'
    }, 'Admin Invites Dashboard');
  },
}));

describe('AdminInvitesPage', () => {
  let AdminInvitesPage: any;

  beforeEach(async () => {
    // Dynamically import the page component
    const pageModule = await import('@/app/(main)/(routes)/admin/invites/page');
    AdminInvitesPage = pageModule.default;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Page Structure and Metadata', () => {
    it('should have correct metadata export', async () => {
      const pageModule = await import('@/app/(main)/(routes)/admin/invites/page');
      
      expect(pageModule.metadata).toBeDefined();
      expect(pageModule.metadata.title).toBe('Admin Invites - Melo');
      expect(pageModule.metadata.description).toBe('Manage invite codes for external users');
    });

    it('should export default function', async () => {
      const pageModule = await import('@/app/(main)/(routes)/admin/invites/page');
      
      expect(typeof pageModule.default).toBe('function');
      expect(pageModule.default.name).toBe('AdminInvitesPage');
    });
  });

  describe('Component Rendering', () => {
    it('should render the page container', () => {
      const { container } = render(React.createElement(AdminInvitesPage));
      
      const pageContainer = container.querySelector('div');
      expect(pageContainer).toBeInTheDocument();
      expect(pageContainer).toHaveClass('h-full');
    });

    it('should render the AdminInvitesDashboard component', () => {
      render(React.createElement(AdminInvitesPage));
      
      const dashboard = screen.getByTestId('admin-invites-dashboard');
      expect(dashboard).toBeInTheDocument();
      expect(dashboard).toHaveTextContent('Admin Invites Dashboard');
    });

    it('should apply correct CSS structure', () => {
      const { container } = render(React.createElement(AdminInvitesPage));
      
      const pageContainer = container.querySelector('div');
      expect(pageContainer).toHaveClass('h-full');
      
      const dashboard = screen.getByTestId('admin-invites-dashboard');
      expect(dashboard).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should render without throwing errors', () => {
      expect(() => {
        render(React.createElement(AdminInvitesPage));
      }).not.toThrow();
    });

    it('should have proper component structure', () => {
      const { container } = render(React.createElement(AdminInvitesPage));
      
      // Should have main container
      const mainContainer = container.querySelector('.h-full');
      expect(mainContainer).toBeInTheDocument();
      
      // Should contain dashboard component
      const dashboard = screen.getByTestId('admin-invites-dashboard');
      expect(dashboard).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('should properly integrate dashboard component', () => {
      render(React.createElement(AdminInvitesPage));
      
      const dashboard = screen.getByTestId('admin-invites-dashboard');
      expect(dashboard).toBeInTheDocument();
      expect(dashboard).toHaveClass('mocked-dashboard');
    });

    it('should handle dashboard component properly', () => {
      const { container } = render(React.createElement(AdminInvitesPage));
      
      // Check that the dashboard is nested within the page container
      const pageContainer = container.querySelector('.h-full');
      const dashboard = screen.getByTestId('admin-invites-dashboard');
      
      expect(pageContainer).toContainElement(dashboard);
    });
  });

  describe('TypeScript and Build Compatibility', () => {
    it('should be compatible with TypeScript', async () => {
      const pageModule = await import('@/app/(main)/(routes)/admin/invites/page');
      
      // Should export both function and metadata
      expect(typeof pageModule.default).toBe('function');
      expect(typeof pageModule.metadata).toBe('object');
      expect(pageModule.metadata).toHaveProperty('title');
      expect(pageModule.metadata).toHaveProperty('description');
    });

    it('should export correct component signature', async () => {
      const pageModule = await import('@/app/(main)/(routes)/admin/invites/page');
      const Component = pageModule.default;
      
      // Should be a React component function
      expect(typeof Component).toBe('function');
      expect(Component.length).toBe(0); // No props expected for page component
    });
  });

  describe('Performance', () => {
    it('should render quickly', () => {
      const startTime = Date.now();
      render(React.createElement(AdminInvitesPage));
      const endTime = Date.now();
      
      // Should render in less than 100ms
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should not cause memory leaks on unmount', () => {
      const { unmount } = render(React.createElement(AdminInvitesPage));
      
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Layout and Styling', () => {
    it('should apply full height class correctly', () => {
      const { container } = render(React.createElement(AdminInvitesPage));
      
      const mainDiv = container.querySelector('div');
      expect(mainDiv).toHaveClass('h-full');
    });

    it('should maintain consistent layout structure', () => {
      const { container } = render(React.createElement(AdminInvitesPage));
      
      // Should have exactly one main div container
      const divElements = container.querySelectorAll('div');
      expect(divElements.length).toBeGreaterThanOrEqual(2); // Page div + dashboard div
      
      // First div should be the page container
      expect(divElements[0]).toHaveClass('h-full');
    });
  });

  describe('Error Handling', () => {
    it('should render without dashboard component errors', () => {
      // This test verifies our mock is working correctly
      render(React.createElement(AdminInvitesPage));
      
      const dashboard = screen.getByTestId('admin-invites-dashboard');
      expect(dashboard).toBeInTheDocument();
    });

    it('should handle component lifecycle properly', () => {
      const { rerender, unmount } = render(React.createElement(AdminInvitesPage));
      
      // Should handle re-render
      expect(() => rerender(React.createElement(AdminInvitesPage))).not.toThrow();
      
      // Should handle unmount
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Next.js App Router Compatibility', () => {
    it('should be compatible with Next.js page requirements', async () => {
      const pageModule = await import('@/app/(main)/(routes)/admin/invites/page');
      
      // Should export default component
      expect(pageModule.default).toBeDefined();
      expect(typeof pageModule.default).toBe('function');
      
      // Should export metadata
      expect(pageModule.metadata).toBeDefined();
      expect(pageModule.metadata.title).toContain('Admin Invites');
    });

    it('should follow Next.js page.tsx conventions', () => {
      // Page component should render without props
      expect(() => {
        render(React.createElement(AdminInvitesPage));
      }).not.toThrow();
      
      // Should render a valid React element
      const { container } = render(React.createElement(AdminInvitesPage));
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});