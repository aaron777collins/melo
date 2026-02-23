/**
 * Unit Tests for TemplateSelector Component
 * 
 * Tests the server template selection UI component functionality
 * including template filtering, selection, and preview display.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TemplateSelector } from '@/components/servers/template-selector';
import type { ServerTemplate } from '@/lib/matrix/server-templates';

// Mock the UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, onClick, className, ...props }: any) => (
    <div onClick={onClick} className={className} data-testid="template-card" {...props}>
      {children}
    </div>
  ),
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardDescription: ({ children }: any) => <div data-testid="card-description">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <div data-testid="card-title">{children}</div>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ placeholder, value, onChange, ...props }: any) => (
    <input
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      data-testid="search-input"
      {...props}
    />
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span data-testid="badge">{children}</span>,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: any) => (
    <div data-testid="tabs" data-value={value}>
      <button onClick={() => onValueChange('gaming')} data-testid="gaming-tab">Gaming</button>
      <button onClick={() => onValueChange('work')} data-testid="work-tab">Work</button>
      <button onClick={() => onValueChange('featured')} data-testid="featured-tab">Featured</button>
      {children}
    </div>
  ),
  TabsList: ({ children }: any) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value }: any) => (
    <button data-testid={`tab-trigger-${value}`}>{children}</button>
  ),
  TabsContent: ({ children }: any) => <div data-testid="tabs-content">{children}</div>,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Check: () => <div data-testid="check-icon" />,
  Search: () => <div data-testid="search-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Hash: () => <div data-testid="hash-icon" />,
  Volume2: () => <div data-testid="volume-icon" />,
}));

// Mock utility function
vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

describe('TemplateSelector', () => {
  const mockTemplates: ServerTemplate[] = [
    {
      id: 'gaming-test',
      name: 'Gaming Community',
      description: 'Perfect for gaming groups',
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
            name: 'General',
            order: 0,
            channels: [
              { name: 'general', type: 'text', order: 0 },
              { name: 'voice-1', type: 'voice', order: 1 },
            ],
          },
        ],
      },
    },
    {
      id: 'work-test',
      name: 'Work Team',
      description: 'Professional workspace',
      category: 'work',
      icon: '💼',
      featured: false,
      structure: {
        server: {
          visibility: 'private' as any,
          joinRule: 'invite' as any,
          encrypted: true,
          powerLevels: {} as any,
        },
        categories: [
          {
            name: 'Company',
            order: 0,
            channels: [
              { name: 'announcements', type: 'announcement', order: 0 },
            ],
          },
        ],
      },
    },
  ];

  const mockOnTemplateSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render template selector with templates', () => {
      render(
        <TemplateSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
        />
      );

      expect(screen.getByTestId('search-input')).toBeInTheDocument();
      expect(screen.getByTestId('tabs')).toBeInTheDocument();
    });

    it('should display template cards for all templates', () => {
      render(
        <TemplateSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
        />
      );

      // Should show template cards
      const cards = screen.getAllByTestId('template-card');
      expect(cards.length).toBeGreaterThan(0);
    });

    it('should show template names and descriptions', () => {
      render(
        <TemplateSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
        />
      );

      expect(screen.getByText('Gaming Community')).toBeInTheDocument();
      expect(screen.getByText('Perfect for gaming groups')).toBeInTheDocument();
    });
  });

  describe('template selection', () => {
    it('should call onTemplateSelect when a template is clicked', () => {
      render(
        <TemplateSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
        />
      );

      const firstCard = screen.getAllByTestId('template-card')[0];
      fireEvent.click(firstCard);

      expect(mockOnTemplateSelect).toHaveBeenCalledWith(mockTemplates[0]);
    });

    it('should show selected state for selected template', () => {
      render(
        <TemplateSelector
          templates={mockTemplates}
          selectedTemplate={mockTemplates[0]}
          onTemplateSelect={mockOnTemplateSelect}
        />
      );

      expect(screen.getByTestId('check-icon')).toBeInTheDocument();
    });

    it('should not call onTemplateSelect when disabled', () => {
      render(
        <TemplateSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
          disabled={true}
        />
      );

      const firstCard = screen.getAllByTestId('template-card')[0];
      fireEvent.click(firstCard);

      expect(mockOnTemplateSelect).not.toHaveBeenCalled();
    });
  });

  describe('search functionality', () => {
    it('should filter templates by name', async () => {
      render(
        <TemplateSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
        />
      );

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'Gaming' } });

      await waitFor(() => {
        expect(screen.getByText('Gaming Community')).toBeInTheDocument();
        expect(screen.queryByText('Work Team')).not.toBeInTheDocument();
      });
    });

    it('should filter templates by description', async () => {
      render(
        <TemplateSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
        />
      );

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'Professional' } });

      await waitFor(() => {
        expect(screen.getByText('Work Team')).toBeInTheDocument();
        expect(screen.queryByText('Gaming Community')).not.toBeInTheDocument();
      });
    });

    it('should show no results message when no templates match search', async () => {
      render(
        <TemplateSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
        />
      );

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'NonExistent' } });

      await waitFor(() => {
        expect(screen.getByText('No templates found')).toBeInTheDocument();
      });
    });
  });

  describe('category filtering', () => {
    it('should filter templates by gaming category', async () => {
      render(
        <TemplateSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
        />
      );

      const gamingTab = screen.getByTestId('gaming-tab');
      fireEvent.click(gamingTab);

      await waitFor(() => {
        expect(screen.getByText('Gaming Community')).toBeInTheDocument();
        expect(screen.queryByText('Work Team')).not.toBeInTheDocument();
      });
    });

    it('should show featured templates by default', () => {
      render(
        <TemplateSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
        />
      );

      // Should show featured template (Gaming Community) but not non-featured (Work Team)
      expect(screen.getByText('Gaming Community')).toBeInTheDocument();
    });
  });

  describe('template preview', () => {
    it('should show preview panel when template is selected', () => {
      render(
        <TemplateSelector
          templates={mockTemplates}
          selectedTemplate={mockTemplates[0]}
          onTemplateSelect={mockOnTemplateSelect}
        />
      );

      expect(screen.getByText(/Preview/)).toBeInTheDocument();
    });

    it('should show template structure in preview', () => {
      render(
        <TemplateSelector
          templates={mockTemplates}
          selectedTemplate={mockTemplates[0]}
          onTemplateSelect={mockOnTemplateSelect}
        />
      );

      // Should show category name
      expect(screen.getByText('General')).toBeInTheDocument();
      // Should show channel names
      expect(screen.getByText('general')).toBeInTheDocument();
      expect(screen.getByText('voice-1')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <TemplateSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
        />
      );

      const searchInput = screen.getByTestId('search-input');
      expect(searchInput).toHaveAttribute('placeholder', 'Search templates...');
    });

    it('should be keyboard navigable', () => {
      render(
        <TemplateSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
        />
      );

      const firstCard = screen.getAllByTestId('template-card')[0];
      firstCard.focus();
      expect(document.activeElement).toBe(firstCard);
    });
  });

  describe('template statistics', () => {
    it('should show correct channel count for templates', () => {
      render(
        <TemplateSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
        />
      );

      // Gaming template has 2 channels
      expect(screen.getByText('2 channels')).toBeInTheDocument();
      // Work template has 1 channel
      expect(screen.getByText('1 channels')).toBeInTheDocument();
    });

    it('should show voice channel count when present', () => {
      render(
        <TemplateSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
        />
      );

      expect(screen.getByText('1 voice')).toBeInTheDocument();
    });

    it('should show privacy settings', () => {
      render(
        <TemplateSelector
          templates={mockTemplates}
          onTemplateSelect={mockOnTemplateSelect}
        />
      );

      // Both templates are encrypted (private)
      const privateLabels = screen.getAllByText('Private');
      expect(privateLabels.length).toBeGreaterThan(0);
    });
  });
});