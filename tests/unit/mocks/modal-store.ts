import { vi } from 'vitest';

// Create a centralized mock for the modal store
export const mockUseModal = vi.fn(() => ({
  isOpen: false,
  type: null,
  data: {},
  onOpen: vi.fn(),
  onClose: vi.fn()
}));

// Override the mock implementation for tests
export const setupModalMock = (overrides: any = {}) => {
  mockUseModal.mockReturnValue({
    isOpen: false,
    type: null,
    data: {},
    onOpen: vi.fn(),
    onClose: vi.fn(),
    ...overrides
  });
};

// Reset mock between tests
export const resetModalMock = () => {
  setupModalMock();
  vi.clearAllMocks();
};