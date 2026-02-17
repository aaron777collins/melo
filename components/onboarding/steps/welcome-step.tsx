"use client";

/**
 * Welcome Step Component
 * 
 * First step in the onboarding wizard that introduces new users to Melo
 * and explains what they'll accomplish during the onboarding process.
 */

import React from "react";
import { Sparkles, MessageCircle, Users, Shield, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMatrixAuth } from "@/components/providers/matrix-auth-provider";

// =============================================================================
// Types
// =============================================================================

interface WelcomeStepProps {
  onNext: () => void;
  onSkip?: () => void;
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function WelcomeStep({ onNext, onSkip, className }: WelcomeStepProps) {
  const { user } = useMatrixAuth();

  const features = [
    {
      icon: <MessageCircle className="w-5 h-5 text-blue-500" />,
      title: "Secure Messaging",
      description: "End-to-end encrypted conversations powered by Matrix",
    },
    {
      icon: <Users className="w-5 h-5 text-green-500" />,
      title: "Join Communities", 
      description: "Connect with others in servers and channels",
    },
    {
      icon: <Shield className="w-5 h-5 text-purple-500" />,
      title: "Privacy First",
      description: "Your data stays secure and under your control",
    },
    {
      icon: <Globe className="w-5 h-5 text-orange-500" />,
      title: "Decentralized",
      description: "Part of the global Matrix network",
    },
  ];

  return (
    <div className={`space-y-6 max-w-2xl mx-auto ${className || ""}`}>
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        
        <div>
          <h1 className="text-3xl font-bold mb-2">
            Welcome to Melo{user?.displayName ? `, ${user.displayName}` : ""}! 🎉
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Your secure, decentralized chat platform powered by the Matrix protocol.
            Let's get you set up in just a few quick steps!
          </p>
        </div>
      </div>

      {/* What You'll Do */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-center">
            What We'll Set Up Together
          </h2>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-sm font-semibold flex items-center justify-center">
                1
              </div>
              <div>
                <p className="font-medium">Personalize Your Profile</p>
                <p className="text-sm text-muted-foreground">
                  Add your name and avatar to make your presence known
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
              <div className="w-6 h-6 rounded-full bg-green-500 text-white text-sm font-semibold flex items-center justify-center">
                2
              </div>
              <div>
                <p className="font-medium">Join Your First Community</p>
                <p className="text-sm text-muted-foreground">
                  Discover and join servers that match your interests
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
              <div className="w-6 h-6 rounded-full bg-purple-500 text-white text-sm font-semibold flex items-center justify-center">
                3
              </div>
              <div>
                <p className="font-medium">Send Your First Message</p>
                <p className="text-sm text-muted-foreground">
                  Learn the basics of chatting and connecting
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((feature, index) => (
          <Card key={index} className="border-muted">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 p-2 rounded-lg bg-muted">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 p-1">
              <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                <span className="text-white text-xs">💡</span>
              </div>
            </div>
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                New to Matrix?
              </p>
              <p className="text-blue-700 dark:text-blue-200">
                Don't worry! Melo makes Matrix simple and user-friendly. 
                You'll be chatting confidently in no time. This setup should only take 2-3 minutes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button onClick={onNext} className="flex-1">
          Let's Get Started! 🚀
        </Button>
        {onSkip && (
          <Button variant="ghost" onClick={onSkip} className="text-muted-foreground">
            Skip Setup For Now
          </Button>
        )}
      </div>
      
      {/* Footer Note */}
      <div className="text-center pt-2">
        <p className="text-xs text-muted-foreground">
          You can always access this setup later from your settings
        </p>
      </div>
    </div>
  );
}