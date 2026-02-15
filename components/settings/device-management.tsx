/**
 * Device Management Component
 *
 * Provides UI for viewing and managing Matrix device sessions including
 * listing active sessions, showing device info, and revoking sessions.
 */

"use client";

import { useState, useCallback } from "react";
import {
  Smartphone,
  Monitor,
  Laptop,
  HelpCircle,
  RefreshCw,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  Shield,
  ShieldCheck,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

import { useDeviceManagement } from "@/hooks/use-device-management";
import { getDeviceIcon, type DeviceInfo } from "@/lib/matrix/devices";

// =============================================================================
// Types
// =============================================================================

interface DeviceManagementProps {
  className?: string;
}

// =============================================================================
// Device Card Component
// =============================================================================

interface DeviceCardProps {
  device: DeviceInfo;
  onRevoke: () => void;
  isRevoking: boolean;
  onSelect?: (deviceId: string, selected: boolean) => void;
  isSelected?: boolean;
  showCheckbox?: boolean;
}

function DeviceCard({ 
  device, 
  onRevoke, 
  isRevoking, 
  onSelect, 
  isSelected = false, 
  showCheckbox = false 
}: DeviceCardProps) {
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);

  const getDeviceIconComponent = () => {
    const iconName = getDeviceIcon(device.deviceType);
    switch (iconName) {
      case 'Monitor':
        return <Monitor className="h-5 w-5" />;
      case 'Smartphone':
        return <Smartphone className="h-5 w-5" />;
      case 'Laptop':
        return <Laptop className="h-5 w-5" />;
      default:
        return <HelpCircle className="h-5 w-5" />;
    }
  };

  const handleRevoke = useCallback(async () => {
    await onRevoke();
    setShowRevokeDialog(false);
  }, [onRevoke]);

  const formatDeviceId = (deviceId: string) => {
    // Show first 8 and last 4 characters for readability
    if (deviceId.length <= 12) return deviceId;
    return `${deviceId.slice(0, 8)}...${deviceId.slice(-4)}`;
  };

  const getDeviceStatusColor = () => {
    if (device.isCurrentDevice) {
      return "border-green-200 bg-green-50";
    }
    return "border-gray-200 bg-white";
  };

  return (
    <>
      <Card className={getDeviceStatusColor()}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              {showCheckbox && !device.isCurrentDevice && (
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => onSelect?.(device.device_id, !!checked)}
                  className="mt-1"
                />
              )}
              
              <div className="flex items-center gap-2 text-muted-foreground">
                {getDeviceIconComponent()}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <CardTitle className="text-base truncate">
                    {device.display_name || `Device ${device.device_id.slice(-4)}`}
                  </CardTitle>
                  
                  {device.isCurrentDevice && (
                    <Badge variant="default" className="text-xs">
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      Current Device
                    </Badge>
                  )}
                </div>
                
                <CardDescription className="text-sm">
                  <span className="font-mono text-xs">
                    {formatDeviceId(device.device_id)}
                  </span>
                </CardDescription>
              </div>
            </div>

            {!device.isCurrentDevice && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRevokeDialog(true)}
                disabled={isRevoking}
                className="text-destructive hover:text-destructive"
              >
                {isRevoking ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {/* Last Seen */}
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Last Seen</div>
                <div className="text-muted-foreground">
                  {device.lastSeenFormatted || "Unknown"}
                </div>
              </div>
            </div>

            {/* IP Address */}
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Location</div>
                <div className="text-muted-foreground font-mono text-xs">
                  {device.last_seen_ip || "Unknown"}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revoke Confirmation Dialog */}
      <Dialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Revoke Device Session
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke this device session? This will log out the device
              and it will need to sign in again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>This action cannot be undone.</strong> The device will be immediately
                logged out and will need to sign in again to access your account.
              </AlertDescription>
            </Alert>

            <div className="p-3 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                {getDeviceIconComponent()}
                <span className="font-medium">
                  {device.display_name || `Device ${device.device_id.slice(-4)}`}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                <div>ID: {formatDeviceId(device.device_id)}</div>
                {device.last_seen_ip && <div>IP: {device.last_seen_ip}</div>}
                {device.lastSeenFormatted && <div>Last seen: {device.lastSeenFormatted}</div>}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevokeDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={isRevoking}
            >
              {isRevoking ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Revoking...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Revoke Session
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// =============================================================================
// Bulk Actions Component
// =============================================================================

interface BulkActionsProps {
  selectedDevices: string[];
  onRevokeSelected: () => void;
  onClearSelection: () => void;
  isRevoking: boolean;
}

function BulkActions({ selectedDevices, onRevokeSelected, onClearSelection, isRevoking }: BulkActionsProps) {
  const [showBulkRevokeDialog, setShowBulkRevokeDialog] = useState(false);

  const handleBulkRevoke = useCallback(async () => {
    await onRevokeSelected();
    setShowBulkRevokeDialog(false);
  }, [onRevokeSelected]);

  if (selectedDevices.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-amber-600" />
              <span className="font-medium">
                {selectedDevices.length} device{selectedDevices.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowBulkRevokeDialog(true)}
                disabled={isRevoking}
              >
                {isRevoking ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Revoke Selected
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Revoke Confirmation Dialog */}
      <Dialog open={showBulkRevokeDialog} onOpenChange={setShowBulkRevokeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Revoke Multiple Sessions
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke {selectedDevices.length} device session{selectedDevices.length !== 1 ? 's' : ''}?
              All selected devices will be logged out immediately.
            </DialogDescription>
          </DialogHeader>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>This action cannot be undone.</strong> All selected devices will be
              immediately logged out and will need to sign in again.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkRevokeDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkRevoke}
              disabled={isRevoking}
            >
              {isRevoking ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Revoking...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Revoke {selectedDevices.length} Sessions
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Device Management component for viewing and revoking Matrix sessions
 */
export function DeviceManagement({ className }: DeviceManagementProps) {
  const { 
    devices, 
    loading, 
    error, 
    refreshDevices, 
    revokeDevice, 
    revokeMultipleDevices, 
    revokingDevices 
  } = useDeviceManagement();

  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  const handleDeviceSelect = useCallback((deviceId: string, selected: boolean) => {
    setSelectedDevices(prev => {
      if (selected) {
        return [...prev, deviceId];
      } else {
        return prev.filter(id => id !== deviceId);
      }
    });
  }, []);

  const handleRevokeSelected = useCallback(async () => {
    if (selectedDevices.length === 0) return;

    try {
      await revokeMultipleDevices(selectedDevices);
      setSelectedDevices([]);
    } catch (err) {
      console.error("Failed to revoke selected devices:", err);
    }
  }, [selectedDevices, revokeMultipleDevices]);

  const handleClearSelection = useCallback(() => {
    setSelectedDevices([]);
  }, []);

  const toggleBulkActions = useCallback(() => {
    setShowBulkActions(prev => !prev);
    if (showBulkActions) {
      setSelectedDevices([]);
    }
  }, [showBulkActions]);

  const otherDevices = devices.filter(device => !device.isCurrentDevice);
  const currentDevice = devices.find(device => device.isCurrentDevice);

  const isAnyRevoking = revokingDevices.size > 0;

  return (
    <div className={`space-y-6 ${className || ""}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Device Management
              </CardTitle>
              <CardDescription>
                View and manage all active Matrix sessions for your account
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              {otherDevices.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleBulkActions}
                >
                  {showBulkActions ? "Cancel Selection" : "Select Multiple"}
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={refreshDevices}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load devices: {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading && devices.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-3" />
            <span>Loading devices...</span>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions */}
      {showBulkActions && (
        <BulkActions
          selectedDevices={selectedDevices}
          onRevokeSelected={handleRevokeSelected}
          onClearSelection={handleClearSelection}
          isRevoking={isAnyRevoking}
        />
      )}

      {/* Current Device */}
      {currentDevice && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Current Device</h3>
          <DeviceCard
            device={currentDevice}
            onRevoke={() => {}}
            isRevoking={false}
          />
        </div>
      )}

      {/* Other Devices */}
      {otherDevices.length > 0 && (
        <>
          {currentDevice && <Separator />}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">
              Other Devices ({otherDevices.length})
            </h3>
            <div className="space-y-3">
              {otherDevices.map((device) => (
                <DeviceCard
                  key={device.device_id}
                  device={device}
                  onRevoke={() => revokeDevice(device.device_id)}
                  isRevoking={revokingDevices.has(device.device_id)}
                  onSelect={handleDeviceSelect}
                  isSelected={selectedDevices.includes(device.device_id)}
                  showCheckbox={showBulkActions}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {/* No Other Devices */}
      {!loading && otherDevices.length === 0 && currentDevice && (
        <>
          <Separator />
          <Card>
            <CardContent className="flex items-center justify-center p-8 text-center">
              <div>
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-2">Only One Active Session</h3>
                <p className="text-muted-foreground">
                  You only have one active device session. Any new devices you log in with
                  will appear here for management.
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Security Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Security Best Practices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <span>Regularly review your active sessions and revoke any you don&apos;t recognize</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <span>Log out of devices you no longer use or have lost access to</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <span>If you suspect unauthorized access, revoke all other sessions immediately</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default DeviceManagement;