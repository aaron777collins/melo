/**
 * Enhanced React Hook Form Mock for Test Compatibility
 * 
 * This mock creates a stateful form that properly captures user input
 * and passes it through to form submission handlers.
 */
import { vi } from 'vitest';

// Track form values in a stateful way
let formValues: Record<string, any> = {};
let formErrors: Record<string, any> = {};
let formTouchedFields: Record<string, boolean> = {};
let isSubmitting = false;

// Initialize with default values for the signup form
const initializeForm = (defaultValues: Record<string, any> = {}) => {
  formValues = {
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    homeserver: 'https://matrix.test.com',
    inviteCode: '',
    ...defaultValues
  };
  formErrors = {};
  formTouchedFields = {};
  isSubmitting = false;
};

// Initialize form with signup defaults
initializeForm();

// Create input handlers that update form state
const createInputHandlers = (name: string) => ({
  name,
  onChange: vi.fn((event: any) => {
    const value = event?.target?.value ?? event;
    formValues[name] = value;
    formTouchedFields[name] = true;
    
    // Clear errors when user starts typing
    if (formErrors[name]) {
      delete formErrors[name];
    }
  }),
  onBlur: vi.fn(() => {
    formTouchedFields[name] = true;
  }),
  value: formValues[name] || '',
  ref: vi.fn()
});

// Enhanced form mock with proper state management
export const createEnhancedFormMock = (customDefaults: Record<string, any> = {}) => {
  initializeForm(customDefaults);

  const mockForm = {
    // Handle form submission with actual form values
    handleSubmit: vi.fn((onSubmit) => {
      return vi.fn(async (e) => {
        e?.preventDefault?.();
        
        // Prevent multiple rapid submissions
        if (isSubmitting) {
          return;
        }
        
        isSubmitting = true;
        
        try {
          // Pass actual form values to the submit handler
          await onSubmit(formValues);
        } finally {
          isSubmitting = false;
        }
      });
    }),

    // Register function that creates proper input handlers
    register: vi.fn((name: string, options?: any) => {
      const handlers = createInputHandlers(name);
      return handlers;
    }),

    // Watch function that returns actual form values
    watch: vi.fn((fieldName?: string) => {
      if (!fieldName) {
        return formValues; // Return all values if no field specified
      }
      return formValues[fieldName] || '';
    }),

    // Get current form values
    getValues: vi.fn((fieldName?: string) => {
      if (!fieldName) {
        return formValues;
      }
      return formValues[fieldName];
    }),

    // Set form values programmatically
    setValue: vi.fn((name: string, value: any) => {
      formValues[name] = value;
      formTouchedFields[name] = true;
    }),

    // Form state with dynamic values
    formState: {
      get isSubmitting() { return isSubmitting; },
      get errors() { return formErrors; },
      get isValid() { 
        return Object.keys(formErrors).length === 0;
      },
      get isDirty() { 
        return Object.keys(formTouchedFields).length > 0;
      },
      get touchedFields() { return formTouchedFields; },
      isValidating: false,
      submitCount: 0,
      defaultValues: formValues
    },

    // Other form methods
    reset: vi.fn((newValues?: any) => {
      if (newValues) {
        formValues = { ...newValues };
      } else {
        initializeForm();
      }
      formErrors = {};
      formTouchedFields = {};
      isSubmitting = false;
    }),

    setError: vi.fn((name: string, error: any) => {
      formErrors[name] = error;
    }),

    clearErrors: vi.fn((name?: string) => {
      if (name) {
        delete formErrors[name];
      } else {
        formErrors = {};
      }
    }),

    trigger: vi.fn(),
    resetField: vi.fn(),
    setFocus: vi.fn(),
    
    getFieldState: vi.fn((name: string) => ({
      error: formErrors[name],
      invalid: !!formErrors[name],
      isDirty: !!formTouchedFields[name],
      isTouched: !!formTouchedFields[name]
    })),

    control: {
      get _formValues() { return formValues; },
      get _defaultValues() { return formValues; }
    }
  };

  return mockForm;
};

// Utility functions for testing
export const setFormValue = (name: string, value: any) => {
  formValues[name] = value;
  formTouchedFields[name] = true;
};

export const getFormValue = (name: string) => {
  return formValues[name];
};

export const resetFormState = () => {
  initializeForm();
};

export const getFormState = () => ({
  values: formValues,
  errors: formErrors,
  touched: formTouchedFields,
  isSubmitting
});

// Export the enhanced mock implementation
export const enhancedReactHookFormMock = {
  useForm: vi.fn(() => createEnhancedFormMock()),
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
  useFormContext: vi.fn(() => createEnhancedFormMock()),
  FormProvider: ({ children }: any) => children
};