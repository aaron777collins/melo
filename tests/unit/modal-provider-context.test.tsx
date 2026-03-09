import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useModal } from '@/hooks/use-modal-store';
import { configureModalMock, resetModalMock } from './setup';

// Test component that uses the modal hook
function TestModalComponent() {
  const { isOpen, onClose, type, data } = useModal();
  
  return (
    <div data-testid="modal-test">
      <div data-testid="modal-isopen">{isOpen ? 'open' : 'closed'}</div>
      <div data-testid="modal-type">{type || 'no-type'}</div>
      <div data-testid="modal-data">{JSON.stringify(data)}</div>
      <button onClick={onClose} data-testid="close-button">Close</button>
    </div>
  );
}

describe('Modal Provider Context', () => {
  beforeEach(() => {
    resetModalMock();
  });

  it('should provide default modal context values', () => {
    render(<TestModalComponent />);
    
    expect(screen.getByTestId('modal-isopen')).toHaveTextContent('closed');
    expect(screen.getByTestId('modal-type')).toHaveTextContent('no-type');
    expect(screen.getByTestId('modal-data')).toHaveTextContent('{}');
    expect(screen.getByTestId('close-button')).toBeInTheDocument();
  });

  it('should handle useModal hook with configured state', () => {
    configureModalMock({
      isOpen: true,
      type: 'createChannel',
      data: { serverId: 'test-server' }
    });
    
    render(<TestModalComponent />);
    
    expect(screen.getByTestId('modal-isopen')).toHaveTextContent('open');
    expect(screen.getByTestId('modal-type')).toHaveTextContent('createChannel');
    expect(screen.getByTestId('modal-data')).toHaveTextContent('{"serverId":"test-server"}');
  });

  it('should not throw "Cannot destructure property" errors', () => {
    // This test specifically prevents the error mentioned in the task
    expect(() => {
      render(<TestModalComponent />);
    }).not.toThrow();
    
    expect(screen.getByTestId('modal-test')).toBeInTheDocument();
  });

  it('should handle multiple modal configurations', () => {
    // Test 1: Create channel modal
    configureModalMock({
      isOpen: true,
      type: 'createChannel',
      data: { serverId: 'server1' }
    });
    
    const { rerender } = render(<TestModalComponent />);
    expect(screen.getByTestId('modal-type')).toHaveTextContent('createChannel');
    
    // Test 2: Server overview modal
    configureModalMock({
      isOpen: true,
      type: 'serverOverview',
      data: { space: { id: 'space1', name: 'Test Space' } }
    });
    
    rerender(<TestModalComponent />);
    expect(screen.getByTestId('modal-type')).toHaveTextContent('serverOverview');
    
    // Test 3: Closed modal
    resetModalMock();
    rerender(<TestModalComponent />);
    expect(screen.getByTestId('modal-isopen')).toHaveTextContent('closed');
  });

  it('should handle partial modal configuration overrides', () => {
    // Only override isOpen, other values should use defaults
    configureModalMock({ isOpen: true });
    
    render(<TestModalComponent />);
    
    expect(screen.getByTestId('modal-isopen')).toHaveTextContent('open');
    expect(screen.getByTestId('modal-type')).toHaveTextContent('no-type');
    expect(screen.getByTestId('modal-data')).toHaveTextContent('{}');
  });
});