/**
 * DOM Form Bridge - Connects DOM input events to react-hook-form mock
 * 
 * FIXED: [2026-03-09] Phoenix - Fixed ref callback return value and improved event handling
 * 
 * This integrates userEvent.type() and fireEvent changes with the form mock state
 */

import { vi } from 'vitest';

// Global form state that the mock and DOM bridge will share
let formState: Record<string, any> = {};

// Track registered elements for cleanup
const registeredElements: Map<string, HTMLInputElement> = new Map();

// Set form value (used by mock and bridge)
export const setFormValue = (name: string, value: any) => {
  formState[name] = value;
};

export const getFormValue = (name: string) => {
  return formState[name] ?? '';
};

export const getAllFormValues = () => {
  return { ...formState };
};

export const resetFormState = () => {
  // Clear the form state object
  formState = {
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    homeserver: 'https://matrix.test.com',
    inviteCode: ''
  };
  
  // Also clear registered element values
  registeredElements.forEach((element, name) => {
    try {
      element.value = '';
    } catch (e) {
      // Element may have been removed
    }
  });
  registeredElements.clear();
};

// Enhanced register function that creates DOM-connected inputs
const createRegisterFunction = () => {
  return (name: string, options?: any) => {
    const handleChange = (event: any) => {
      const value = event?.target?.value ?? event;
      setFormValue(name, value);
      // Call custom onChange if provided
      if (options?.onChange) {
        options.onChange(event);
      }
    };

    return {
      name,
      onChange: vi.fn(handleChange),
      onBlur: vi.fn(),
      ref: vi.fn((element: HTMLInputElement | null) => {
        if (element) {
          // Track the element
          registeredElements.set(name, element);
          
          // Set initial value from form state
          if (formState[name] !== undefined) {
            element.value = formState[name];
          }
          
          // Create event handlers that update form state
          const inputHandler = (e: Event) => {
            const target = e.target as HTMLInputElement;
            setFormValue(name, target.value);
          };
          
          // Add event listeners
          element.addEventListener('input', inputHandler);
          element.addEventListener('change', inputHandler);
          
          // Store cleanup info as data attribute (not as return value!)
          (element as any).__formBridgeCleanup = () => {
            element.removeEventListener('input', inputHandler);
            element.removeEventListener('change', inputHandler);
            registeredElements.delete(name);
          };
        }
        // CRITICAL: Don't return anything from ref callback!
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
      // Also update DOM element if it exists
      const element = registeredElements.get(name);
      if (element) {
        element.value = value;
      }
    }),
    formState: {
      get isSubmitting() { return false; },
      get errors() { return {}; },
      get isValid() { return true; },
      get isDirty() { 
        // Check if any values are non-empty
        const values = getAllFormValues();
        return Object.values(values).some(v => v && v !== 'https://matrix.test.com');
      },
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
  formState = {
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    homeserver: 'https://matrix.test.com',
    inviteCode: ''
  };
  
  // Global event listener for document-level capture
  if (typeof document !== 'undefined') {
    // Use capture phase to ensure we catch events before React
    const captureInputEvent = (event: Event) => {
      const target = event.target as HTMLInputElement;
      if (target && target.name && target.tagName === 'INPUT') {
        setFormValue(target.name, target.value);
      }
    };
    
    document.addEventListener('input', captureInputEvent, true);
    document.addEventListener('change', captureInputEvent, true);
  }
};
