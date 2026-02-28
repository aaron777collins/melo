/**
 * Registration Form Unit Tests
 * 
 * Tests comprehensive form validation for the registration form using Zod schema and React Hook Form
 * Testing: US-P2-01 AC-3 - Enhanced form validation requirements
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import SignUpPage from '@/app/(auth)/(routes)/sign-up/[[...sign-up]]/page';

// Mock the auth provider - override the global one for test-specific behavior
const mockRegister = vi.fn();
const mockClearError = vi.fn();

vi.mock('@/components/providers/matrix-auth-provider', () => ({
  useMatrixAuth: () => ({
    register: mockRegister,
    isLoading: false,
    error: null,
    clearError: mockClearError,
  }),
}));

// Mock HomeserverToggle component
vi.mock('@/components/auth/homeserver-toggle', () => ({
  HomeserverToggle: ({ onHomeserverChange }: { onHomeserverChange: (url: string) => void }) => (
    <div data-testid="homeserver-toggle">
      <button onClick={() => onHomeserverChange('https://test.matrix.org')}>
        Test Homeserver
      </button>
    </div>
  ),
}));

// Mock fetch for username availability and password strength
global.fetch = vi.fn();

describe('Registration Form Validation', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    // Set public mode for easier testing
    process.env.NEXT_PUBLIC_MELO_PUBLIC_MODE = 'true';
    process.env.NEXT_PUBLIC_MATRIX_HOMESERVER_URL = 'https://matrix.org';

    // Mock successful responses by default
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ available: true, strength: 'strong' }),
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Username Validation', () => {
    it('should validate username minimum length (3 characters)', async () => {
      render(<SignUpPage />);
      
      const usernameInput = screen.getByTestId('username-input');
      
      // Test too short username
      await user.type(usernameInput, 'ab');
      fireEvent.blur(usernameInput);
      
      await waitFor(() => {
        expect(screen.getByText('Username must be at least 3 characters')).toBeInTheDocument();
      });
    });

    it('should validate username contains only alphanumeric and underscore characters', async () => {
      render(<SignUpPage />);
      
      const usernameInput = screen.getByTestId('username-input');
      
      // Test invalid characters
      await user.type(usernameInput, 'user@name');
      fireEvent.blur(usernameInput);
      
      await waitFor(() => {
        expect(screen.getByText('Username can only contain letters, numbers, and underscores')).toBeInTheDocument();
      });
    });

    it('should accept valid username with alphanumeric and underscore', async () => {
      render(<SignUpPage />);
      
      const usernameInput = screen.getByTestId('username-input');
      
      // Test valid username
      await user.type(usernameInput, 'valid_user123');
      fireEvent.blur(usernameInput);
      
      await waitFor(() => {
        expect(screen.queryByText(/Username/)).not.toHaveTextContent('Username must be at least 3 characters');
      });
    });

    it('should check username availability in real-time', async () => {
      // Mock username taken response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ available: false, reason: 'Username already taken' }),
      });

      render(<SignUpPage />);
      
      const usernameInput = screen.getByTestId('username-input');
      
      await user.type(usernameInput, 'taken_user');
      
      // Wait for debounced API call
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/auth/check-username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: 'taken_user' }),
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Username already taken')).toBeInTheDocument();
      });
    });

    it('should show username availability indicator', async () => {
      render(<SignUpPage />);
      
      const usernameInput = screen.getByTestId('username-input');
      
      await user.type(usernameInput, 'available_user');
      
      await waitFor(() => {
        expect(screen.getByTestId('username-availability-indicator')).toBeInTheDocument();
        expect(screen.getByText('✓ Username available')).toBeInTheDocument();
      });
    });
  });

  describe('Password Validation', () => {
    it('should validate password minimum length (8 characters)', async () => {
      render(<SignUpPage />);
      
      const passwordInput = screen.getByTestId('password-input');
      
      await user.type(passwordInput, '1234567');
      fireEvent.blur(passwordInput);
      
      await waitFor(() => {
        expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
      });
    });

    it('should validate password contains uppercase letter', async () => {
      render(<SignUpPage />);
      
      const passwordInput = screen.getByTestId('password-input');
      
      await user.type(passwordInput, 'password123');
      fireEvent.blur(passwordInput);
      
      await waitFor(() => {
        expect(screen.getByText('Password must contain at least one uppercase letter')).toBeInTheDocument();
      });
    });

    it('should validate password contains lowercase letter', async () => {
      render(<SignUpPage />);
      
      const passwordInput = screen.getByTestId('password-input');
      
      await user.type(passwordInput, 'PASSWORD123');
      fireEvent.blur(passwordInput);
      
      await waitFor(() => {
        expect(screen.getByText('Password must contain at least one lowercase letter')).toBeInTheDocument();
      });
    });

    it('should validate password contains number', async () => {
      render(<SignUpPage />);
      
      const passwordInput = screen.getByTestId('password-input');
      
      await user.type(passwordInput, 'Password');
      fireEvent.blur(passwordInput);
      
      await waitFor(() => {
        expect(screen.getByText('Password must contain at least one number')).toBeInTheDocument();
      });
    });

    it('should display password strength indicator', async () => {
      render(<SignUpPage />);
      
      const passwordInput = screen.getByTestId('password-input');
      
      // Weak password
      await user.type(passwordInput, 'Pass1');
      await waitFor(() => {
        expect(screen.getByTestId('password-strength-indicator')).toBeInTheDocument();
        expect(screen.getByText('Weak')).toBeInTheDocument();
      });

      // Clear and type medium password
      await user.clear(passwordInput);
      await user.type(passwordInput, 'Password1');
      await waitFor(() => {
        expect(screen.getByText('Medium')).toBeInTheDocument();
      });

      // Clear and type strong password
      await user.clear(passwordInput);
      await user.type(passwordInput, 'Password123!');
      await waitFor(() => {
        expect(screen.getByText('Strong')).toBeInTheDocument();
      });
    });

    it('should show password strength color indicators', async () => {
      render(<SignUpPage />);
      
      const passwordInput = screen.getByTestId('password-input');
      
      await user.type(passwordInput, 'Password123!');
      
      await waitFor(() => {
        const strengthIndicator = screen.getByTestId('password-strength-bar');
        expect(strengthIndicator).toHaveClass('strength-strong');
      });
    });
  });

  describe('Confirm Password Validation', () => {
    it('should validate password confirmation matches', async () => {
      render(<SignUpPage />);
      
      const passwordInput = screen.getByTestId('password-input');
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      
      await user.type(passwordInput, 'Password123');
      await user.type(confirmPasswordInput, 'Password456');
      fireEvent.blur(confirmPasswordInput);
      
      await waitFor(() => {
        expect(screen.getByText("Passwords don't match")).toBeInTheDocument();
      });
    });

    it('should accept matching passwords', async () => {
      render(<SignUpPage />);
      
      const passwordInput = screen.getByTestId('password-input');
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      
      await user.type(passwordInput, 'Password123');
      await user.type(confirmPasswordInput, 'Password123');
      fireEvent.blur(confirmPasswordInput);
      
      await waitFor(() => {
        expect(screen.queryByText("Passwords don't match")).not.toBeInTheDocument();
      });
    });

    it('should show real-time password match indicator', async () => {
      render(<SignUpPage />);
      
      const passwordInput = screen.getByTestId('password-input');
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      
      await user.type(passwordInput, 'Password123');
      await user.type(confirmPasswordInput, 'Password123');
      
      await waitFor(() => {
        expect(screen.getByTestId('password-match-indicator')).toBeInTheDocument();
        expect(screen.getByText('✓ Passwords match')).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission Prevention', () => {
    it('should prevent submission when username is invalid', async () => {
      render(<SignUpPage />);
      
      const usernameInput = screen.getByTestId('username-input');
      const submitButton = screen.getByTestId('signup-button');
      
      await user.type(usernameInput, 'ab'); // Too short
      
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });

    it('should prevent submission when password is invalid', async () => {
      render(<SignUpPage />);
      
      const usernameInput = screen.getByTestId('username-input');
      const passwordInput = screen.getByTestId('password-input');
      const submitButton = screen.getByTestId('signup-button');
      
      await user.type(usernameInput, 'validuser');
      await user.type(passwordInput, '123'); // Too short
      
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });

    it('should prevent submission when passwords do not match', async () => {
      render(<SignUpPage />);
      
      const usernameInput = screen.getByTestId('username-input');
      const passwordInput = screen.getByTestId('password-input');
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByTestId('signup-button');
      
      await user.type(usernameInput, 'validuser');
      await user.type(passwordInput, 'Password123');
      await user.type(confirmPasswordInput, 'Password456');
      
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });

    it('should enable submission when all validation passes', async () => {
      render(<SignUpPage />);
      
      const usernameInput = screen.getByTestId('username-input');
      const passwordInput = screen.getByTestId('password-input');
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const homeserverInput = screen.getByTestId('homeserver-input');
      const submitButton = screen.getByTestId('signup-button');
      
      await user.type(usernameInput, 'validuser123');
      await user.type(passwordInput, 'Password123');
      await user.type(confirmPasswordInput, 'Password123');
      await user.type(homeserverInput, 'https://matrix.org');
      
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('Real-time Validation Feedback', () => {
    it('should show validation errors immediately on blur', async () => {
      render(<SignUpPage />);
      
      const usernameInput = screen.getByTestId('username-input');
      
      await user.type(usernameInput, 'ab');
      fireEvent.blur(usernameInput);
      
      await waitFor(() => {
        expect(screen.getByText('Username must be at least 3 characters')).toBeInTheDocument();
      });
    });

    it('should clear validation errors when input becomes valid', async () => {
      render(<SignUpPage />);
      
      const usernameInput = screen.getByTestId('username-input');
      
      // Start with invalid input
      await user.type(usernameInput, 'ab');
      fireEvent.blur(usernameInput);
      
      await waitFor(() => {
        expect(screen.getByText('Username must be at least 3 characters')).toBeInTheDocument();
      });
      
      // Fix the input
      await user.type(usernameInput, 'c');
      fireEvent.blur(usernameInput);
      
      await waitFor(() => {
        expect(screen.queryByText('Username must be at least 3 characters')).not.toBeInTheDocument();
      });
    });

    it('should show loading state during username availability check', async () => {
      // Mock slow response
      (global.fetch as any).mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ available: true }),
        }), 1000))
      );

      render(<SignUpPage />);
      
      const usernameInput = screen.getByTestId('username-input');
      
      await user.type(usernameInput, 'testuser');
      
      await waitFor(() => {
        expect(screen.getByTestId('username-checking-indicator')).toBeInTheDocument();
        expect(screen.getByText('Checking availability...')).toBeInTheDocument();
      });
    });
  });

  describe('Error Message Display', () => {
    it('should display appropriate error messages for each validation rule', async () => {
      render(<SignUpPage />);
      
      const usernameInput = screen.getByTestId('username-input');
      const passwordInput = screen.getByTestId('password-input');
      
      // Trigger multiple validation errors
      await user.type(usernameInput, 'a');
      await user.type(passwordInput, '123');
      fireEvent.blur(usernameInput);
      fireEvent.blur(passwordInput);
      
      await waitFor(() => {
        expect(screen.getByText('Username must be at least 3 characters')).toBeInTheDocument();
        expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
      });
    });

    it('should show multiple password validation errors when applicable', async () => {
      render(<SignUpPage />);
      
      const passwordInput = screen.getByTestId('password-input');
      
      await user.type(passwordInput, 'password');
      fireEvent.blur(passwordInput);
      
      await waitFor(() => {
        expect(screen.getByText('Password must contain at least one uppercase letter')).toBeInTheDocument();
        expect(screen.getByText('Password must contain at least one number')).toBeInTheDocument();
      });
    });
  });

  describe('Integration with React Hook Form', () => {
    it('should integrate properly with form state management', async () => {
      render(<SignUpPage />);
      
      const usernameInput = screen.getByTestId('username-input');
      const passwordInput = screen.getByTestId('password-input');
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const homeserverInput = screen.getByTestId('homeserver-input');
      const submitButton = screen.getByTestId('signup-button');
      
      // Fill out valid form
      await user.type(usernameInput, 'validuser123');
      await user.type(passwordInput, 'Password123');
      await user.type(confirmPasswordInput, 'Password123');
      await user.clear(homeserverInput);
      await user.type(homeserverInput, 'https://matrix.org');
      
      mockRegister.mockResolvedValueOnce(true);
      
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith(
          'validuser123',
          'Password123',
          undefined,
          'https://matrix.org'
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels and error associations', async () => {
      render(<SignUpPage />);
      
      const usernameInput = screen.getByTestId('username-input');
      
      expect(usernameInput).toHaveAttribute('aria-describedby');
      expect(usernameInput).toHaveAccessibleName();
    });

    it('should announce validation errors to screen readers', async () => {
      render(<SignUpPage />);
      
      const usernameInput = screen.getByTestId('username-input');
      
      await user.type(usernameInput, 'ab');
      fireEvent.blur(usernameInput);
      
      await waitFor(() => {
        const errorMessage = screen.getByText('Username must be at least 3 characters');
        expect(errorMessage).toHaveAttribute('aria-live', 'polite');
      });
    });
  });
});