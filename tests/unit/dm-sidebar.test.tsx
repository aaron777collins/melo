import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DMSidebarSection } from '@/components/navigation/dm-sidebar-section';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

const mockDMs = [
  { 
    id: '1', 
    userId: '@alice:example.com',
    displayName: 'Alice', 
    lastMessage: {
      text: 'Hey there!',
      timestamp: Date.now() - 300000, // 5 minutes ago
      senderId: '@alice:example.com'
    },
    unreadCount: 0,
    isOnline: true
  },
  { 
    id: '2', 
    userId: '@bob:example.com',
    displayName: 'Bob',
    unreadCount: 3,
    isOnline: false
  },
];

describe('DMSidebarSection', () => {
  it('renders DM section with header', () => {
    render(
      <DMSidebarSection 
        dms={[]} 
        onNewDM={() => {}}
      />
    );
    expect(screen.getByText('Direct Messages')).toBeInTheDocument();
    expect(screen.getByTestId('new-dm-button')).toBeInTheDocument();
  });

  it('shows empty state when no conversations', () => {
    render(
      <DMSidebarSection 
        dms={[]} 
        onNewDM={() => {}}
      />
    );
    expect(screen.getByTestId('dm-empty-state')).toBeInTheDocument();
    expect(screen.getByText('No direct messages yet')).toBeInTheDocument();
  });

  it('renders conversation list when conversations exist', () => {
    render(
      <DMSidebarSection 
        dms={mockDMs} 
        onNewDM={() => {}}
      />
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('calls onNewDM when plus button clicked', () => {
    const onNewDM = vi.fn();
    render(
      <DMSidebarSection 
        dms={[]} 
        onNewDM={onNewDM}
      />
    );
    fireEvent.click(screen.getByTestId('new-dm-button'));
    expect(onNewDM).toHaveBeenCalled();
  });

  it('displays unread count badge', () => {
    render(
      <DMSidebarSection 
        dms={mockDMs}
        onNewDM={() => {}}
      />
    );
    expect(screen.getByText('3')).toBeInTheDocument(); // Bob's unread count
  });
});