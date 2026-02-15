/**
 * Matrix Device Management
 *
 * Provides device session management functionality including listing active sessions,
 * getting device information, and revoking sessions for security management.
 */

import { getClient } from "./client";
import type { IMyDevice } from "matrix-js-sdk/lib/client";

// =============================================================================
// Types
// =============================================================================

/**
 * Extended device information with additional metadata
 */
export interface DeviceInfo {
  /** Matrix device ID */
  device_id: string;
  /** Device display name */
  display_name?: string;
  /** Last time this device was seen */
  last_seen_ts?: number;
  /** IP address last used by this device */
  last_seen_ip?: string;
  /** Whether this is the current device */
  isCurrentDevice?: boolean;
  /** Formatted last seen date */
  lastSeenFormatted?: string;
  /** Device type (web, mobile, desktop) - inferred from display name */
  deviceType?: 'web' | 'mobile' | 'desktop' | 'unknown';
}

/**
 * Device revocation result
 */
export interface DeviceRevocationResult {
  /** Whether revocation was successful */
  success: boolean;
  /** Error message if revocation failed */
  error?: string;
  /** Device ID that was revoked */
  deviceId: string;
}

// =============================================================================
// Device Information
// =============================================================================

/**
 * Get all active Matrix sessions/devices for the current user
 *
 * @returns Promise resolving to array of device information
 */
export async function getActiveDevices(): Promise<DeviceInfo[]> {
  const client = getClient();
  
  if (!client) {
    throw new Error("Matrix client not initialized");
  }

  try {
    const currentDeviceId = client.getDeviceId();
    const devicesResponse = await client.getDevices();
    const devices: IMyDevice[] = devicesResponse.devices || [];
    
    return devices.map((device): DeviceInfo => {
      const isCurrentDevice = device.device_id === currentDeviceId;
      
      return {
        device_id: device.device_id,
        display_name: device.display_name || `Device ${device.device_id.slice(-4)}`,
        last_seen_ts: device.last_seen_ts,
        last_seen_ip: device.last_seen_ip,
        isCurrentDevice,
        lastSeenFormatted: device.last_seen_ts ? formatLastSeen(device.last_seen_ts) : undefined,
        deviceType: inferDeviceType(device.display_name || ''),
      };
    });
  } catch (error) {
    console.error("Failed to get devices:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to get device list");
  }
}

/**
 * Get information for a specific device
 *
 * @param deviceId - The device ID to get information for
 * @returns Promise resolving to device information or null if not found
 */
export async function getDeviceInfo(deviceId: string): Promise<DeviceInfo | null> {
  const devices = await getActiveDevices();
  return devices.find(device => device.device_id === deviceId) || null;
}

// =============================================================================
// Device Revocation
// =============================================================================

/**
 * Revoke/delete a Matrix device session
 *
 * This will log out the device and invalidate its access token.
 * The user will need to log in again on that device.
 *
 * @param deviceId - The device ID to revoke
 * @param authDict - Optional authentication dictionary (for user-interactive auth)
 * @returns Promise resolving to revocation result
 */
export async function revokeDevice(
  deviceId: string, 
  authDict?: any
): Promise<DeviceRevocationResult> {
  const client = getClient();
  
  if (!client) {
    return {
      success: false,
      error: "Matrix client not initialized",
      deviceId,
    };
  }

  try {
    // Check if this is the current device
    const currentDeviceId = client.getDeviceId();
    if (deviceId === currentDeviceId) {
      return {
        success: false,
        error: "Cannot revoke the current device session",
        deviceId,
      };
    }

    // Revoke the device
    await client.deleteDevice(deviceId, authDict);
    
    console.log(`Successfully revoked device: ${deviceId}`);
    
    return {
      success: true,
      deviceId,
    };
  } catch (error) {
    console.error(`Failed to revoke device ${deviceId}:`, error);
    
    // Extract useful error message
    let errorMessage = "Failed to revoke device";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      error: errorMessage,
      deviceId,
    };
  }
}

/**
 * Revoke multiple devices at once
 *
 * @param deviceIds - Array of device IDs to revoke
 * @param authDict - Optional authentication dictionary
 * @returns Promise resolving to array of revocation results
 */
export async function revokeMultipleDevices(
  deviceIds: string[], 
  authDict?: any
): Promise<DeviceRevocationResult[]> {
  const results: DeviceRevocationResult[] = [];
  
  // Process devices sequentially to avoid overwhelming the server
  for (const deviceId of deviceIds) {
    const result = await revokeDevice(deviceId, authDict);
    results.push(result);
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Format a timestamp into a human-readable "last seen" string
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted string like "2 hours ago", "3 days ago", etc.
 */
function formatLastSeen(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  // Convert to seconds
  const seconds = Math.floor(diff / 1000);
  
  if (seconds < 60) {
    return "Just now";
  }
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  }
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  }
  
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
  
  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months} month${months !== 1 ? 's' : ''} ago`;
  }
  
  const years = Math.floor(months / 12);
  return `${years} year${years !== 1 ? 's' : ''} ago`;
}

/**
 * Infer device type from display name
 *
 * @param displayName - The device display name
 * @returns Inferred device type
 */
function inferDeviceType(displayName: string): 'web' | 'mobile' | 'desktop' | 'unknown' {
  const name = displayName.toLowerCase();
  
  if (name.includes('web') || name.includes('browser') || name.includes('firefox') || name.includes('chrome') || name.includes('safari')) {
    return 'web';
  }
  
  if (name.includes('mobile') || name.includes('phone') || name.includes('android') || name.includes('ios') || name.includes('iphone')) {
    return 'mobile';
  }
  
  if (name.includes('desktop') || name.includes('electron') || name.includes('element desktop')) {
    return 'desktop';
  }
  
  return 'unknown';
}

/**
 * Get device icon based on device type
 *
 * @param deviceType - The device type
 * @returns Icon name for use with lucide-react icons
 */
export function getDeviceIcon(deviceType: DeviceInfo['deviceType']): string {
  switch (deviceType) {
    case 'web':
      return 'Monitor';
    case 'mobile':
      return 'Smartphone';
    case 'desktop':
      return 'Laptop';
    default:
      return 'HelpCircle';
  }
}