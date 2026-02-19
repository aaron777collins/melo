import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NavigationAction } from '@/components/navigation/navigation-action';

// Mock ActionTooltip to just render children
vi.mock('@/components/action-tooltip', () => ({
  ActionTooltip: ({ children, label }: any) => (
    <div data-testid="tooltip" data-label={label}>
      {children}
    </div>
  ),
}));

// Mock use-modal-store at module level
const mockOnOpen = vi.fn();
vi.mock('@/hooks/use-modal-store', () => ({
  useModal: () => ({
    onOpen: mockOnOpen,
    onClose: vi.fn(),
    type: null,
    data: {},
    isOpen: false,
  }),
}));

describe('NavigationAction', () => {
  beforeEach(() => {
    mockOnOpen.mockClear();
  });

  it('renders correctly', () => {
    render(<NavigationAction />);
    
    // Should have a tooltip wrapper
    const tooltip = screen.getByTestId('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveAttribute('data-label', 'Add a server');
  });

  it('renders a button element', () => {
    render(<NavigationAction />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('has correct styling classes', () => {
    render(<NavigationAction />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('group', 'flex', 'items-center');
    
    // Check inner div styling
    const innerDiv = button.querySelector('div.flex.mx-3');
    expect(innerDiv).toBeInTheDocument();
    expect(innerDiv).toHaveClass('h-[48px]', 'w-[48px]', 'rounded-[24px]');
  });

  it('contains Plus icon', () => {
    render(<NavigationAction />);
    
    // Plus icon from lucide-react renders as SVG
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('calls onOpen when clicked', () => {
    render(<NavigationAction />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockOnOpen).toHaveBeenCalledWith('createServer');
  });

  it('matches Discord clone reference structure', () => {
    const { container } = render(<NavigationAction />);
    
    // Verify structure: div > button > div with icon
    const button = container.querySelector('button.group.flex.items-center');
    expect(button).toBeInTheDocument();
    
    const iconWrapper = button?.querySelector('div.flex.mx-3.h-\\[48px\\].w-\\[48px\\].rounded-\\[24px\\]');
    expect(iconWrapper).toBeInTheDocument();
    
    // Check for emerald color classes (hover effects)
    expect(iconWrapper).toHaveClass('group-hover:bg-emerald-500');
  });
});
