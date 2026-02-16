"use client";

/**
 * New User Onboarding Modal
 * 
 * Comprehensive tutorial system that launches after user registration
 * to introduce new users to HAOS features and functionality.
 */

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  MessageSquare, 
  Users, 
  Settings, 
  Hash, 
  Plus,
  Check,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useMatrixAuth } from "@/components/providers/matrix-auth-provider";

// =============================================================================
// Types
// =============================================================================

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  isAdvanced?: boolean;
  actionLabel?: string;
  actionUrl?: string;
}

// =============================================================================
// Step Content Components
// =============================================================================

function WelcomeStep() {
  const { user } = useMatrixAuth();
  
  return (
    <div className="text-center space-y-4">
      <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
        <Sparkles className="w-8 h-8 text-white" />
      </div>
      <div>
        <h3 className="text-xl font-semibold mb-2">
          Welcome to HAOS, {user?.displayName || "friend"}! 🎉
        </h3>
        <p className="text-muted-foreground">
          HAOS is your decentralized chat platform powered by Matrix. 
          Let's take a quick tour of the essential features to get you started.
        </p>
      </div>
      <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          💡 <strong>Pro tip:</strong> You can skip this tutorial anytime, but we recommend going through it to make the most of HAOS!
        </p>
      </div>
    </div>
  );
}

function ChatBasicsStep() {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <MessageSquare className="w-5 h-5 text-blue-500" />
        <h3 className="text-lg font-semibold">Chat Basics</h3>
      </div>
      <div className="space-y-3">
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="font-medium mb-1">Direct Messages</h4>
          <p className="text-sm text-muted-foreground">
            Chat privately with other users. Click on any user and select "Message" to start.
          </p>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="font-medium mb-1">Rooms & Channels</h4>
          <p className="text-sm text-muted-foreground">
            Join rooms to chat with groups. Rooms are organized into servers (spaces) for better organization.
          </p>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="font-medium mb-1">Matrix-Powered</h4>
          <p className="text-sm text-muted-foreground">
            Unlike Discord, HAOS is decentralized - your data stays under your control.
          </p>
        </div>
      </div>
    </div>
  );
}

function ServersStep() {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Users className="w-5 h-5 text-green-500" />
        <h3 className="text-lg font-semibold">Servers & Rooms</h3>
      </div>
      <div className="space-y-3">
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="font-medium mb-1">Creating Your First Server</h4>
          <p className="text-sm text-muted-foreground">
            Servers help organize conversations by topic. You can create servers for work, hobbies, or communities.
          </p>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="font-medium mb-1">Joining Existing Servers</h4>
          <p className="text-sm text-muted-foreground">
            Get invited to servers or join public ones. Each server can have multiple channels for different topics.
          </p>
        </div>
        <div className="flex items-center space-x-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded border border-blue-200 dark:border-blue-800">
          <Hash className="w-4 h-4 text-blue-500" />
          <span className="text-sm text-blue-800 dark:text-blue-200">
            Channels are marked with # and organize discussions within servers
          </span>
        </div>
      </div>
    </div>
  );
}

function SettingsStep() {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Settings className="w-5 h-5 text-purple-500" />
        <h3 className="text-lg font-semibold">Customizing HAOS</h3>
      </div>
      <div className="space-y-3">
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="font-medium mb-1">Profile Settings</h4>
          <p className="text-sm text-muted-foreground">
            Customize your display name, avatar, and status. Click your profile in the bottom left to access settings.
          </p>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="font-medium mb-1">Appearance</h4>
          <p className="text-sm text-muted-foreground">
            Switch between light and dark themes, adjust text size, and customize the interface to your liking.
          </p>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="font-medium mb-1">Notifications</h4>
          <p className="text-sm text-muted-foreground">
            Control when and how you get notified about messages, mentions, and activity.
          </p>
        </div>
      </div>
    </div>
  );
}

function PrivacySecurityStep() {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <div className="w-5 h-5 bg-gradient-to-r from-red-500 to-orange-500 rounded flex items-center justify-center">
          <span className="text-white text-xs">🔒</span>
        </div>
        <h3 className="text-lg font-semibold">Privacy & Security</h3>
        <Badge variant="secondary" className="text-xs">Advanced</Badge>
      </div>
      <div className="space-y-3">
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="font-medium mb-1">End-to-End Encryption</h4>
          <p className="text-sm text-muted-foreground">
            Many rooms support encryption. Your messages are secured and only readable by intended recipients.
          </p>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="font-medium mb-1">Device Verification</h4>
          <p className="text-sm text-muted-foreground">
            Verify your devices to ensure secure communication. You can manage this in security settings.
          </p>
        </div>
        <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Tip:</strong> We'll help you set up encryption later - for now, focus on getting familiar with basic features.
          </p>
        </div>
      </div>
    </div>
  );
}

function FeaturesOverviewStep() {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Plus className="w-5 h-5 text-indigo-500" />
        <h3 className="text-lg font-semibold">Additional Features</h3>
        <Badge variant="secondary" className="text-xs">Advanced</Badge>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="font-medium mb-1 text-sm">File Sharing</h4>
          <p className="text-xs text-muted-foreground">Share images, documents, and files in any conversation.</p>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="font-medium mb-1 text-sm">Voice Messages</h4>
          <p className="text-xs text-muted-foreground">Send voice notes when typing isn't convenient.</p>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="font-medium mb-1 text-sm">Reactions</h4>
          <p className="text-xs text-muted-foreground">React to messages with emojis to express yourself.</p>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="font-medium mb-1 text-sm">Threads</h4>
          <p className="text-xs text-muted-foreground">Keep conversations organized with threaded replies.</p>
        </div>
      </div>
      <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
        <p className="text-sm text-green-800 dark:text-green-200">
          🚀 <strong>Ready to explore!</strong> You'll discover these features naturally as you use HAOS.
        </p>
      </div>
    </div>
  );
}

function CompletionStep() {
  return (
    <div className="text-center space-y-4">
      <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
        <Check className="w-8 h-8 text-white" />
      </div>
      <div>
        <h3 className="text-xl font-semibold mb-2">You're All Set! 🎊</h3>
        <p className="text-muted-foreground">
          Great job completing the onboarding! You now know the basics of HAOS.
        </p>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">What's next?</p>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>• Create your first server or join existing ones</p>
          <p>• Customize your profile and settings</p>
          <p>• Start chatting and exploring features</p>
        </div>
      </div>
      <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          💭 Need help? You can always access tutorials and help from the settings menu.
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function OnboardingModal({ isOpen, onClose, onComplete }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const router = useRouter();

  // Define onboarding steps
  const steps: OnboardingStep[] = [
    {
      id: "welcome",
      title: "Welcome to HAOS",
      description: "Let's get you started with a quick tour",
      icon: <Sparkles className="w-5 h-5" />,
      content: <WelcomeStep />,
    },
    {
      id: "chat-basics",
      title: "Chat Basics",
      description: "Understanding messages and conversations",
      icon: <MessageSquare className="w-5 h-5" />,
      content: <ChatBasicsStep />,
    },
    {
      id: "servers",
      title: "Servers & Rooms",
      description: "Organizing conversations with servers and channels",
      icon: <Users className="w-5 h-5" />,
      content: <ServersStep />,
      actionLabel: "Create First Server",
      actionUrl: "/servers/create",
    },
    {
      id: "settings",
      title: "Settings & Customization",
      description: "Making HAOS your own",
      icon: <Settings className="w-5 h-5" />,
      content: <SettingsStep />,
      actionLabel: "Open Settings",
      actionUrl: "/settings",
    },
  ];

  // Advanced steps (shown only if user opts in)
  const advancedSteps: OnboardingStep[] = [
    {
      id: "privacy-security",
      title: "Privacy & Security",
      description: "Understanding encryption and security features",
      icon: <div className="w-5 h-5 bg-gradient-to-r from-red-500 to-orange-500 rounded flex items-center justify-center"><span className="text-white text-xs">🔒</span></div>,
      content: <PrivacySecurityStep />,
      isAdvanced: true,
      actionLabel: "Security Settings",
      actionUrl: "/settings/security",
    },
    {
      id: "features",
      title: "Additional Features",
      description: "Exploring advanced HAOS capabilities",
      icon: <Plus className="w-5 h-5" />,
      content: <FeaturesOverviewStep />,
      isAdvanced: true,
    },
  ];

  // Combine steps based on user preference
  const allSteps = showAdvanced ? [...steps, ...advancedSteps] : steps;
  
  // Add completion step
  const finalSteps = [...allSteps, {
    id: "completion",
    title: "Ready to Go!",
    description: "You've completed the onboarding tour",
    icon: <Check className="w-5 h-5" />,
    content: <CompletionStep />,
  }];

  const progress = ((currentStep + 1) / finalSteps.length) * 100;

  const handleNext = () => {
    if (currentStep < finalSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onClose();
    // Navigate to channels/@me as default after skipping onboarding
    router.push("/channels/@me");
  };

  const handleComplete = () => {
    onComplete();
    onClose();
    // Navigate to create server flow after completion
    router.push("/channels/@me");
  };

  const handleAction = (actionUrl?: string) => {
    if (actionUrl) {
      onClose();
      router.push(actionUrl);
    } else {
      handleNext();
    }
  };

  const currentStepData = finalSteps[currentStep];
  const isLastStep = currentStep === finalSteps.length - 1;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-2">
              {currentStepData.icon}
              <span>{currentStepData.title}</span>
              {'isAdvanced' in currentStepData && currentStepData.isAdvanced && (
                <Badge variant="secondary" className="text-xs">Advanced</Badge>
              )}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <DialogDescription>{currentStepData.description}</DialogDescription>
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Step {currentStep + 1} of {finalSteps.length}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
          </div>
        </DialogHeader>

        <div className="py-6">
          {currentStepData.content}
          
          {/* Advanced features toggle (only on step 2) */}
          {currentStep === 2 && !showAdvanced && (
            <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-200 dark:border-indigo-800">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-indigo-900 dark:text-indigo-100">
                    Want to learn about advanced features?
                  </h4>
                  <p className="text-sm text-indigo-700 dark:text-indigo-300">
                    Include privacy, security, and advanced features in your tour
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvanced(true)}
                  className="border-indigo-300 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-900"
                >
                  Include Advanced
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              Skip Tutorial
            </Button>
            {currentStep > 0 && (
              <Button variant="outline" onClick={handlePrevious}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
            )}
          </div>
          
          <div className="flex space-x-2">
            {'actionLabel' in currentStepData && currentStepData.actionLabel ? (
              <Button onClick={() => handleAction('actionUrl' in currentStepData ? currentStepData.actionUrl : undefined)}>
                {currentStepData.actionLabel}
              </Button>
            ) : (
              <Button onClick={handleNext}>
                {isLastStep ? "Get Started" : "Next"}
                {!isLastStep && <ChevronRight className="w-4 h-4 ml-1" />}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}