/**
 * Device Management Hook
 *
 * Provides React hooks for managing Matrix device sessions including
 * listing active devices, revoking sessions, and handling device state.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useMatrixClient } from "@/hooks/use-matrix-client";
import { 
  getActiveDevices, 
  revokeDevice, 
  revokeMultipleDevices,
  type DeviceInfo, 
  type DeviceRevocationResult 
} from "@/lib/matrix/devices";

// =============================================================================
// Types
// =============================================================================

interface UseDeviceManagementReturn {
  /** Array of active devices */
  devices: DeviceInfo[];
  /** Whether devices are currently loading */
  loading: boolean;
  /** Error message if loading failed */
  error: string | null;
  /** Refresh the device list */
  refreshDevices: () => Promise<void>;
  /** Revoke a single device */
  revokeDevice: (deviceId: string) => Promise<DeviceRevocationResult>;
  /** Revoke multiple devices */
  revokeMultipleDevices: (deviceIds: string[]) => Promise<DeviceRevocationResult[]>;
  /** Currently revoking device IDs */
  revokingDevices: Set<string>;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for managing Matrix device sessions
 *
 * Provides functionality to list, refresh, and revoke device sessions
 * with proper loading states and error handling.
 *
 * @example
 * ```tsx
 * function DeviceList() {
 *   const { 
 *     devices, 
 *     loading, 
 *     error, 
 *     refreshDevices, 
 *     revokeDevice, 
 *     revokingDevices 
 *   } = useDeviceManagement();
 *
 *   if (loading) return <div>Loading devices...</div>;
 *   if (error) return <div>Error: {error}</div>;
 *
 *   return (
 *     <div>
 *       {devices.map(device => (
 *         <DeviceCard 
 *           key={device.device_id}
 *           device={device}
 *           onRevoke={() => revokeDevice(device.device_id)}
 *           isRevoking={revokingDevices.has(device.device_id)}
 *         />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useDeviceManagement(): UseDeviceManagementReturn {
  const { client, isReady } = useMatrixClient();
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revokingDevices, setRevokingDevices] = useState<Set<string>>(new Set());

  /**
   * Load the device list from Matrix
   */
  const loadDevices = useCallback(async () => {
    if (!isReady || !client) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const deviceList = await getActiveDevices();
      setDevices(deviceList);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load devices";
      setError(errorMessage);
      console.error("Failed to load devices:", err);
    } finally {
      setLoading(false);
    }
  }, [client, isReady]);

  /**
   * Refresh the device list
   */
  const refreshDevices = useCallback(async () => {
    await loadDevices();
  }, [loadDevices]);

  /**
   * Revoke a single device session
   */
  const handleRevokeDevice = useCallback(async (deviceId: string): Promise<DeviceRevocationResult> => {
    if (!isReady || !client) {
      return {
        success: false,
        error: "Matrix client not ready",
        deviceId,
      };
    }

    // Add to revoking set
    setRevokingDevices(prev => {
      const next = new Set(prev);
      next.add(deviceId);
      return next;
    });

    try {
      const result = await revokeDevice(deviceId);
      
      if (result.success) {
        // Remove the device from the local list immediately for better UX
        setDevices(prev => prev.filter(device => device.device_id !== deviceId));
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to revoke device";
      return {
        success: false,
        error: errorMessage,
        deviceId,
      };
    } finally {
      // Remove from revoking set
      setRevokingDevices(prev => {
        const next = new Set(prev);
        next.delete(deviceId);
        return next;
      });
    }
  }, [client, isReady]);

  /**
   * Revoke multiple device sessions
   */
  const handleRevokeMultipleDevices = useCallback(async (deviceIds: string[]): Promise<DeviceRevocationResult[]> => {
    if (!isReady || !client) {
      return deviceIds.map(deviceId => ({
        success: false,
        error: "Matrix client not ready",
        deviceId,
      }));
    }

    // Add all devices to revoking set
    setRevokingDevices(prev => {
      const next = new Set(prev);
      deviceIds.forEach(id => next.add(id));
      return next;
    });

    try {
      const results = await revokeMultipleDevices(deviceIds);
      
      // Remove successfully revoked devices from local list
      const revokedDevices = results
        .filter(result => result.success)
        .map(result => result.deviceId);
      
      if (revokedDevices.length > 0) {
        setDevices(prev => 
          prev.filter(device => !revokedDevices.includes(device.device_id))
        );
      }
      
      return results;
    } catch (err) {
      console.error("Failed to revoke multiple devices:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to revoke devices";
      
      return deviceIds.map(deviceId => ({
        success: false,
        error: errorMessage,
        deviceId,
      }));
    } finally {
      // Remove all devices from revoking set
      setRevokingDevices(prev => {
        const next = new Set(prev);
        deviceIds.forEach(deviceId => next.delete(deviceId));
        return next;
      });
    }
  }, [client, isReady]);

  // Load devices when client becomes ready
  useEffect(() => {
    if (isReady && client && devices.length === 0 && !loading) {
      loadDevices();
    }
  }, [isReady, client, devices.length, loading, loadDevices]);

  return {
    devices,
    loading,
    error,
    refreshDevices,
    revokeDevice: handleRevokeDevice,
    revokeMultipleDevices: handleRevokeMultipleDevices,
    revokingDevices,
  };
}

// =============================================================================
// Additional Hooks
// =============================================================================

/**
 * Hook for getting a specific device by ID
 *
 * @param deviceId - The device ID to find
 * @returns The device info or null if not found
 */
export function useDevice(deviceId: string): DeviceInfo | null {
  const { devices } = useDeviceManagement();
  return devices.find(device => device.device_id === deviceId) || null;
}

/**
 * Hook for getting the current device info
 *
 * @returns The current device info or null if not found
 */
export function useCurrentDevice(): DeviceInfo | null {
  const { devices } = useDeviceManagement();
  return devices.find(device => device.isCurrentDevice) || null;
}

// =============================================================================
// Type Exports
// =============================================================================

export type { UseDeviceManagementReturn, DeviceInfo, DeviceRevocationResult };