/**
 * Toast Hook
 * 
 * Simple wrapper around sonner toast library for consistent toast usage
 */

import { toast } from "sonner";

export function useToast() {
  return {
    toast: {
      success: toast.success,
      error: toast.error,
      info: toast.info,
      warning: toast.warning,
      loading: toast.loading,
      dismiss: toast.dismiss,
      promise: toast.promise,
    }
  };
}