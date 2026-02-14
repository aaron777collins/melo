/**
 * User Settings Modal
 *
 * Provides a comprehensive settings interface including security,
 * notifications, profile, and other user preferences.
 */

"use client";

import { useState } from "react";
import {
  User,
  Shield,
  Bell,
  Palette,
  Keyboard,
  Mic,
  Video,
  Globe,
  Info,
  X
} from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

import { useModal } from "@/hooks/use-modal-store";
import { SecuritySettings } from "@/components/settings/security-settings";
import { NotificationSettings } from "@/components/settings/notification-settings";

// =============================================================================
// Types
// =============================================================================

type SettingsTab = 
  | "account"
  | "security"
  | "notifications" 
  | "appearance"
  | "voice"
  | "advanced"
  | "about";

interface SettingsSidebarItem {
  id: SettingsTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType;
}

// =============================================================================
// Tab Components (Placeholders for future implementation)
// =============================================================================

function AccountSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Account Settings</h3>
        <p className="text-sm text-muted-foreground">
          Manage your account information and preferences.
        </p>
      </div>
      <div className="text-center text-muted-foreground py-8">
        <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Account settings will be implemented soon.</p>
      </div>
    </div>
  );
}

function AppearanceSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Appearance</h3>
        <p className="text-sm text-muted-foreground">
          Customize the look and feel of your interface.
        </p>
      </div>
      <div className="text-center text-muted-foreground py-8">
        <Palette className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Appearance settings will be implemented soon.</p>
      </div>
    </div>
  );
}

function VoiceSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Voice & Video</h3>
        <p className="text-sm text-muted-foreground">
          Configure your voice and video calling preferences.
        </p>
      </div>
      <div className="text-center text-muted-foreground py-8">
        <Mic className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Voice & video settings will be implemented soon.</p>
      </div>
    </div>
  );
}

function AdvancedSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Advanced</h3>
        <p className="text-sm text-muted-foreground">
          Advanced settings for power users.
        </p>
      </div>
      <div className="text-center text-muted-foreground py-8">
        <Keyboard className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Advanced settings will be implemented soon.</p>
      </div>
    </div>
  );
}

function AboutSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">About</h3>
        <p className="text-sm text-muted-foreground">
          Information about this application and its components.
        </p>
      </div>
      <div className="text-center text-muted-foreground py-8">
        <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>About information will be implemented soon.</p>
      </div>
    </div>
  );
}

// =============================================================================
// Settings Configuration
// =============================================================================

const settingsItems: SettingsSidebarItem[] = [
  {
    id: "account",
    label: "My Account",
    icon: User,
    component: AccountSettings
  },
  {
    id: "security",
    label: "Security & Privacy",
    icon: Shield,
    component: SecuritySettings
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    component: NotificationSettings
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: Palette,
    component: AppearanceSettings
  },
  {
    id: "voice",
    label: "Voice & Video",
    icon: Video,
    component: VoiceSettings
  },
  {
    id: "advanced",
    label: "Advanced",
    icon: Keyboard,
    component: AdvancedSettings
  },
  {
    id: "about",
    label: "About",
    icon: Info,
    component: AboutSettings
  }
];

// =============================================================================
// Components
// =============================================================================

/**
 * Settings sidebar navigation
 */
function SettingsSidebar({ activeTab, onTabChange }: {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
}) {
  return (
    <div className="w-64 flex-shrink-0 border-r bg-muted/20">
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">User Settings</h2>
        
        <nav className="space-y-1">
          {settingsItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors text-left
                  ${isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

/**
 * Settings content area
 */
function SettingsContent({ activeTab }: { activeTab: SettingsTab }) {
  const activeItem = settingsItems.find(item => item.id === activeTab);
  
  if (!activeItem) {
    return (
      <div className="flex-1 p-6">
        <div className="text-center text-muted-foreground">
          <p>Settings page not found.</p>
        </div>
      </div>
    );
  }

  const Component = activeItem.component;

  return (
    <div className="flex-1 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="p-6">
          <Component />
        </div>
      </ScrollArea>
    </div>
  );
}

// =============================================================================
// Main Modal Component
// =============================================================================

export function UserSettingsModal() {
  const { isOpen, onClose, type } = useModal();
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");

  const isModalOpen = isOpen && type === "userSettings";

  // Reset to default tab when modal opens
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    } else {
      setActiveTab("account");
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              User Settings
            </DialogTitle>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1">
          <SettingsSidebar 
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
          <SettingsContent activeTab={activeTab} />
        </div>
      </DialogContent>
    </Dialog>
  );
}