/**
 * Simple test to verify mocks work
 */

import { describe, it, expect, vi } from 'vitest';

// Test basic mock functionality
describe('Mock Test', () => {
  it('should verify mocks work', () => {
    const mockFn = vi.fn(() => 'test');
    expect(mockFn()).toBe('test');
  });
  
  it('should verify useModal mock can be created', async () => {
    // Mock the useModal hook
    const mockUseModal = vi.fn(() => ({
      onOpen: vi.fn(),
      onClose: vi.fn(),
      isOpen: false,
      type: null,
      data: {}
    }));
    
    const result = mockUseModal();
    expect(result.onOpen).toBeDefined();
    expect(result.isOpen).toBe(false);
  });
});