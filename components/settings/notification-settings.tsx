/**
 * Notification Settings Component
 *
 * Provides a comprehensive UI for managing Matrix notification settings.
 * Includes permission management, event type preferences, keywords, and
 * quiet hours configuration.
 */

"use client";

import { useState, useCallback } from "react";
import { 
  Bell, 
  BellOff, 
  Volume2, 
  VolumeX, 
  Clock, 
  TestTube,
  AlertCircle,
  CheckCircle,
  Settings as SettingsIcon,
  MessageCircle,
  AtSign,
  Users,
  UserPlus,
  MessageSquare,
  Hash
} from "lucide-react";

import { useNotifications } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

// =============================================================================
// Types
// =============================================================================

interface NotificationSettingsProps {
  className?: string;
}

// =============================================================================
// Components
// =============================================================================

/**
 * Permission status indicator
 */
function PermissionStatus() {
  const { isSupported, permission, isPermissionGranted, requestPermission } = useNotifications();

  if (!isSupported) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Desktop notifications are not supported by your browser.
        </AlertDescription>
      </Alert>
    );
  }

  if (isPermissionGranted) {
    return (
      <Alert className="border-green-200 bg-green-50 text-green-800">
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          Desktop notifications are enabled and ready to use.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-amber-200 bg-amber-50 text-amber-800">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>
          {permission === 'denied' 
            ? 'Desktop notifications are blocked. Please enable them in your browser settings.'
            : 'Desktop notifications require permission to work.'
          }
        </span>
        {permission !== 'denied' && (
          <Button
            variant="outline"
            size="sm"
            onClick={requestPermission}
            className="ml-4"
          >
            Grant Permission
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

/**
 * Main toggle for enabling/disabling notifications
 */
function MainToggle() {
  const { settings, updateSettings, isPermissionGranted } = useNotifications();

  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label className="text-base font-medium flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Desktop Notifications
        </Label>
        <p className="text-sm text-muted-foreground">
          Receive desktop notifications for Matrix events
        </p>
      </div>
      <Switch
        checked={settings.enabled}
        onCheckedChange={(checked) => updateSettings({ enabled: checked })}
        disabled={!isPermissionGranted}
      />
    </div>
  );
}

/**
 * Event type notification preferences
 */
function EventTypeSettings() {
  const { settings, updateSettings } = useNotifications();

  const eventTypes = [
    {
      key: 'directMessages',
      label: 'Direct Messages',
      description: 'Messages sent directly to you',
      icon: MessageCircle,
      enabled: settings.directMessages
    },
    {
      key: 'mentions', 
      label: 'Mentions & Replies',
      description: 'When someone mentions you with @username',
      icon: AtSign,
      enabled: settings.mentions
    },
    {
      key: 'threadReplies',
      label: 'Thread Replies', 
      description: 'Replies to threads you\'re participating in',
      icon: MessageSquare,
      enabled: settings.threadReplies
    },
    {
      key: 'roomInvites',
      label: 'Room Invitations',
      description: 'When someone invites you to a room',
      icon: UserPlus,
      enabled: settings.roomInvites
    },
    {
      key: 'allRoomMessages',
      label: 'All Room Messages',
      description: 'Every message in every room (not recommended)',
      icon: Users,
      enabled: settings.allRoomMessages
    }
  ];

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-medium">Notification Types</Label>
        <p className="text-sm text-muted-foreground">
          Choose which types of events should trigger notifications
        </p>
      </div>
      
      <div className="space-y-3">
        {eventTypes.map(({ key, label, description, icon: Icon, enabled }) => (
          <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-start gap-3">
              <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
              <div className="space-y-0.5">
                <div className="font-medium text-sm">{label}</div>
                <div className="text-xs text-muted-foreground">{description}</div>
              </div>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={(checked) => updateSettings({ [key]: checked })}
              disabled={!settings.enabled}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Keyword highlighting settings
 */
function KeywordSettings() {
  const { settings, updateSettings } = useNotifications();
  const [newKeyword, setNewKeyword] = useState('');

  const addKeyword = useCallback(() => {
    const keyword = newKeyword.trim();
    if (keyword && !settings.keywords.includes(keyword)) {
      updateSettings({ 
        keywords: [...settings.keywords, keyword] 
      });
      setNewKeyword('');
    }
  }, [newKeyword, settings.keywords, updateSettings]);

  const removeKeyword = useCallback((keyword: string) => {
    updateSettings({
      keywords: settings.keywords.filter(k => k !== keyword)
    });
  }, [settings.keywords, updateSettings]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword();
    }
  }, [addKeyword]);

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-medium flex items-center gap-2">
          <Hash className="h-4 w-4" />
          Keyword Highlights
        </Label>
        <p className="text-sm text-muted-foreground">
          Get notified when messages contain these keywords
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Add keyword..."
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={!settings.enabled}
        />
        <Button 
          onClick={addKeyword}
          disabled={!settings.enabled || !newKeyword.trim()}
        >
          Add
        </Button>
      </div>

      {settings.keywords.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {settings.keywords.map((keyword) => (
            <Badge 
              key={keyword} 
              variant="secondary"
              className="flex items-center gap-1"
            >
              {keyword}
              <button
                onClick={() => removeKeyword(keyword)}
                className="ml-1 hover:text-destructive"
                disabled={!settings.enabled}
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Sound and display settings
 */
function DisplaySettings() {
  const { settings, updateSettings } = useNotifications();

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-medium">Display & Sound</Label>
        <p className="text-sm text-muted-foreground">
          Customize how notifications appear and behave
        </p>
      </div>

      <div className="space-y-3">
        {/* Sound toggle */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            {settings.sound ? (
              <Volume2 className="h-5 w-5 text-muted-foreground" />
            ) : (
              <VolumeX className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <div className="font-medium text-sm">Sound</div>
              <div className="text-xs text-muted-foreground">Play sound with notifications</div>
            </div>
          </div>
          <Switch
            checked={settings.sound}
            onCheckedChange={(checked) => updateSettings({ sound: checked })}
            disabled={!settings.enabled}
          />
        </div>

        {/* Duration setting */}
        <div className="p-3 border rounded-lg">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Display Duration</Label>
            <p className="text-xs text-muted-foreground">
              How long notifications stay visible (0 = until dismissed)
            </p>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                max="30000"
                step="1000"
                value={settings.duration / 1000}
                onChange={(e) => updateSettings({ 
                  duration: Math.max(0, parseInt(e.target.value) || 0) * 1000 
                })}
                disabled={!settings.enabled}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">seconds</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Quiet hours configuration
 */
function QuietHoursSettings() {
  const { settings, updateSettings } = useNotifications();
  const quietHours = settings.quietHours;

  const updateQuietHours = useCallback((updates: Partial<NonNullable<typeof quietHours>>) => {
    const currentQuietHours = quietHours || { enabled: false, start: '22:00', end: '08:00' };
    updateSettings({
      quietHours: { ...currentQuietHours, ...updates }
    });
  }, [quietHours, updateSettings]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Quiet Hours
          </Label>
          <p className="text-sm text-muted-foreground">
            Disable notifications during specific hours
          </p>
        </div>
        <Switch
          checked={quietHours?.enabled || false}
          onCheckedChange={(checked) => updateQuietHours({ enabled: checked })}
          disabled={!settings.enabled}
        />
      </div>

      {quietHours?.enabled && (
        <div className="pl-6 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">Start Time</Label>
              <Input
                type="time"
                value={quietHours.start || '22:00'}
                onChange={(e) => updateQuietHours({ start: e.target.value })}
                disabled={!settings.enabled}
              />
            </div>
            <div>
              <Label className="text-sm">End Time</Label>
              <Input
                type="time"
                value={quietHours.end || '08:00'}
                onChange={(e) => updateQuietHours({ end: e.target.value })}
                disabled={!settings.enabled}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Times span across midnight (e.g., 22:00 to 08:00 = quiet from 10 PM to 8 AM)
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Test notifications section
 */
function TestSection() {
  const { testNotification, isPermissionGranted, isReady } = useNotifications();
  const [testing, setTesting] = useState(false);

  const handleTest = useCallback(async () => {
    if (!isPermissionGranted || !isReady) return;

    setTesting(true);
    try {
      const success = await testNotification();
      if (!success) {
        console.warn('Test notification failed');
      }
    } catch (error) {
      console.error('Test notification error:', error);
    } finally {
      setTesting(false);
    }
  }, [testNotification, isPermissionGranted, isReady]);

  return (
    <div className="space-y-4">
      <Separator />
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-medium flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Test Notifications
          </Label>
          <p className="text-sm text-muted-foreground">
            Send a test notification to verify your settings
          </p>
        </div>
        <Button
          onClick={handleTest}
          disabled={!isPermissionGranted || !isReady || testing}
          variant="outline"
        >
          {testing ? 'Sending...' : 'Send Test'}
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Complete notification settings panel component
 */
export function NotificationSettings({ className }: NotificationSettingsProps) {
  const { isSupported, error } = useNotifications();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SettingsIcon className="h-5 w-5" />
          Notification Settings
        </CardTitle>
        <CardDescription>
          Manage how and when you receive notifications for Matrix events
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Permission Status */}
        <PermissionStatus />
        
        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error.message}
            </AlertDescription>
          </Alert>
        )}
        
        {isSupported && (
          <>
            {/* Main Toggle */}
            <MainToggle />
            
            <Separator />
            
            {/* Event Type Settings */}
            <EventTypeSettings />
            
            <Separator />
            
            {/* Keyword Settings */}
            <KeywordSettings />
            
            <Separator />
            
            {/* Display Settings */}
            <DisplaySettings />
            
            <Separator />
            
            {/* Quiet Hours */}
            <QuietHoursSettings />
            
            {/* Test Section */}
            <TestSection />
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default NotificationSettings;