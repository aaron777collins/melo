/**
 * Device Manager Component
 *
 * Manages Matrix device sessions with detailed device information,
 * verification status, and session management capabilities.
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  MapPin,
  Clock,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  MoreVertical,
  Eye,
  EyeOff
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useMatrixClient } from "@/hooks/use-matrix-client";
import { type MatrixProfile } from "@/lib/current-profile";

// =============================================================================
// Types
// =============================================================================

interface MatrixDevice {
  deviceId: string;
  displayName?: string;
  lastSeenTs?: number;
  lastSeenIp?: string;
  userId: string;
  verified?: boolean;
  blocked?: boolean;
  known?: boolean;
}

interface DeviceSession {
  deviceId: string;
  displayName: string;
  deviceType: "mobile" | "desktop" | "web" | "unknown";
  platform: string;
  location?: string;
  ipAddress?: string;
  lastActive: Date;
  isCurrent: boolean;
  isVerified: boolean;
  isBlocked: boolean;
  rawDevice: MatrixDevice;
}

interface DeviceManagerProps {
  profile: MatrixProfile;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Determine device type from display name or device info
 */
function getDeviceType(displayName?: string): "mobile" | "desktop" | "web" | "unknown" {
  if (!displayName) return "unknown";
  
  const name = displayName.toLowerCase();
  
  if (name.includes("mobile") || name.includes("android") || name.includes("ios") || 
      name.includes("iphone") || name.includes("ipad")) {
    return "mobile";
  }
  
  if (name.includes("web") || name.includes("browser") || name.includes("firefox") || 
      name.includes("chrome") || name.includes("safari")) {
    return "web";
  }
  
  if (name.includes("desktop") || name.includes("windows") || name.includes("macos") || 
      name.includes("linux")) {
    return "desktop";
  }
  
  return "unknown";
}

/**
 * Get device type icon
 */
function getDeviceIcon(deviceType: "mobile" | "desktop" | "web" | "unknown") {
  switch (deviceType) {
    case "mobile":
      return Smartphone;
    case "desktop":
      return Monitor;
    case "web":
      return Globe;
    default:
      return Tablet;
  }
}

/**
 * Get platform from display name
 */
function getPlatform(displayName?: string): string {
  if (!displayName) return "Unknown Platform";
  
  const name = displayName.toLowerCase();
  
  if (name.includes("android")) return "Android";
  if (name.includes("ios") || name.includes("iphone") || name.includes("ipad")) return "iOS";
  if (name.includes("windows")) return "Windows";
  if (name.includes("macos") || name.includes("mac")) return "macOS";
  if (name.includes("linux")) return "Linux";
  if (name.includes("chrome")) return "Chrome";
  if (name.includes("firefox")) return "Firefox";
  if (name.includes("safari")) return "Safari";
  
  return displayName;
}

/**
 * Format last active timestamp
 */
function formatLastActive(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString();
}

/**
 * Convert Matrix device to DeviceSession
 */
function matrixDeviceToSession(device: MatrixDevice, currentDeviceId?: string): DeviceSession {
  const deviceType = getDeviceType(device.displayName);
  const platform = getPlatform(device.displayName);
  const lastActive = device.lastSeenTs ? new Date(device.lastSeenTs) : new Date();
  
  return {
    deviceId: device.deviceId,
    displayName: device.displayName || `Unknown Device (${device.deviceId.slice(0, 8)}...)`,
    deviceType,
    platform,
    location: device.lastSeenIp ? `IP: ${device.lastSeenIp}` : undefined,
    ipAddress: device.lastSeenIp,
    lastActive,
    isCurrent: device.deviceId === currentDeviceId,
    isVerified: device.verified || false,
    isBlocked: device.blocked || false,
    rawDevice: device
  };
}

// =============================================================================
// Components
// =============================================================================

/**
 * Device session card component
 */
function DeviceSessionCard({ 
  session, 
  onRevoke, 
  onVerify, 
  onBlock,
  showActions = true
}: {
  session: DeviceSession;
  onRevoke: (deviceId: string) => Promise<void>;
  onVerify: (deviceId: string) => Promise<void>;
  onBlock: (deviceId: string) => Promise<void>;
  showActions?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  const DeviceIcon = getDeviceIcon(session.deviceType);
  
  const handleAction = async (action: () => Promise<void>) => {
    setLoading(true);
    try {
      await action();
    } catch (error) {
      console.error("Device action failed:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const getVerificationIcon = () => {
    if (session.isBlocked) {
      return <ShieldOff className="h-4 w-4 text-red-500" />;
    }
    if (session.isVerified) {
      return <ShieldCheck className="h-4 w-4 text-green-500" />;
    }
    return <ShieldAlert className="h-4 w-4 text-amber-500" />;
  };
  
  const getVerificationStatus = () => {
    if (session.isBlocked) return "Blocked";
    if (session.isVerified) return "Verified";
    return "Unverified";
  };
  
  const getVerificationColor = () => {
    if (session.isBlocked) return "destructive";
    if (session.isVerified) return "default";
    return "secondary";
  };

  return (
    <Card className="relative">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="flex-shrink-0 mt-1">
              <DeviceIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="font-medium truncate">
                  {session.displayName}
                </h3>
                {session.isCurrent && (
                  <Badge variant="outline" className="text-xs">
                    Current
                  </Badge>
                )}
                <Badge variant={getVerificationColor()} className="text-xs">
                  {getVerificationIcon()}
                  {getVerificationStatus()}
                </Badge>
              </div>
              
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Monitor className="h-3 w-3" />
                  <span>{session.platform}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  <span>Last active: {formatLastActive(session.lastActive.getTime())}</span>
                </div>
                
                {session.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3" />
                    <span>{session.location}</span>
                  </div>
                )}
              </div>
              
              {showDetails && (
                <div className="mt-2 p-2 bg-muted rounded text-xs space-y-1">
                  <div><strong>Device ID:</strong> {session.deviceId}</div>
                  {session.ipAddress && (
                    <div><strong>IP Address:</strong> {session.ipAddress}</div>
                  )}
                  <div><strong>Last Seen:</strong> {session.lastActive.toLocaleString()}</div>
                </div>
              )}
            </div>
          </div>
          
          {showActions && (
            <div className="flex items-center gap-1 ml-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" disabled={loading}>
                    {loading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <MoreVertical className="h-4 w-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                
                <DropdownMenuContent align="end">
                  {!session.isVerified && (
                    <DropdownMenuItem onClick={() => handleAction(() => onVerify(session.deviceId))}>
                      <Shield className="h-4 w-4 mr-2" />
                      Verify Device
                    </DropdownMenuItem>
                  )}
                  
                  {!session.isBlocked && (
                    <DropdownMenuItem onClick={() => handleAction(() => onBlock(session.deviceId))}>
                      <ShieldOff className="h-4 w-4 mr-2" />
                      Block Device
                    </DropdownMenuItem>
                  )}
                  
                  {!session.isCurrent && (
                    <DropdownMenuItem 
                      onClick={() => handleAction(() => onRevoke(session.deviceId))}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Revoke Session
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Revoke device confirmation dialog
 */
function RevokeDeviceDialog({
  session,
  open,
  onOpenChange,
  onConfirm
}: {
  session: DeviceSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const [loading, setLoading] = useState(false);
  
  const handleConfirm = async () => {
    setLoading(true);
    try {
      onConfirm();
    } finally {
      setLoading(false);
    }
  };
  
  if (!session) return null;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Revoke Device Session</DialogTitle>
          <DialogDescription>
            Are you sure you want to revoke this device session? This will sign out the device
            and it will need to log in again.
          </DialogDescription>
        </DialogHeader>
        
        <div className="my-4">
          <DeviceSessionCard 
            session={session} 
            onRevoke={() => Promise.resolve()} 
            onVerify={() => Promise.resolve()} 
            onBlock={() => Promise.resolve()}
            showActions={false}
          />
        </div>
        
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This action cannot be undone. The device will be immediately signed out.
          </AlertDescription>
        </Alert>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading ? (
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
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Device Manager main component
 */
export function DeviceManager({ profile }: DeviceManagerProps) {
  const { client } = useMatrixClient();
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokeSession, setRevokeSession] = useState<DeviceSession | null>(null);
  
  // Load device list
  const loadDevices = useCallback(async () => {
    if (!client) {
      setError("Matrix client not available");
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Get current device ID
      const currentDeviceId = client.getDeviceId();
      
      // Get all devices for the user
      const devices = await client.getDevices();
      
      // Convert to sessions
      const deviceSessions = devices.devices.map(device => 
        matrixDeviceToSession(device as unknown as MatrixDevice, currentDeviceId || undefined)
      );
      
      // Sort by last active (most recent first)
      deviceSessions.sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime());
      
      setSessions(deviceSessions);
    } catch (error) {
      console.error("Failed to load devices:", error);
      setError(error instanceof Error ? error.message : "Failed to load devices");
    } finally {
      setLoading(false);
    }
  }, [client]);
  
  // Load devices on mount
  useEffect(() => {
    loadDevices();
  }, [loadDevices]);
  
  // Handle device revocation
  const handleRevokeDevice = useCallback(async (deviceId: string) => {
    if (!client) return;
    
    try {
      await client.deleteDevice(deviceId);
      await loadDevices(); // Reload the list
      console.log("Device revoked successfully");
    } catch (error) {
      console.error("Failed to revoke device:", error);
      throw error;
    }
  }, [client, loadDevices]);
  
  // Handle device verification (placeholder)
  const handleVerifyDevice = useCallback(async (deviceId: string) => {
    // TODO: Implement device verification dialog
    console.log("Device verification not yet implemented:", deviceId);
  }, []);
  
  // Handle device blocking (placeholder)
  const handleBlockDevice = useCallback(async (deviceId: string) => {
    // TODO: Implement device blocking
    console.log("Device blocking not yet implemented:", deviceId);
  }, []);
  
  if (!client) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Matrix client not available. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
        <span>Loading device sessions...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadDevices} 
            className="ml-2"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  
  const currentSession = sessions.find(s => s.isCurrent);
  const otherSessions = sessions.filter(s => !s.isCurrent);
  const verifiedCount = sessions.filter(s => s.isVerified).length;
  const unverifiedCount = sessions.filter(s => !s.isVerified).length;
  
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-2 p-4">
            <Smartphone className="h-5 w-5 text-blue-500" />
            <div>
              <div className="font-medium">{sessions.length}</div>
              <div className="text-sm text-muted-foreground">Total Devices</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center gap-2 p-4">
            <ShieldCheck className="h-5 w-5 text-green-500" />
            <div>
              <div className="font-medium">{verifiedCount}</div>
              <div className="text-sm text-muted-foreground">Verified</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center gap-2 p-4">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            <div>
              <div className="font-medium">{unverifiedCount}</div>
              <div className="text-sm text-muted-foreground">Unverified</div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Current Session */}
      {currentSession && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Current Session</h3>
            <Button variant="outline" size="sm" onClick={loadDevices}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
          
          <DeviceSessionCard
            session={currentSession}
            onRevoke={handleRevokeDevice}
            onVerify={handleVerifyDevice}
            onBlock={handleBlockDevice}
            showActions={false}
          />
        </div>
      )}
      
      {/* Other Sessions */}
      {otherSessions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Other Sessions ({otherSessions.length})</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                // TODO: Implement revoke all other sessions
                console.log("Revoke all other sessions not yet implemented");
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Revoke All Others
            </Button>
          </div>
          
          <div className="space-y-2">
            {otherSessions.map(session => (
              <DeviceSessionCard
                key={session.deviceId}
                session={session}
                onRevoke={(deviceId) => {
                  const session = sessions.find(s => s.deviceId === deviceId);
                  if (session) {
                    setRevokeSession(session);
                  }
                  return Promise.resolve();
                }}
                onVerify={handleVerifyDevice}
                onBlock={handleBlockDevice}
              />
            ))}
          </div>
        </div>
      )}
      
      {sessions.length === 0 && (
        <div className="text-center py-8">
          <Smartphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">No devices found</h3>
          <p className="text-sm text-muted-foreground">
            Unable to load device information. This may be a temporary issue.
          </p>
        </div>
      )}
      
      {/* Revoke Confirmation Dialog */}
      <RevokeDeviceDialog
        session={revokeSession}
        open={!!revokeSession}
        onOpenChange={(open) => !open && setRevokeSession(null)}
        onConfirm={async () => {
          if (revokeSession) {
            await handleRevokeDevice(revokeSession.deviceId);
            setRevokeSession(null);
          }
        }}
      />
    </div>
  );
}

export default DeviceManager;