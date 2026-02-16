import React from "react";
import { BookOpen, RefreshCw, CheckCircle, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RestartOnboardingButton } from "@/components/onboarding/restart-onboarding-button";

/**
 * Tutorial Settings Page
 * 
 * Allows users to restart onboarding tutorial and access help resources.
 */
export default function TutorialPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Tutorial & Help</h3>
        <p className="text-sm text-muted-foreground">
          Access onboarding tutorial and help resources
        </p>
      </div>

      <div className="grid gap-4">
        {/* Onboarding Tutorial Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-blue-500" />
              <span>New User Onboarding</span>
            </CardTitle>
            <CardDescription>
              Learn the basics of HAOS with our guided tutorial
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">What you'll learn:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Chat basics and direct messages</li>
                <li>• Creating and joining servers</li>
                <li>• Customizing your profile and settings</li>
                <li>• Privacy and security features (advanced)</li>
                <li>• Additional HAOS features and tips</li>
              </ul>
            </div>
            
            <div className="flex items-center space-x-2">
              <RestartOnboardingButton />
              <Badge variant="outline" className="text-xs">
                ~5 minutes
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Quick Start Guide */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Play className="w-5 h-5 text-green-500" />
              <span>Quick Start Actions</span>
            </CardTitle>
            <CardDescription>
              Jump straight to common tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button variant="outline" className="justify-start h-auto p-3" asChild>
              <a href="/channels/@me">
                <div className="text-left">
                  <div className="font-medium text-sm">Start Chatting</div>
                  <div className="text-xs text-muted-foreground">Go to direct messages</div>
                </div>
              </a>
            </Button>
            
            <Button variant="outline" className="justify-start h-auto p-3" asChild>
              <a href="/setup">
                <div className="text-left">
                  <div className="font-medium text-sm">Create Server</div>
                  <div className="text-xs text-muted-foreground">Start your own community</div>
                </div>
              </a>
            </Button>
            
            <Button variant="outline" className="justify-start h-auto p-3" asChild>
              <a href="/settings/profile">
                <div className="text-left">
                  <div className="font-medium text-sm">Edit Profile</div>
                  <div className="text-xs text-muted-foreground">Customize your account</div>
                </div>
              </a>
            </Button>
            
            <Button variant="outline" className="justify-start h-auto p-3" asChild>
              <a href="/settings/notifications">
                <div className="text-left">
                  <div className="font-medium text-sm">Notifications</div>
                  <div className="text-xs text-muted-foreground">Control your alerts</div>
                </div>
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Help Resources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-purple-500" />
              <span>Help & Resources</span>
            </CardTitle>
            <CardDescription>
              Additional resources and support
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-medium mb-1 text-sm">About HAOS</h4>
              <p className="text-xs text-muted-foreground">
                HAOS is a decentralized chat platform powered by Matrix, giving you control over your data and communications.
              </p>
            </div>
            
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-medium mb-1 text-sm">Matrix Protocol</h4>
              <p className="text-xs text-muted-foreground">
                Unlike centralized platforms, Matrix is an open standard for secure, decentralized real-time communication.
              </p>
            </div>
            
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-medium mb-1 text-sm">Privacy First</h4>
              <p className="text-xs text-muted-foreground">
                Your conversations and data stay under your control, with end-to-end encryption available for sensitive communications.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}