import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NavigationItem } from '@/components/navigation/navigation-item';

// Mock ActionTooltip
vi.mock('@/components/action-tooltip', () => ({
  ActionTooltip: ({ children, label }: any) => (
    <div data-testid="tooltip" data-label={label}>
      {children}
    </div>
  ),
}));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useParams: () => ({ serverId: 'test-server-1' }),
}));

describe('NavigationItem', () => {
  const defaultProps = {
    id: 'server-123',
    imageUrl: 'https://example.com/image.png',
    name: 'Test Server',
  };

  beforeEach(() => {
    mockPush.mockClear();
  });

  it('renders with tooltip containing server name', () => {
    render(<NavigationItem {...defaultProps} />);
    
    const tooltip = screen.getByTestId('tooltip');
    expect(tooltip).toHaveAttribute('data-label', 'Test Server');
  });

  it('renders a button element', () => {
    render(<NavigationItem {...defaultProps} />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('has correct button styling classes', () => {
    render(<NavigationItem {...defaultProps} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('group', 'relative', 'flex', 'items-center');
  });

  it('renders selection indicator', () => {
    const { container } = render(<NavigationItem {...defaultProps} />);
    
    // Selection indicator is absolutely positioned on the left
    const indicator = container.querySelector('div.absolute.left-0');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveClass('bg-primary', 'rounded-full', 'w-[4px]');
  });

  it('renders server image wrapper with correct dimensions', () => {
    const { container } = render(<NavigationItem {...defaultProps} />);
    
    // Image wrapper should be 48x48 with 24px border radius
    const imageWrapper = container.querySelector('div.h-\\[48px\\].w-\\[48px\\]');
    expect(imageWrapper).toBeInTheDocument();
    expect(imageWrapper).toHaveClass('rounded-[24px]', 'mx-3');
  });

  it('renders Image component with server imageUrl', () => {
    render(<NavigationItem {...defaultProps} />);
    
    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('src', defaultProps.imageUrl);
    expect(image).toHaveAttribute('alt', 'Channel');
  });

  it('navigates to server on click', () => {
    render(<NavigationItem {...defaultProps} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockPush).toHaveBeenCalledWith('/servers/server-123');
  });

  it('matches Discord clone reference structure exactly', () => {
    const { container } = render(<NavigationItem {...defaultProps} />);
    
    // Reference structure verification
    // 1. Button with group relative flex items-center
    const button = container.querySelector('button.group.relative.flex.items-center');
    expect(button).toBeInTheDocument();
    
    // 2. Indicator: absolute left-0 bg-primary rounded-full w-[4px]
    const indicator = button?.querySelector('div.absolute.left-0.bg-primary.rounded-full.w-\\[4px\\]');
    expect(indicator).toBeInTheDocument();
    
    // 3. Image wrapper: relative group flex mx-3 h-[48px] w-[48px] rounded-[24px]
    const imageWrapper = button?.querySelector('div.relative.group.flex.mx-3.h-\\[48px\\].w-\\[48px\\].rounded-\\[24px\\]');
    expect(imageWrapper).toBeInTheDocument();
  });

  it('has hover transition classes', () => {
    const { container } = render(<NavigationItem {...defaultProps} />);
    
    const imageWrapper = container.querySelector('div.h-\\[48px\\].w-\\[48px\\]');
    expect(imageWrapper).toHaveClass('group-hover:rounded-[16px]', 'transition-all');
  });
});
