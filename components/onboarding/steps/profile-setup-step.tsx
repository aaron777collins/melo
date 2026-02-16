"use client";

/**
 * Profile Setup Step Component
 * 
 * Allows users to set up their profile during onboarding by updating
 * their display name and uploading an avatar image.
 */

import React, { useState, useEffect } from "react";
import { User, Upload, Camera, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMatrixAuth } from "@/components/providers/matrix-auth-provider";
import { useMatrixClient } from "@/hooks/use-matrix-client";

// =============================================================================
// Types
// =============================================================================

interface ProfileSetupStepProps {
  profileData: {
    displayName: string;
    avatarUrl?: string;
  };
  onProfileUpdate: (data: { displayName: string; avatarUrl?: string }) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip?: () => void;
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function ProfileSetupStep({
  profileData,
  onProfileUpdate,
  onNext,
  onBack,
  onSkip,
  className,
}: ProfileSetupStepProps) {
  const { user } = useMatrixAuth();
  const matrixClient = useMatrixClient();
  
  // Form state
  const [displayName, setDisplayName] = useState(profileData.displayName || user?.displayName || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profileData.avatarUrl || null);
  
  // Loading states
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  
  // Error state
  const [error, setError] = useState<string | null>(null);
  
  // Validation
  const isDisplayNameValid = displayName.trim().length >= 1;
  const hasChanges = displayName !== (user?.displayName || "") || avatarFile !== null;

  // =============================================================================
  // Effects
  // =============================================================================

  /**
   * Update parent component when local state changes
   */
  useEffect(() => {
    if (displayName !== profileData.displayName || avatarPreview !== profileData.avatarUrl) {
      onProfileUpdate({
        displayName: displayName.trim(),
        avatarUrl: avatarPreview || undefined,
      });
    }
  }, [displayName, avatarPreview, onProfileUpdate, profileData]);

  // =============================================================================
  // Handlers
  // =============================================================================

  /**
   * Handle avatar file selection
   */
  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type and size
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError("Image file must be smaller than 5MB");
        return;
      }
      
      setAvatarFile(file);
      setError(null);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    
    if (!isDisplayNameValid) {
      setError("Display name is required");
      return;
    }
    
    setIsUpdatingProfile(true);
    
    try {
      const client = matrixClient?.client;
      if (!client) {
        throw new Error("Matrix client not available");
      }
      
      // Upload avatar if selected
      let avatarUrl = avatarPreview;
      if (avatarFile) {
        setIsUploadingAvatar(true);
        try {
          const response = await client.uploadContent(avatarFile, {
            name: avatarFile.name,
            type: avatarFile.type,
          });
          avatarUrl = response.content_uri;
          setAvatarPreview(avatarUrl);
        } catch (uploadError) {
          console.warn("Avatar upload failed:", uploadError);
          // Continue without avatar update
          avatarUrl = null;
        } finally {
          setIsUploadingAvatar(false);
        }
      }
      
      // Update display name
      if (displayName.trim() !== user?.displayName) {
        await client.setDisplayName(displayName.trim());
      }
      
      // Update avatar URL if we have one
      if (avatarUrl && avatarUrl !== user?.avatarUrl) {
        await client.setAvatarUrl(avatarUrl);
      }
      
      // Update parent state
      onProfileUpdate({
        displayName: displayName.trim(),
        avatarUrl: avatarUrl || undefined,
      });
      
      // Move to next step
      onNext();
      
    } catch (err) {
      console.error("Profile update error:", err);
      setError(
        err instanceof Error 
          ? `Failed to update profile: ${err.message}`
          : "Failed to update profile. Please try again."
      );
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  /**
   * Handle skip
   */
  const handleSkip = () => {
    // Save current values before skipping
    onProfileUpdate({
      displayName: displayName.trim() || user?.displayName || "User",
      avatarUrl: avatarPreview || undefined,
    });
    onSkip?.();
  };

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <div className={`space-y-6 max-w-lg mx-auto ${className || ""}`}>
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
          <User className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold">Set Up Your Profile</h1>
        <p className="text-muted-foreground">
          Let others know who you are with a display name and avatar
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="w-20 h-20">
                  {avatarPreview ? (
                    <AvatarImage src={avatarPreview} alt="Profile avatar" />
                  ) : (
                    <AvatarFallback className="text-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {displayName.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  )}
                </Avatar>
                
                {/* Upload Button Overlay */}
                <label className="absolute inset-0 w-20 h-20 rounded-full bg-black/50 flex items-center justify-center cursor-pointer opacity-0 hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleAvatarChange}
                  />
                </label>
              </div>
              
              <div className="text-center">
                <Label htmlFor="avatar-upload" className="cursor-pointer">
                  <Button type="button" variant="outline" size="sm" asChild>
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Avatar
                    </span>
                  </Button>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleAvatarChange}
                  />
                </Label>
                <p className="text-xs text-muted-foreground mt-2">
                  Optional • Max 5MB • JPG, PNG, GIF
                </p>
              </div>
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name *</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Enter your display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className={!isDisplayNameValid && displayName ? "border-red-500" : ""}
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                This is how others will see you in chats and member lists
              </p>
              {!isDisplayNameValid && displayName && (
                <p className="text-xs text-red-500">Display name cannot be empty</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Progress Indicators */}
        {isUploadingAvatar && (
          <Alert>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            <AlertDescription>Uploading avatar...</AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onBack} className="order-2 sm:order-1">
            Back
          </Button>
          
          <Button 
            type="submit" 
            disabled={!isDisplayNameValid || isUpdatingProfile}
            className="order-1 sm:order-2 flex-1"
          >
            {isUpdatingProfile ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving Profile...
              </>
            ) : hasChanges ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Save & Continue
              </>
            ) : (
              "Continue"
            )}
          </Button>
          
          {onSkip && (
            <Button 
              type="button" 
              variant="ghost" 
              onClick={handleSkip}
              className="order-3 text-muted-foreground"
            >
              Skip For Now
            </Button>
          )}
        </div>
      </form>

      {/* Help Text */}
      <div className="text-center pt-2">
        <p className="text-xs text-muted-foreground">
          Your profile can be updated anytime from settings
        </p>
      </div>
    </div>
  );
}