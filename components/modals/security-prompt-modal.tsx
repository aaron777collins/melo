/**
 * Security Prompt Modal
 * 
 * Provides password confirmation and destructive action warnings for sensitive operations.
 * Supports both password-protected actions and destructive action confirmations with consequences.
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Shield,
  ShieldAlert,
  AlertTriangle,
  Key,
  Loader2,
  Eye,
  EyeOff,
  Lock
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
  AlertDialogCancel
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

import { useModal } from "@/hooks/use-modal-store";

// =============================================================================
// Types and Schemas
// =============================================================================

const passwordConfirmSchema = z.object({
  password: z.string().min(1, "Password is required"),
  confirmAction: z.boolean().optional()
});

type PasswordConfirmFormData = z.infer<typeof passwordConfirmSchema>;

export interface SecurityPromptConfig {
  /** The type of security prompt */
  type: "passwordConfirm" | "destructiveWarning";
  /** Title of the prompt */
  title: string;
  /** Description of the action */
  description: string;
  /** Detailed consequences (for destructive actions) */
  consequences?: string[];
  /** Required confirmation text (for destructive actions) */
  confirmationText?: string;
  /** Whether action requires password confirmation */
  requiresPassword: boolean;
  /** Action button text */
  actionText: string;
  /** Action button variant */
  actionVariant?: "default" | "destructive" | "outline" | "secondary";
  /** Icon to display */
  icon?: "shield" | "warning" | "key" | "alert";
  /** Callback when confirmed */
  onConfirm: (data?: { password?: string }) => Promise<boolean> | boolean;
  /** Callback when cancelled */
  onCancel?: () => void;
}

// =============================================================================
// Components
// =============================================================================

/**
 * Password confirmation form
 */
function PasswordConfirmationForm({
  config,
  onSubmit,
  isLoading
}: {
  config: SecurityPromptConfig;
  onSubmit: (data: PasswordConfirmFormData) => Promise<void>;
  isLoading: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<PasswordConfirmFormData>({
    resolver: zodResolver(passwordConfirmSchema),
    defaultValues: {
      password: "",
      confirmAction: false
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Password field */}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2 text-sm font-medium">
                <Key className="h-4 w-4" />
                Confirm Password
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password to continue..."
                    disabled={isLoading}
                    className="pr-10"
                    {...field}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Additional confirmation checkbox for highly destructive actions */}
        {config.confirmationText && (
          <FormField
            control={form.control}
            name="confirmAction"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={!!field.value}
                    onCheckedChange={field.onChange}
                    disabled={isLoading}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-sm font-normal">
                    {config.confirmationText}
                  </FormLabel>
                </div>
              </FormItem>
            )}
          />
        )}

        {/* Form buttons */}
        <DialogFooter className="bg-gray-100 dark:bg-zinc-800 px-6 py-4 -mx-6 -mb-6 mt-6">
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={config.onCancel}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={config.actionVariant || "destructive"}
              disabled={isLoading || !!(config.confirmationText && !form.watch("confirmAction"))}
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {config.actionText}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </Form>
  );
}

/**
 * Simple destructive action confirmation (no password required)
 */
function DestructiveConfirmationDialog({
  config,
  isOpen,
  onOpenChange
}: {
  config: SecurityPromptConfig;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      const success = await config.onConfirm();
      if (success !== false) {
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Action failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    config.onCancel?.();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
          </div>
          
          <AlertDialogTitle className="text-xl text-center font-bold">
            {config.title}
          </AlertDialogTitle>
          
          <AlertDialogDescription className="text-center">
            {config.description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Consequences warning */}
        {config.consequences && config.consequences.length > 0 && (
          <div className="my-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-2">This action will:</div>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {config.consequences.map((consequence, index) => (
                    <li key={index}>{consequence}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isLoading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {config.actionText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Main security prompt modal that handles both password confirmation and destructive warnings
 */
export function SecurityPromptModal() {
  const { isOpen, onClose, type, data } = useModal();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isModalOpen = isOpen && type === "securityPrompt";
  const config = data.securityPromptConfig as SecurityPromptConfig | undefined;

  // Reset state when modal closes
  useEffect(() => {
    if (!isModalOpen) {
      setIsLoading(false);
      setError(null);
    }
  }, [isModalOpen]);

  const handlePasswordConfirm = useCallback(async (formData: PasswordConfirmFormData) => {
    if (!config) return;

    try {
      setIsLoading(true);
      setError(null);

      const success = await config.onConfirm({ password: formData.password });
      
      if (success !== false) {
        onClose();
      } else {
        setError("Invalid password or action failed");
      }
    } catch (error) {
      console.error("Security prompt failed:", error);
      setError(error instanceof Error ? error.message : "Action failed");
    } finally {
      setIsLoading(false);
    }
  }, [config, onClose]);

  const handleCancel = useCallback(() => {
    config?.onCancel?.();
    onClose();
  }, [config, onClose]);

  if (!config) return null;

  const getPromptIcon = () => {
    switch (config.icon) {
      case "shield": return <Shield className="h-8 w-8 text-blue-600" />;
      case "warning": return <AlertTriangle className="h-8 w-8 text-red-600" />;
      case "key": return <Key className="h-8 w-8 text-green-600" />;
      case "alert": return <ShieldAlert className="h-8 w-8 text-amber-600" />;
      default: return <Lock className="h-8 w-8 text-gray-600" />;
    }
  };

  // For simple destructive actions without password requirement
  if (!config.requiresPassword) {
    return (
      <DestructiveConfirmationDialog
        config={config}
        isOpen={isModalOpen}
        onOpenChange={(open) => !open && onClose()}
      />
    );
  }

  // For password-protected security actions
  return (
    <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="bg-white dark:bg-zinc-900 text-black dark:text-white p-0 overflow-hidden max-w-md">
        <DialogHeader className="pt-8 px-6">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full">
              {getPromptIcon()}
            </div>
          </div>
          
          <DialogTitle className="text-xl text-center font-bold">
            {config.title}
          </DialogTitle>
          
          <DialogDescription className="text-center text-zinc-500 dark:text-zinc-400">
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6">
          {/* Consequences warning for destructive password-protected actions */}
          {config.consequences && config.consequences.length > 0 && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-2">This action will:</div>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {config.consequences.map((consequence, index) => (
                    <li key={index}>{consequence}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Error message */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Password confirmation form */}
          <PasswordConfirmationForm
            config={config}
            onSubmit={handlePasswordConfirm}
            isLoading={isLoading}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}