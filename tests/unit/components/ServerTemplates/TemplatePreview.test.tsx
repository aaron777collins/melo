/**
 * Unit Tests for TemplatePreview Component
 * 
 * Tests the server template preview UI component functionality
 * including channel structure display and different view modes.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TemplatePreview, CompactTemplatePreview } from '@/components/ServerTemplates/TemplatePreview';
import type { ServerTemplate } from '@/lib/matrix/types/templates';

// Mock the UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className, ...props }: any) => (
    <div className={className} data-testid="template-preview-card" {...props}>
      {children}
    </div>
  ),
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardDescription: ({ children }: any) => <div data-testid="card-description">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Hash: () => <div data-testid="hash-icon" />,
  Volume2: () => <div data-testid="volume-icon" />,
}));

// Mock utility function
vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

describe('TemplatePreview', () => {
  const mockTemplate: ServerTemplate = {
    id: 'test-template',
    name: 'Test Template',
    description: 'A test template',
    category: 'gaming',
    icon: '🎮',
    featured: true,
    structure: {
      server: {
        visibility: 'private' as any,
        joinRule: 'invite' as any,
        encrypted: true,
        powerLevels: {} as any,
      },
      categories: [
        {
          name: '📢 General',
          order: 0,
          channels: [
            {
              name: 'general',
              topic: 'General discussion',
              type: 'text',
              order: 0,
            },
            {
              name: 'announcements',
              topic: 'Important updates',
              type: 'announcement',
              order: 1,
            },
          ],
        },
        {
          name: '🔊 Voice',
          order: 1,
          channels: [
            {
              name: 'General Voice',
              topic: 'Voice chat',
              type: 'voice',
              order: 0,
            },
          ],
        },
      ],
    },
  };

  describe('rendering', () => {
    it('should render template preview with title', () => {
      render(<TemplatePreview template={mockTemplate} />);

      expect(screen.getByTestId('template-preview')).toBeInTheDocument();
      expect(screen.getByTestId('preview-title')).toBeInTheDocument();
      expect(screen.getByText(/Test Template Preview/)).toBeInTheDocument();
    });

    it('should display template icon in title', () => {
      render(<TemplatePreview template={mockTemplate} />);

      expect(screen.getByText('🎮')).toBeInTheDocument();
    });

    it('should show description', () => {
      render(<TemplatePreview template={mockTemplate} />);

      expect(screen.getByText('Channel structure for this template')).toBeInTheDocument();
    });
  });

  describe('category display', () => {
    it('should show all categories', () => {
      render(<TemplatePreview template={mockTemplate} />);

      expect(screen.getByTestId('category-📢 General')).toBeInTheDocument();
      expect(screen.getByTestId('category-🔊 Voice')).toBeInTheDocument();
    });

    it('should display category names', () => {
      render(<TemplatePreview template={mockTemplate} />);

      expect(screen.getByText('📢 General')).toBeInTheDocument();
      expect(screen.getByText('🔊 Voice')).toBeInTheDocument();
    });

    it('should show channel count for each category', () => {
      render(<TemplatePreview template={mockTemplate} />);

      expect(screen.getByText('2 channels')).toBeInTheDocument(); // General category
      expect(screen.getByText('1 channel')).toBeInTheDocument(); // Voice category
    });
  });

  describe('channel display', () => {
    it('should show all channels', () => {
      render(<TemplatePreview template={mockTemplate} />);

      expect(screen.getByTestId('channel-general')).toBeInTheDocument();
      expect(screen.getByTestId('channel-announcements')).toBeInTheDocument();
      expect(screen.getByTestId('channel-General Voice')).toBeInTheDocument();
    });

    it('should display channel names', () => {
      render(<TemplatePreview template={mockTemplate} />);

      expect(screen.getByText('general')).toBeInTheDocument();
      expect(screen.getByText('announcements')).toBeInTheDocument();
      expect(screen.getByText('General Voice')).toBeInTheDocument();
    });

    it('should show appropriate icons for different channel types', () => {
      render(<TemplatePreview template={mockTemplate} />);

      // Should have hash icons for text channels
      const hashIcons = screen.getAllByTestId('hash-icon');
      expect(hashIcons.length).toBeGreaterThan(0);

      // Should have volume icon for voice channels
      expect(screen.getByTestId('volume-icon')).toBeInTheDocument();
    });

    it('should show encryption indicator for encrypted channels', () => {
      const templateWithEncryption: ServerTemplate = {
        ...mockTemplate,
        structure: {
          ...mockTemplate.structure,
          categories: [
            {
              name: 'Test Category',
              order: 0,
              channels: [
                {
                  name: 'encrypted-channel',
                  type: 'text',
                  order: 0,
                  encrypted: true,
                },
              ],
            },
          ],
        },
      };

      render(<TemplatePreview template={templateWithEncryption} />);

      expect(screen.getByTitle('End-to-end encrypted')).toBeInTheDocument();
    });

    it('should show channel topics when available', () => {
      render(<TemplatePreview template={mockTemplate} />);

      expect(screen.getByText('General discussion')).toBeInTheDocument();
      expect(screen.getByText('Important updates')).toBeInTheDocument();
      expect(screen.getByText('Voice chat')).toBeInTheDocument();
    });
  });

  describe('detailed mode', () => {
    it('should show detailed statistics when detailed=true', () => {
      render(<TemplatePreview template={mockTemplate} detailed={true} />);

      expect(screen.getByText('2 text')).toBeInTheDocument(); // 2 text channels
      expect(screen.getByText('1 voice')).toBeInTheDocument(); // 1 voice channel
      expect(screen.getByText('Encrypted')).toBeInTheDocument(); // Server is encrypted
    });

    it('should not show detailed statistics by default', () => {
      render(<TemplatePreview template={mockTemplate} />);

      expect(screen.queryByText('2 text')).not.toBeInTheDocument();
      expect(screen.queryByText('1 voice')).not.toBeInTheDocument();
    });

    it('should show public indicator for non-encrypted servers', () => {
      const publicTemplate: ServerTemplate = {
        ...mockTemplate,
        structure: {
          ...mockTemplate.structure,
          server: {
            ...mockTemplate.structure.server,
            encrypted: false,
          },
        },
      };

      render(<TemplatePreview template={publicTemplate} detailed={true} />);

      expect(screen.getByText('Public')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show empty state when no categories', () => {
      const emptyTemplate: ServerTemplate = {
        ...mockTemplate,
        structure: {
          ...mockTemplate.structure,
          categories: [],
        },
      };

      render(<TemplatePreview template={emptyTemplate} />);

      expect(screen.getByText('No channels configured')).toBeInTheDocument();
    });
  });

  describe('sorting and order', () => {
    it('should display categories in order', () => {
      render(<TemplatePreview template={mockTemplate} />);

      const categories = screen.getAllByTestId(/^category-/);
      expect(categories[0]).toHaveAttribute('data-testid', 'category-📢 General');
      expect(categories[1]).toHaveAttribute('data-testid', 'category-🔊 Voice');
    });
  });

  describe('accessibility', () => {
    it('should have proper test ids for navigation', () => {
      render(<TemplatePreview template={mockTemplate} />);

      expect(screen.getByTestId('template-preview')).toBeInTheDocument();
      expect(screen.getByTestId('preview-title')).toBeInTheDocument();
      expect(screen.getByTestId('category-📢 General')).toBeInTheDocument();
      expect(screen.getByTestId('channel-general')).toBeInTheDocument();
    });

    it('should have proper titles for tooltips', () => {
      render(<TemplatePreview template={mockTemplate} />);

      // Announcement channel should have special indicator
      const announcementIcon = screen.getByTitle('Announcement Channel');
      expect(announcementIcon).toBeInTheDocument();
    });
  });
});

describe('CompactTemplatePreview', () => {
  const mockTemplate: ServerTemplate = {
    id: 'test-template',
    name: 'Test Template',
    description: 'A test template',
    category: 'gaming',
    icon: '🎮',
    featured: true,
    structure: {
      server: {
        visibility: 'private' as any,
        joinRule: 'invite' as any,
        encrypted: true,
        powerLevels: {} as any,
      },
      categories: [
        {
          name: 'Category 1',
          order: 0,
          channels: [
            { name: 'channel1', type: 'text', order: 0 },
            { name: 'channel2', type: 'text', order: 1 },
          ],
        },
        {
          name: 'Category 2',
          order: 1,
          channels: [
            { name: 'channel3', type: 'voice', order: 0 },
          ],
        },
      ],
    },
  };

  describe('compact rendering', () => {
    it('should render compact preview', () => {
      render(<CompactTemplatePreview template={mockTemplate} />);

      expect(screen.getByTestId('compact-template-preview')).toBeInTheDocument();
    });

    it('should show template name', () => {
      render(<CompactTemplatePreview template={mockTemplate} />);

      expect(screen.getByText('Test Template')).toBeInTheDocument();
    });

    it('should show summary statistics', () => {
      render(<CompactTemplatePreview template={mockTemplate} />);

      expect(screen.getByText('2 categories')).toBeInTheDocument();
      expect(screen.getByText('3 channels')).toBeInTheDocument();
    });

    it('should show limited category list', () => {
      render(<CompactTemplatePreview template={mockTemplate} />);

      expect(screen.getByText('Category 1')).toBeInTheDocument();
      expect(screen.getByText('Category 2')).toBeInTheDocument();
    });

    it('should show category channel counts', () => {
      render(<CompactTemplatePreview template={mockTemplate} />);

      expect(screen.getByText('(2)')).toBeInTheDocument(); // Category 1 has 2 channels
      expect(screen.getByText('(1)')).toBeInTheDocument(); // Category 2 has 1 channel
    });
  });

  describe('truncation', () => {
    it('should show "more categories" indicator when > 3 categories', () => {
      const manyCategories: ServerTemplate = {
        ...mockTemplate,
        structure: {
          ...mockTemplate.structure,
          categories: [
            { name: 'Cat 1', order: 0, channels: [] },
            { name: 'Cat 2', order: 1, channels: [] },
            { name: 'Cat 3', order: 2, channels: [] },
            { name: 'Cat 4', order: 3, channels: [] },
            { name: 'Cat 5', order: 4, channels: [] },
          ],
        },
      };

      render(<CompactTemplatePreview template={manyCategories} />);

      expect(screen.getByText('+2 more categories')).toBeInTheDocument();
    });
  });
});