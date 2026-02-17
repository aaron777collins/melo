/**
 * Accessibility Settings Component
 * 
 * Provides user controls for accessibility preferences
 */

"use client";

import React, { useState } from "react";
import { 
  Eye, 
  EyeOff, 
  Volume2, 
  VolumeX, 
  Zap, 
  ZapOff, 
  Sun, 
  Moon,
  Accessibility,
  Settings,
  Info
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAccessibility, useReducedMotion, useHighContrast } from "@/src/hooks/use-accessibility";
import { announceToScreenReader } from "@/src/lib/accessibility";

interface SettingItemProps {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: React.ReactNode;
  disabled?: boolean;
}

function SettingItem({ id, title, description, checked, onChange, icon, disabled = false }: SettingItemProps) {
  const handleChange = (newChecked: boolean) => {
    onChange(newChecked);
    announceToScreenReader(
      `${title} ${newChecked ? 'enabled' : 'disabled'}`,
      'polite'
    );
  };

  return (
    <div className="flex items-start space-x-3 py-3">
      {icon && (
        <div className="flex-shrink-0 mt-1">
          {icon}
        </div>
      )}
      <div className="flex-grow space-y-1">
        <Label 
          htmlFor={id} 
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {title}
        </Label>
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="flex-shrink-0">
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={handleChange}
          disabled={disabled}
          aria-describedby={`${id}-description`}
        />
        <div id={`${id}-description`} className="sr-only">
          {description}
        </div>
      </div>
    </div>
  );
}

interface AccessibilitySettingsProps {
  className?: string;
}

export function AccessibilitySettings({ className = "" }: AccessibilitySettingsProps) {
  const {
    settings,
    systemPreferences,
    effectivePreferences,
    updateSetting,
    announce
  } = useAccessibility();

  const systemReducedMotion = useReducedMotion();
  const systemHighContrast = useHighContrast();

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleShowAdvanced = () => {
    const newState = !showAdvanced;
    setShowAdvanced(newState);
    announce(
      `Advanced settings ${newState ? 'expanded' : 'collapsed'}`,
      'polite'
    );
  };

  return (
    <div className={`space-y-6 ${className}`} role="region" aria-label="Accessibility settings">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Accessibility className="h-5 w-5" aria-hidden="true" />
            Accessibility
          </CardTitle>
          <CardDescription>
            Customize Melo to work better with screen readers, keyboard navigation, and other accessibility tools.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* System Preferences Info */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div className="text-sm">
                <p className="font-medium text-blue-800 dark:text-blue-200">System Preferences Detected</p>
                <ul className="mt-1 space-y-1 text-blue-700 dark:text-blue-300">
                  <li>
                    Reduced Motion: {systemReducedMotion ? 'On' : 'Off'}
                  </li>
                  <li>
                    High Contrast: {systemHighContrast ? 'On' : 'Off'}
                  </li>
                  <li>
                    Dark Mode: {systemPreferences.darkMode ? 'On' : 'Off'}
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          {/* Core Settings */}
          <div className="space-y-1">
            <h3 className="text-lg font-medium">Core Settings</h3>
            
            <SettingItem
              id="enhanced-focus"
              title="Enhanced Focus Indicators"
              description="Show stronger visual focus indicators for keyboard navigation"
              checked={settings.enhancedFocus}
              onChange={(checked) => updateSetting('enhancedFocus', checked)}
              icon={<Eye className="h-4 w-4" aria-hidden="true" />}
            />

            <SettingItem
              id="screen-reader-optimizations"
              title="Screen Reader Optimizations"
              description="Enable additional ARIA labels and descriptions for screen readers"
              checked={settings.screenReaderOptimizations}
              onChange={(checked) => updateSetting('screenReaderOptimizations', checked)}
              icon={<Volume2 className="h-4 w-4" aria-hidden="true" />}
            />

            <SettingItem
              id="reduced-motion"
              title="Reduce Motion"
              description="Minimize animations and transitions (overrides system preference)"
              checked={settings.reducedMotion}
              onChange={(checked) => updateSetting('reducedMotion', checked)}
              icon={settings.reducedMotion ? <ZapOff className="h-4 w-4" aria-hidden="true" /> : <Zap className="h-4 w-4" aria-hidden="true" />}
            />

            <SettingItem
              id="high-contrast"
              title="High Contrast Mode"
              description="Use higher contrast colors for better visibility"
              checked={settings.highContrast}
              onChange={(checked) => updateSetting('highContrast', checked)}
              icon={settings.highContrast ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
            />
          </div>

          <Separator />

          {/* Announcements */}
          <div className="space-y-1">
            <h3 className="text-lg font-medium">Screen Reader Announcements</h3>
            
            <SettingItem
              id="announce-navigation"
              title="Navigation Announcements"
              description="Announce when switching between channels and servers"
              checked={settings.announceNavigation}
              onChange={(checked) => updateSetting('announceNavigation', checked)}
              icon={<Volume2 className="h-4 w-4" aria-hidden="true" />}
            />

            <SettingItem
              id="announce-messages"
              title="Message Announcements"
              description="Announce new chat messages (can be overwhelming in active channels)"
              checked={settings.announceMessages}
              onChange={(checked) => updateSetting('announceMessages', checked)}
              icon={settings.announceMessages ? <Volume2 className="h-4 w-4" aria-hidden="true" /> : <VolumeX className="h-4 w-4" aria-hidden="true" />}
            />
          </div>

          {/* Advanced Settings Toggle */}
          <div className="pt-4">
            <Button
              variant="ghost"
              onClick={handleShowAdvanced}
              className="w-full justify-between"
              aria-expanded={showAdvanced}
              aria-controls="advanced-settings"
            >
              <span className="flex items-center gap-2">
                <Settings className="h-4 w-4" aria-hidden="true" />
                Advanced Settings
              </span>
              <span className="text-xs text-muted-foreground">
                {showAdvanced ? 'Hide' : 'Show'}
              </span>
            </Button>
          </div>

          {/* Advanced Settings */}
          {showAdvanced && (
            <div id="advanced-settings" className="space-y-4 pt-4 border-t">
              <div className="space-y-1">
                <h3 className="text-lg font-medium">Advanced Options</h3>
                <p className="text-sm text-muted-foreground">
                  These settings provide additional customization for power users and specific accessibility needs.
                </p>

                {/* Effective Preferences Display */}
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Current Effective Settings</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>Reduced Motion: {effectivePreferences.reducedMotion ? 'On' : 'Off'}</div>
                    <div>High Contrast: {effectivePreferences.highContrast ? 'On' : 'Off'}</div>
                    <div>Enhanced Focus: {effectivePreferences.enhancedFocus ? 'On' : 'Off'}</div>
                    <div>Screen Reader: {effectivePreferences.screenReaderOptimizations ? 'On' : 'Off'}</div>
                  </div>
                </div>

                {/* Reset Button */}
                <div className="pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Reset to default settings
                      updateSetting('reducedMotion', false);
                      updateSetting('highContrast', false);
                      updateSetting('screenReaderOptimizations', false);
                      updateSetting('enhancedFocus', true);
                      updateSetting('announceNavigation', true);
                      updateSetting('announceMessages', false);
                      
                      announce('Accessibility settings reset to defaults', 'polite');
                    }}
                    className="w-full"
                  >
                    Reset to Defaults
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Keyboard Shortcuts Card */}
      <Card>
        <CardHeader>
          <CardTitle>Keyboard Shortcuts</CardTitle>
          <CardDescription>
            Essential keyboard shortcuts for navigating Melo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Tab</kbd>
                <span className="ml-2">Navigate forward</span>
              </div>
              <div>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Shift+Tab</kbd>
                <span className="ml-2">Navigate backward</span>
              </div>
              <div>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Enter</kbd>
                <span className="ml-2">Activate/Open</span>
              </div>
              <div>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Escape</kbd>
                <span className="ml-2">Close/Cancel</span>
              </div>
              <div>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Space</kbd>
                <span className="ml-2">Select/Toggle</span>
              </div>
              <div>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">Arrow Keys</kbd>
                <span className="ml-2">Navigate lists</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}