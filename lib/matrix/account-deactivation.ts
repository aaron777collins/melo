/**
 * Matrix Account Deactivation Service
 *
 * Provides functionality for deactivating Matrix accounts through the Matrix API.
 * Handles the account deactivation process with proper error handling and validation.
 */

import { MatrixClient } from "matrix-js-sdk";
import { Method } from "matrix-js-sdk/lib/http-api";
import { getClient } from "./client";

// =============================================================================
// Types
// =============================================================================

export interface DeactivationOptions {
  /** Whether to erase all user data from the homeserver */
  eraseData?: boolean;
  /** User password for authentication (required) */
  password: string;
}

export interface DeactivationResult {
  success: boolean;
  error?: string;
  details?: {
    userId: string;
    timestamp: Date;
    dataErased: boolean;
  };
}

// =============================================================================
// Account Deactivation Service
// =============================================================================

/**
 * Deactivate the current user's Matrix account
 *
 * This will permanently deactivate the account and optionally erase all user data.
 * The user will be unable to log in again after deactivation.
 *
 * @param options - Deactivation configuration
 * @returns Promise resolving to deactivation result
 */
export async function deactivateAccount(
  options: DeactivationOptions
): Promise<DeactivationResult> {
  try {
    const client = getClient();
    if (!client) {
      throw new Error("Matrix client not initialized");
    }

    const userId = client.getUserId();
    if (!userId) {
      throw new Error("User ID not available");
    }

    // Prepare deactivation request data
    const requestData: any = {
      // Standard Matrix deactivation
      auth: {
        type: "m.login.password",
        user: userId,
        password: options.password,
      },
    };

    // Add data erasure flag if specified
    if (options.eraseData) {
      requestData.erase = true;
    }

    // Call Matrix deactivation API using client method
    // This is a direct API call as the SDK doesn't have a built-in deactivate method
    const url = `${client.getHomeserverUrl()}/_matrix/client/v3/account/deactivate`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${client.getAccessToken()}`,
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        httpStatus: response.status,
        data: errorData,
        message: errorData.error || `HTTP ${response.status}`,
      };
    }

    // Return success result
    return {
      success: true,
      details: {
        userId,
        timestamp: new Date(),
        dataErased: options.eraseData ?? false,
      },
    };
  } catch (error: any) {
    console.error("[AccountDeactivation] Deactivation failed:", error);

    // Parse Matrix error response
    let errorMessage = "Unknown error occurred";
    
    if (error.data && error.data.error) {
      errorMessage = error.data.error;
    } else if (error.message) {
      errorMessage = error.message;
    }

    // Handle specific error codes
    if (error.httpStatus === 401 || error.data?.errcode === "M_FORBIDDEN") {
      errorMessage = "Invalid password. Please check your credentials.";
    } else if (error.data?.errcode === "M_USER_DEACTIVATED") {
      errorMessage = "Account is already deactivated.";
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Validate if account deactivation is possible
 *
 * Checks if the client is properly initialized and the user can deactivate their account.
 *
 * @returns Promise resolving to validation result
 */
export async function validateDeactivationEligibility(): Promise<{
  eligible: boolean;
  reason?: string;
  userId?: string;
}> {
  try {
    const client = getClient();
    if (!client) {
      return {
        eligible: false,
        reason: "Matrix client not initialized. Please log in again.",
      };
    }

    const userId = client.getUserId();
    if (!userId) {
      return {
        eligible: false,
        reason: "User ID not available. Please log in again.",
      };
    }

    // Check if client is synced and ready
    const syncState = client.getSyncState();
    if (syncState !== "SYNCING" && syncState !== "PREPARED") {
      return {
        eligible: false,
        reason: "Matrix client not ready. Please wait for sync to complete.",
      };
    }

    return {
      eligible: true,
      userId,
    };
  } catch (error) {
    console.error("[AccountDeactivation] Validation failed:", error);
    return {
      eligible: false,
      reason: "Failed to validate account status.",
    };
  }
}

/**
 * Get information about what will happen when the account is deactivated
 *
 * @param userId - The user ID to get info for
 * @returns Information about the deactivation consequences
 */
export function getDeactivationInfo(userId: string) {
  return {
    consequences: [
      "Your account will be permanently deactivated and cannot be recovered",
      "You will be immediately logged out of all devices",
      "You will be removed from all rooms and spaces",
      "Your profile information (display name, avatar) will be removed",
      "Other users will no longer be able to find or message you",
      "Your message history in rooms will remain visible to other users",
    ],
    dataOptions: {
      keepData: {
        description: "Keep your message history visible in rooms",
        details: [
          "Your messages remain visible to other room members",
          "Room admins can still see your participation history",
          "Your user ID will be marked as deactivated",
        ],
      },
      eraseData: {
        description: "Request removal of all your data (if supported)",
        details: [
          "Attempts to remove your messages from all rooms",
          "Profile data will be completely erased",
          "Some data may remain due to Matrix protocol limitations",
          "Implementation depends on homeserver support",
        ],
      },
    },
    userId,
  };
}