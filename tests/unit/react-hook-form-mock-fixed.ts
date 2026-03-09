/**
 * Fixed React Hook Form Mock - Per-component instances with proper DOM integration
 */

import { vi } from 'vitest';

// Individual form instances for proper isolation
const formInstances: Map<string, any> = new Map();
let instanceCounter = 0;

// Helper to create unique form instances
const createFormInstance = (options: any = {}) => {
  const instanceId = `form_${++instanceCounter}`;
  const formValues: Record<string, any> = { ...options.defaultValues };
  
  // Helper functions
  const setValue = (name: string, value: any, options?: any) => {
    formValues[name] = value;
    // Trigger rerender if needed
    if (options?.shouldValidate) {
      // Validation logic could go here
    }
  };
  
  const getValue = (name?: string) => {
    if (!name) return { ...formValues };
    return formValues[name] ?? '';
  };
  
  const watch = vi.fn((fieldName?: string) => {
    if (!fieldName) return { ...formValues };
    return formValues[fieldName] ?? '';
  });
  
  const getValues = vi.fn((fieldName?: string) => {
    if (!fieldName) return { ...formValues };
    return formValues[fieldName] ?? '';
  });
  
  // Enhanced register that properly handles DOM events
  const register = vi.fn((name: string, options?: any) => ({
    name,
    onChange: vi.fn((event: any) => {
      const value = event?.target?.value ?? event;
      setValue(name, value);
    }),
    onBlur: vi.fn(),
    ref: vi.fn((element: HTMLInputElement | null) => {
      if (element) {
        // Set initial value
        element.value = getValue(name);
        
        // Listen for DOM events and sync to form state
        const handleInput = () => {
          setValue(name, element.value);
        };
        
        element.addEventListener('input', handleInput);
        element.addEventListener('change', handleInput);
        
        // Return cleanup function
        return () => {
          element.removeEventListener('input', handleInput);
          element.removeEventListener('change', handleInput);
        };
      }
    })
  }));
  
  const handleSubmit = vi.fn((onValid: (data: any) => void, onInvalid?: (errors: any) => void) => {
    return vi.fn(async (e?: Event) => {
      e?.preventDefault?.();
      try {
        await onValid(getValue());
      } catch (error) {
        onInvalid?.(error);
      }
    });
  });
  
  const formState = {
    get errors() { return {}; },
    get isSubmitting() { return false; },
    get isValid() { return true; },
    get isDirty() { 
      return Object.keys(formValues).some(key => 
        formValues[key] !== (options.defaultValues?.[key] ?? '')
      );
    },
    touchedFields: {},
    isValidating: false,
    submitCount: 0,
    defaultValues: options.defaultValues || {}
  };
  
  const formInstance = {
    register,
    handleSubmit,
    watch,
    getValues,
    setValue: vi.fn(setValue),
    reset: vi.fn(() => {
      Object.keys(formValues).forEach(key => {
        formValues[key] = options.defaultValues?.[key] ?? '';
      });
    }),
    formState,
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
      get _formValues() { return getValue(); },
      get _defaultValues() { return options.defaultValues || {}; }
    }
  };
  
  formInstances.set(instanceId, formInstance);
  return formInstance;
};

// Mock useForm that creates new instances
export const mockUseForm = vi.fn((options?: any) => {
  return createFormInstance(options);
});

// Enhanced mock for react-hook-form
export const reactHookFormMock = () => ({
  useForm: mockUseForm,
  useController: vi.fn(() => ({
    field: {
      value: '',
      onChange: vi.fn(),
      onBlur: vi.fn(),
      name: 'field',
      ref: vi.fn()
    },
    fieldState: {
      error: undefined,
      invalid: false,
      isDirty: false,
      isTouched: false
    }
  })),
  Controller: ({ render }: any) => render?.({
    field: {
      value: '',
      onChange: vi.fn(),
      onBlur: vi.fn(),
      name: 'field',
      ref: vi.fn()
    },
    fieldState: {
      error: undefined,
      invalid: false,
      isDirty: false,
      isTouched: false
    }
  }),
  useFormContext: vi.fn(() => createFormInstance()),
  FormProvider: ({ children }: any) => children
});

// Utility to reset all form instances (for test cleanup)
export const resetFormInstances = () => {
  formInstances.clear();
  instanceCounter = 0;
};