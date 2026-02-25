import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import SignInPage from '@/app/(auth)/(routes)/sign-in/[[...sign-in]]/page';

// Mock the auth provider
const mockLogin = vi.fn();
const mockClearError = vi.fn();
const mockComplete2FALogin = vi.fn();

vi.mock('@/components/providers/matrix-auth-provider', () => ({
  useMatrixAuth: () => ({
    login: mockLogin,
    isLoading: false,
    error: null,
    clearError: mockClearError,
    complete2FALogin: mockComplete2FALogin,
  }),
}));

// Mock Next.js router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock the Two-Factor component
vi.mock('@/components/auth/two-factor-prompt', () => ({
  default: ({ onCancel }: { onCancel: () => void }) => (
    <div data-testid="two-factor-prompt">
      <button onClick={onCancel}>Cancel 2FA</button>
    </div>
  ),
}));

describe('SignInPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock environment variables
    process.env.NEXT_PUBLIC_MELO_PUBLIC_MODE = 'false';
    process.env.NEXT_PUBLIC_MATRIX_HOMESERVER_URL = 'https://dev2.aaroncollins.info';
  });

  it('should render sign-in form elements', () => {
    render(<SignInPage />);
    
    // Check for main elements
    expect(screen.getByText('Welcome to Melo')).toBeInTheDocument();
    expect(screen.getByTestId('username-input')).toBeInTheDocument();
    expect(screen.getByTestId('password-input')).toBeInTheDocument();
    expect(screen.getByTestId('login-button')).toBeInTheDocument();
  });

  it('should show private mode badge when in private mode', () => {
    render(<SignInPage />);
    
    expect(screen.getByTestId('private-mode-badge')).toBeInTheDocument();
    expect(screen.getByText('Private Server')).toBeInTheDocument();
  });

  it('should hide homeserver input in private mode', () => {
    render(<SignInPage />);
    
    // Homeserver input should not be visible in private mode
    expect(screen.queryByTestId('homeserver-input')).not.toBeInTheDocument();
    expect(screen.getByText('dev2.aaroncollins.info')).toBeInTheDocument();
  });

  it('should show homeserver input in public mode', () => {
    // Switch to public mode
    process.env.NEXT_PUBLIC_MELO_PUBLIC_MODE = 'true';
    
    render(<SignInPage />);
    
    expect(screen.getByTestId('homeserver-input')).toBeInTheDocument();
    expect(screen.queryByTestId('private-mode-badge')).not.toBeInTheDocument();
  });

  it('should validate required fields on form submission', async () => {
    render(<SignInPage />);
    
    const submitButton = screen.getByTestId('login-button');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Username is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
    
    // Login should not be called with invalid data
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('should call login with correct credentials', async () => {
    mockLogin.mockResolvedValueOnce(true);
    
    render(<SignInPage />);
    
    // Fill in the form
    fireEvent.change(screen.getByTestId('username-input'), {
      target: { value: 'testuser' }
    });
    fireEvent.change(screen.getByTestId('password-input'), {
      target: { value: 'testpassword' }
    });
    
    // Submit form
    fireEvent.click(screen.getByTestId('login-button'));
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(
        'testuser',
        'testpassword',
        'https://dev2.aaroncollins.info'
      );
    });
  });

  it('should redirect to home on successful login', async () => {
    mockLogin.mockResolvedValueOnce(true);
    
    render(<SignInPage />);
    
    // Fill and submit form
    fireEvent.change(screen.getByTestId('username-input'), {
      target: { value: 'testuser' }
    });
    fireEvent.change(screen.getByTestId('password-input'), {
      target: { value: 'testpassword' }
    });
    fireEvent.click(screen.getByTestId('login-button'));
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('should show 2FA prompt when required', async () => {
    mockLogin.mockResolvedValueOnce('2fa_required');
    
    render(<SignInPage />);
    
    // Fill and submit form
    fireEvent.change(screen.getByTestId('username-input'), {
      target: { value: 'testuser' }
    });
    fireEvent.change(screen.getByTestId('password-input'), {
      target: { value: 'testpassword' }
    });
    fireEvent.click(screen.getByTestId('login-button'));
    
    await waitFor(() => {
      expect(screen.getByTestId('two-factor-prompt')).toBeInTheDocument();
    });
  });

  it('should handle 2FA cancellation', async () => {
    mockLogin.mockResolvedValueOnce('2fa_required');
    
    render(<SignInPage />);
    
    // Trigger 2FA
    fireEvent.change(screen.getByTestId('username-input'), {
      target: { value: 'testuser' }
    });
    fireEvent.change(screen.getByTestId('password-input'), {
      target: { value: 'testpassword' }
    });
    fireEvent.click(screen.getByTestId('login-button'));
    
    await waitFor(() => {
      expect(screen.getByTestId('two-factor-prompt')).toBeInTheDocument();
    });
    
    // Cancel 2FA
    fireEvent.click(screen.getByText('Cancel 2FA'));
    
    await waitFor(() => {
      expect(screen.queryByTestId('two-factor-prompt')).not.toBeInTheDocument();
      expect(screen.getByTestId('username-input')).toBeInTheDocument();
    });
    
    expect(mockClearError).toHaveBeenCalled();
  });

  it('should have correct link to sign-up page', () => {
    render(<SignInPage />);
    
    const signUpLink = screen.getByRole('link', { name: /create one here/i });
    expect(signUpLink).toHaveAttribute('href', '/sign-up');
  });
});

// Additional test for route structure verification
describe('Auth Route Structure', () => {
  it('should be accessible at the expected route path', () => {
    // This test verifies the component can be imported and rendered
    // which confirms it's properly structured for the route
    const component = render(<SignInPage />);
    expect(component).toBeDefined();
    expect(screen.getByText('Welcome to Melo')).toBeInTheDocument();
  });
});