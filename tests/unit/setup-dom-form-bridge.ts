/**
 * DOM Form Bridge - Connects DOM input events to react-hook-form mock
 * 
 * This integrates userEvent.type() changes with the form mock state
 */

import { vi } from 'vitest';

// Global form state that the mock and DOM bridge will share
const formState: Record<string, any> = {};

// Set form value (used by mock and bridge)
export const setFormValue = (name: string, value: any) => {
  formState[name] = value;
};

export const getFormValue = (name: string) => {
  return formState[name] || '';
};

export const getAllFormValues = () => {
  return { ...formState };
};

export const resetFormState = () => {
  Object.keys(formState).forEach(key => delete formState[key]);
};

// Enhanced register function that creates DOM-connected inputs
const createRegisterFunction = () => {
  return (name: string, options?: any) => {
    return {
      name,
      onChange: vi.fn((event: any) => {
        const value = event?.target?.value ?? event;
        setFormValue(name, value);
      }),
      onBlur: vi.fn(),
      value: getFormValue(name),
      ref: vi.fn((element: HTMLInputElement | null) => {
        if (element) {
          // Connect DOM changes to form state
          const handleChange = () => {
            setFormValue(name, element.value);
          };
          
          // Listen for input events from userEvent
          element.addEventListener('input', handleChange);
          element.addEventListener('change', handleChange);
          
          // Update DOM when form state changes
          const updateDOM = () => {
            if (element.value !== getFormValue(name)) {
              element.value = getFormValue(name);
            }
          };
          
          // Setup interval to sync form state to DOM
          const syncInterval = setInterval(updateDOM, 10);
          
          // Cleanup function
          return () => {
            element.removeEventListener('input', handleChange);
            element.removeEventListener('change', handleChange);
            clearInterval(syncInterval);
          };
        }
      })
    };
  };
};

// Enhanced handleSubmit that uses actual form state
const createHandleSubmit = () => {
  let isSubmitting = false;
  
  return vi.fn((onSubmit: (data: any) => void | Promise<void>) => {
    return vi.fn(async (e?: Event) => {
      e?.preventDefault?.();
      
      if (isSubmitting) return;
      
      isSubmitting = true;
      try {
        await onSubmit(getAllFormValues());
      } finally {
        isSubmitting = false;
      }
    });
  });
};

// Create the enhanced form mock
export const createDOMConnectedFormMock = () => {
  const register = createRegisterFunction();
  const handleSubmit = createHandleSubmit();
  
  return {
    register,
    handleSubmit,
    watch: vi.fn((fieldName?: string) => {
      if (!fieldName) return getAllFormValues();
      return getFormValue(fieldName);
    }),
    getValues: vi.fn((fieldName?: string) => {
      if (!fieldName) return getAllFormValues();
      return getFormValue(fieldName);
    }),
    setValue: vi.fn((name: string, value: any) => {
      setFormValue(name, value);
    }),
    formState: {
      get isSubmitting() { return false; },
      get errors() { return {}; },
      get isValid() { return true; },
      get isDirty() { return Object.keys(formState).length > 0; },
      touchedFields: {},
      isValidating: false,
      submitCount: 0,
      defaultValues: {}
    },
    reset: vi.fn(() => resetFormState()),
    setError: vi.fn(),
    clearErrors: vi.fn(),
    trigger: vi.fn(),
    resetField: vi.fn(),
    setFocus: vi.fn(),
    getFieldState: vi.fn(() => ({
      error: undefined,
      invalid: false,
      isDirty: false,
      isTouched: false
    })),
    control: {
      get _formValues() { return getAllFormValues(); },
      get _defaultValues() { return getAllFormValues(); }
    }
  };
};

// Setup DOM event capture for better integration
export const setupDOMFormIntegration = () => {
  // Initialize default form values for signup
  setFormValue('username', '');
  setFormValue('email', '');
  setFormValue('password', '');
  setFormValue('confirmPassword', '');
  setFormValue('homeserver', 'https://matrix.test.com');
  setFormValue('inviteCode', '');
  
  // Intercept input events globally to sync with form state
  if (typeof document !== 'undefined') {
    document.addEventListener('input', (event) => {
      const target = event.target as HTMLInputElement;
      if (target && target.name) {
        setFormValue(target.name, target.value);
      }
    });
    
    document.addEventListener('change', (event) => {
      const target = event.target as HTMLInputElement;
      if (target && target.name) {
        setFormValue(target.name, target.value);
      }
    });
  }
};