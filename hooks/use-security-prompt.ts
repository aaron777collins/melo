/**
 * Security Prompt Hook
 * 
 * Provides a convenient API for requesting password confirmations and destructive action warnings.
 */

import { useCallback } from "react";
import { useModal } from "@/hooks/use-modal-store";
import type { SecurityPromptConfig } from "@/components/modals/security-prompt-modal";

export function useSecurityPrompt() {
  const { onOpen } = useModal();

  /**
   * Request password confirmation for a security-sensitive action
   */
  const requestPasswordConfirmation = useCallback((
    title: string,
    description: string,
    actionText: string,
    onConfirm: (password: string) => Promise<boolean> | boolean,
    options?: {
      consequences?: string[];
      confirmationText?: string;
      icon?: SecurityPromptConfig["icon"];
      onCancel?: () => void;
    }
  ) => {
    const config: SecurityPromptConfig = {
      type: "passwordConfirm",
      title,
      description,
      requiresPassword: true,
      actionText,
      actionVariant: "destructive",
      icon: options?.icon || "key",
      consequences: options?.consequences,
      confirmationText: options?.confirmationText,
      onConfirm: async (data) => {
        if (data?.password) {
          return await onConfirm(data.password);
        }
        return false;
      },
      onCancel: options?.onCancel
    };

    onOpen("securityPrompt", { securityPromptConfig: config });
  }, [onOpen]);

  /**
   * Request confirmation for a destructive action (no password required)
   */
  const requestDestructiveConfirmation = useCallback((
    title: string,
    description: string,
    consequences: string[],
    actionText: string,
    onConfirm: () => Promise<boolean> | boolean,
    options?: {
      confirmationText?: string;
      icon?: SecurityPromptConfig["icon"];
      actionVariant?: SecurityPromptConfig["actionVariant"];
      onCancel?: () => void;
    }
  ) => {
    const config: SecurityPromptConfig = {
      type: "destructiveWarning",
      title,
      description,
      consequences,
      requiresPassword: false,
      actionText,
      actionVariant: options?.actionVariant || "destructive",
      icon: options?.icon || "warning",
      confirmationText: options?.confirmationText,
      onConfirm: async () => await onConfirm(),
      onCancel: options?.onCancel
    };

    onOpen("securityPrompt", { securityPromptConfig: config });
  }, [onOpen]);

  /**
   * Quick helpers for common security actions
   */
  const prompts = {
    /**
     * Confirm password change
     */
    changePassword: useCallback((onConfirm: (currentPassword: string) => Promise<boolean>) => {
      requestPasswordConfirmation(
        "Change Password",
        "Please enter your current password to change your account password.",
        "Change Password",
        onConfirm,
        {
          icon: "key",
          consequences: [
            "Your password will be updated",
            "You may be signed out of other devices"
          ]
        }
      );
    }, [requestPasswordConfirmation]),

    /**
     * Confirm 2FA setup/changes
     */
    setup2FA: useCallback((onConfirm: (password: string) => Promise<boolean>) => {
      requestPasswordConfirmation(
        "Setup Two-Factor Authentication",
        "Please enter your password to setup two-factor authentication.",
        "Enable 2FA",
        onConfirm,
        {
          icon: "shield",
          consequences: [
            "Two-factor authentication will be enabled",
            "You'll need your authenticator app to sign in"
          ]
        }
      );
    }, [requestPasswordConfirmation]),

    /**
     * Confirm device/session termination
     */
    terminateDevice: useCallback((deviceName: string, onConfirm: (password: string) => Promise<boolean>) => {
      requestPasswordConfirmation(
        "Sign Out Device",
        `Please enter your password to sign out "${deviceName}".`,
        "Sign Out Device",
        onConfirm,
        {
          icon: "shield",
          consequences: [
            "The device will be signed out immediately",
            "Encrypted message access may be lost on that device"
          ]
        }
      );
    }, [requestPasswordConfirmation]),

    /**
     * Confirm account deletion
     */
    deleteAccount: useCallback((onConfirm: (password: string) => Promise<boolean>) => {
      requestPasswordConfirmation(
        "Delete Account",
        "This action cannot be undone. Please enter your password to permanently delete your account.",
        "Delete My Account",
        onConfirm,
        {
          icon: "warning",
          confirmationText: "I understand that this will permanently delete my account and all associated data",
          consequences: [
            "Your account will be permanently deleted",
            "All messages and data will be lost",
            "You will be removed from all servers",
            "This action cannot be reversed"
          ]
        }
      );
    }, [requestPasswordConfirmation]),

    /**
     * Confirm destructive server action
     */
    deleteServer: useCallback((serverName: string, onConfirm: () => Promise<boolean>) => {
      requestDestructiveConfirmation(
        "Delete Server",
        `Are you sure you want to permanently delete "${serverName}"?`,
        [
          "All channels and messages will be deleted",
          "All members will be removed",
          "The server cannot be recovered",
          "This action is immediate and irreversible"
        ],
        "Delete Server",
        onConfirm,
        {
          confirmationText: `I understand that "${serverName}" will be permanently deleted`
        }
      );
    }, [requestDestructiveConfirmation]),

    /**
     * Confirm leaving server
     */
    leaveServer: useCallback((serverName: string, onConfirm: () => Promise<boolean>) => {
      requestDestructiveConfirmation(
        "Leave Server",
        `Are you sure you want to leave "${serverName}"?`,
        [
          "You will lose access to all channels",
          "Your message history will remain but you won't see new messages",
          "You'll need a new invite to rejoin"
        ],
        "Leave Server",
        onConfirm,
        {
          icon: "alert",
          actionVariant: "outline"
        }
      );
    }, [requestDestructiveConfirmation]),

    /**
     * Confirm user ban
     */
    banUser: useCallback((userName: string, onConfirm: () => Promise<boolean>) => {
      requestDestructiveConfirmation(
        "Ban User",
        `Are you sure you want to ban "${userName}" from this server?`,
        [
          "They will be immediately removed from the server",
          "They cannot rejoin unless unbanned",
          "Their messages will remain visible",
          "This action will be logged in the audit log"
        ],
        "Ban User",
        onConfirm
      );
    }, [requestDestructiveConfirmation])
  };

  return {
    requestPasswordConfirmation,
    requestDestructiveConfirmation,
    prompts
  };
}