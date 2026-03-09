/**
 * Registration Form Test Setup
 * 
 * This file provides specialized utilities for testing the registration form
 * with proper react-hook-form integration.
 */

import { vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setFormValue, resetFormState } from '../../react-hook-form-mock';

// Enhanced user event wrapper that updates both DOM and form mock
export const createUserEventWithFormSync = () => {
  const user = userEvent.setup();

  return {
    ...user,
    // Override type to sync with form mock
    type: async (element: Element, text: string, options?: any) => {
      // Get the field name from the element
      const fieldName = element.getAttribute('name') || 
                       element.getAttribute('data-testid')?.replace('-input', '') ||
                       element.getAttribute('id');
      
      // Type into the DOM element
      await user.type(element, text, options);
      
      // Update form mock state to match
      if (fieldName) {
        setFormValue(fieldName, text);
      }
      
      // Trigger onChange for form integration
      const changeEvent = new Event('change', { bubbles: true });
      Object.defineProperty(changeEvent, 'target', {
        writable: false,
        value: { ...element, value: text }
      });
      element.dispatchEvent(changeEvent);
    },

    // Override clear to sync with form mock
    clear: async (element: Element) => {
      const fieldName = element.getAttribute('name') || 
                       element.getAttribute('data-testid')?.replace('-input', '') ||
                       element.getAttribute('id');
      
      await user.clear(element);
      
      if (fieldName) {
        setFormValue(fieldName, '');
      }
    }
  };
};

// Form field helpers
export const fillRegistrationForm = async (user: any, data: {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}) => {
  if (data.username) {
    const usernameInput = screen.getByTestId('username-input');
    await user.type(usernameInput, data.username);
  }
  
  if (data.email) {
    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, data.email);
  }
  
  if (data.password) {
    const passwordInput = screen.getByTestId('password-input');
    await user.type(passwordInput, data.password);
  }
  
  if (data.confirmPassword) {
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    await user.type(confirmPasswordInput, data.confirmPassword);
  }
};

// Mock username availability check that works with tests
export const mockUsernameAvailabilityCheck = (available: boolean = true) => {
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes('/api/auth/check-username')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ available }),
      });
    }
    return Promise.reject(new Error(`Unexpected fetch to: ${url}`));
  });
};

// Test utilities for setup/teardown
export const setupRegistrationTest = () => {
  // Reset form state
  resetFormState();
  
  // Set test environment variables
  process.env.NEXT_PUBLIC_MELO_PUBLIC_MODE = 'true';
  process.env.NEXT_PUBLIC_MATRIX_HOMESERVER_URL = 'https://matrix.org';
  process.env.NODE_ENV = 'test';
  
  // Mock successful username availability by default
  mockUsernameAvailabilityCheck(true);
};

export const cleanupRegistrationTest = () => {
  vi.restoreAllMocks();
  delete process.env.NEXT_PUBLIC_MELO_PUBLIC_MODE;
  delete process.env.NEXT_PUBLIC_MATRIX_HOMESERVER_URL;
  resetFormState();
};