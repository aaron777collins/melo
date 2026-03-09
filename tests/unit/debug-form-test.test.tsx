import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import SignUpPage from '@/app/(auth)/(routes)/sign-up/[[...sign-up]]/page';

// Override global mock to ensure useForm works
vi.mock('react-hook-form', () => ({
  useForm: vi.fn(() => ({
    handleSubmit: vi.fn((onSubmit) => (e) => e?.preventDefault?.()),
    setValue: vi.fn(),
    reset: vi.fn(),
    formState: {
      isSubmitting: false,
      errors: {},
      isValid: true,
      isDirty: false,
    },
    control: {
      _formValues: { username: '', email: '', password: '', confirmPassword: '', homeserver: 'https://matrix.test.com' },
    },
    register: vi.fn(() => ({ name: 'field', onChange: vi.fn(), onBlur: vi.fn() })),
    watch: vi.fn(() => ({ username: '', email: '', password: '', confirmPassword: '', homeserver: 'https://matrix.test.com' })),
    trigger: vi.fn(),
    getValues: vi.fn(() => ({ username: '', email: '', password: '', confirmPassword: '', homeserver: 'https://matrix.test.com' })),
    setError: vi.fn(),
    clearErrors: vi.fn(),
  })),
  useFormContext: vi.fn(() => ({})),
  FormProvider: ({ children }: any) => children
}));

describe('Debug Form Test', () => {
  it('should render without crashing', () => {
    try {
      const { container } = render(<SignUpPage />);
      expect(container).toBeTruthy();
      console.log('✅ Component rendered successfully');
    } catch (error) {
      console.error('❌ Component failed to render:', error);
      throw error;
    }
  });
});