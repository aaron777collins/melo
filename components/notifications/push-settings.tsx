/**
 * Push Notification Settings Component
 * 
 * Provides UI for managing Web Push notification subscriptions
 * with cross-browser compatibility and error handling.
 */

"use client";

import React from "react";
import { useWebPush } from "../../hooks/use-web-push";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Bell, 
  BellOff, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info,
  Smartphone,
  Monitor,
  Wifi,
  WifiOff
} from "lucide-react";

interface PushSettingsProps {
  className?: string;
}

export function PushSettings({ className }: PushSettingsProps) {
  const {
    subscription,
    isSubscribed,
    isLoading,
    capabilities,
    permissions,
    error,
    lastError,
    subscribe,
    unsubscribe,
    requestPermission,
    testNotification,
    clearError,
    checkBrowserCompatibility
  } = useWebPush();

  const [isTestingNotification, setIsTestingNotification] = React.useState(false);

  // Handle test notification
  const handleTestNotification = async () => {
    setIsTestingNotification(true);
    try {
      const success = await testNotification();
      if (!success && !error) {
        // If no specific error was set, show a generic message
        console.warn('Test notification failed silently');
      }
    } finally {
      setIsTestingNotification(false);
    }
  };

  // Get browser compatibility info
  const browserInfo = React.useMemo(() => {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    
    let browser = 'Unknown';
    let supportLevel: 'excellent' | 'good' | 'limited' | 'none' = 'none';
    let limitations: string[] = [];

    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      browser = 'Chrome';
      supportLevel = 'excellent';
    } else if (userAgent.includes('Firefox')) {
      browser = 'Firefox';
      supportLevel = 'good';
      limitations.push('Limited image support');
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      browser = 'Safari';
      if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
        supportLevel = 'limited';
        limitations.push('PWA mode required', 'No action buttons');
      } else {
        supportLevel = 'good';
        limitations.push('No action buttons', 'No vibration');
      }
    } else if (userAgent.includes('Edg')) {
      browser = 'Edge';
      supportLevel = 'excellent';
    }

    return { browser, supportLevel, limitations };
  }, []);

  // Render capability status
  const renderCapabilityStatus = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Service Worker</span>
        {capabilities.isServiceWorkerSupported ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <XCircle className="h-4 w-4 text-red-600" />
        )}
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Push Manager</span>
        {capabilities.isPushManagerSupported ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <XCircle className="h-4 w-4 text-red-600" />
        )}
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Notifications</span>
        {capabilities.isNotificationSupported ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <XCircle className="h-4 w-4 text-red-600" />
        )}
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Permission</span>
        <Badge 
          variant={permissions.notification === 'granted' ? 'default' : 
                  permissions.notification === 'denied' ? 'destructive' : 'secondary'}
        >
          {permissions.notification}
        </Badge>
      </div>
    </div>
  );

  // Render browser compatibility info
  const renderBrowserInfo = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Browser</span>
        <div className="flex items-center gap-2">
          {browserInfo.browser === 'Unknown' ? (
            <Monitor className="h-4 w-4 text-gray-500" />
          ) : (
            <Smartphone className="h-4 w-4 text-blue-600" />
          )}
          <span className="text-sm">{browserInfo.browser}</span>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Support Level</span>
        <Badge 
          variant={
            browserInfo.supportLevel === 'excellent' ? 'default' :
            browserInfo.supportLevel === 'good' ? 'secondary' :
            browserInfo.supportLevel === 'limited' ? 'outline' : 'destructive'
          }
        >
          {browserInfo.supportLevel}
        </Badge>
      </div>
      
      {browserInfo.limitations.length > 0 && (
        <div>
          <span className="text-sm font-medium">Limitations</span>
          <ul className="mt-1 text-xs text-muted-foreground">
            {browserInfo.limitations.map((limitation, index) => (
              <li key={index}>• {limitation}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  // If push notifications are not supported, show a message
  if (!capabilities.isSupported) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Manage your push notification preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Not Supported</AlertTitle>
            <AlertDescription>
              Push notifications are not supported in your current browser. 
              You can still receive in-app notifications when the application is open.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Browser Compatibility</h4>
            {renderBrowserInfo()}
            
            <Separator />
            
            <h4 className="text-sm font-semibold">System Capabilities</h4>
            {renderCapabilityStatus()}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isSubscribed ? (
            <Bell className="h-5 w-5 text-green-600" />
          ) : (
            <BellOff className="h-5 w-5 text-gray-500" />
          )}
          Push Notifications
          {isSubscribed && (
            <Badge variant="default" className="ml-auto">
              <Wifi className="h-3 w-3 mr-1" />
              Active
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Receive push notifications even when Melo is closed
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>{error.message}</span>
              <Button variant="outline" size="sm" onClick={clearError}>
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Permission Notice */}
        {permissions.notification === 'denied' && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Permission Denied</AlertTitle>
            <AlertDescription>
              Notification permission has been denied. Please enable notifications 
              in your browser settings to receive push notifications.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Safari iOS Notice */}
        {browserInfo.browser === 'Safari' && browserInfo.supportLevel === 'limited' && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Safari iOS</AlertTitle>
            <AlertDescription>
              For full push notification support on iOS, please add Melo to your 
              home screen as a web app.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Main Controls */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold">Enable Push Notifications</h4>
              <p className="text-xs text-muted-foreground">
                {isSubscribed 
                  ? "You'll receive notifications for mentions, DMs, and room invites"
                  : "Subscribe to receive notifications when the app is closed"
                }
              </p>
            </div>
            <Switch
              checked={isSubscribed}
              onCheckedChange={async (checked) => {
                if (checked) {
                  await subscribe();
                } else {
                  await unsubscribe();
                }
              }}
              disabled={isLoading || permissions.notification === 'denied'}
              data-testid="push-subscription-toggle"
            />
          </div>
          
          {/* Subscription Status */}
          <div className="flex items-center justify-between text-sm">
            <span>Status:</span>
            <div 
              className="flex items-center gap-2" 
              data-testid="push-subscription-status"
            >
              {isLoading ? (
                <>
                  <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse" />
                  <span>Loading...</span>
                </>
              ) : isSubscribed ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">Subscribed</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-500">Not subscribed</span>
                </>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            {!isSubscribed && permissions.canRequestPermission && (
              <Button
                variant="outline"
                size="sm"
                onClick={requestPermission}
                disabled={isLoading}
                data-testid="push-request-permission-button"
              >
                Grant Permission
              </Button>
            )}
            
            {!isSubscribed && permissions.notification === 'granted' && (
              <Button
                size="sm"
                onClick={subscribe}
                disabled={isLoading}
                data-testid="push-subscribe-button"
              >
                {isLoading ? 'Subscribing...' : 'Subscribe'}
              </Button>
            )}
            
            {isSubscribed && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestNotification}
                  disabled={isTestingNotification}
                  data-testid="push-test-button"
                >
                  {isTestingNotification ? 'Sending...' : 'Test Notification'}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={unsubscribe}
                  disabled={isLoading}
                  data-testid="push-unsubscribe-button"
                >
                  {isLoading ? 'Unsubscribing...' : 'Unsubscribe'}
                </Button>
              </>
            )}
          </div>
        </div>
        
        {/* Subscription Details */}
        {isSubscribed && subscription && (
          <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-semibold">Subscription Details</h4>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div>Device ID: {subscription.deviceId.slice(0, 16)}...</div>
              <div>Created: {new Date(subscription.createdAt).toLocaleDateString()}</div>
              <div>Endpoint: {subscription.endpoint.split('/').pop()?.slice(0, 16)}...</div>
            </div>
          </div>
        )}
        
        {/* Debug Information */}
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Show Technical Details
          </summary>
          <div className="mt-2 space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Browser Compatibility</h4>
              {renderBrowserInfo()}
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-semibold mb-2">System Capabilities</h4>
              {renderCapabilityStatus()}
            </div>
            
            {lastError && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2 text-red-600">Last Error</h4>
                  <div className="space-y-1">
                    <div>Code: {lastError.code}</div>
                    <div>Message: {lastError.message}</div>
                    {lastError.details && (
                      <div>Details: {JSON.stringify(lastError.details, null, 2)}</div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}