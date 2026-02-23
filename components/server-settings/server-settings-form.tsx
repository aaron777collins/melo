"use client";

/**
 * Server Settings Form Component
 * 
 * A comprehensive form for editing server settings including name, description,
 * and avatar. Integrates with Matrix API for real-time updates.
 */

import React, { useState, useCallback, useRef } from "react";
import { Loader2, Upload, X, Check, AlertCircle, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  updateServerName,
  updateServerDescription,
  updateServerAvatar,
} from "@/lib/matrix/server-settings";
import { getClient } from "@/lib/matrix/client";
import type {
  ServerSettings,
  ServerSettingsPermissions,
} from "@/lib/matrix/types/server-settings";

// =============================================================================
// Types
// =============================================================================

interface ServerSettingsFormProps {
  /** Matrix room ID for the server/space */
  roomId: string;
  /** Initial settings to display */
  initialSettings: ServerSettings;
  /** User's permissions for editing settings */
  permissions?: ServerSettingsPermissions;
  /** Callback when settings are updated */
  onSettingsUpdated?: (settings: ServerSettings) => void;
  /** Additional CSS classes */
  className?: string;
}

interface FormState {
  name: string;
  description: string;
  avatarUrl: string | null;
}

interface SaveState {
  name: "idle" | "saving" | "success" | "error";
  description: "idle" | "saving" | "success" | "error";
  avatar: "idle" | "saving" | "success" | "error";
}

interface ErrorState {
  name: string | null;
  description: string | null;
  avatar: string | null;
  network: string | null;
  validation: string | null;
}

// =============================================================================
// Constants
// =============================================================================

const MAX_NAME_LENGTH = 255;
const MAX_DESCRIPTION_LENGTH = 1000;
const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB

// =============================================================================
// Component
// =============================================================================

export function ServerSettingsForm({
  roomId,
  initialSettings,
  permissions = {
    canEditName: true,
    canEditDescription: true,
    canEditAvatar: true,
    canEditAll: true,
  },
  onSettingsUpdated,
  className,
}: ServerSettingsFormProps) {
  // Form state
  const [formState, setFormState] = useState<FormState>({
    name: initialSettings.name || "",
    description: initialSettings.description || "",
    avatarUrl: initialSettings.avatarUrl || null,
  });

  // Save states for each field
  const [saveState, setSaveState] = useState<SaveState>({
    name: "idle",
    description: "idle",
    avatar: "idle",
  });

  // Error states
  const [errors, setErrors] = useState<ErrorState>({
    name: null,
    description: null,
    avatar: null,
    network: null,
    validation: null,
  });

  // File input ref for avatar upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // =============================================================================
  // Validation Functions
  // =============================================================================

  const validateName = useCallback((name: string): string | null => {
    if (!name || name.trim().length === 0) {
      return "Server name is required and cannot be empty";
    }
    if (name.length > MAX_NAME_LENGTH) {
      return `Server name must be ${MAX_NAME_LENGTH} characters or less`;
    }
    return null;
  }, []);

  const validateDescription = useCallback((description: string): string | null => {
    if (description && description.length > MAX_DESCRIPTION_LENGTH) {
      return `Server description must be ${MAX_DESCRIPTION_LENGTH} characters or less`;
    }
    return null;
  }, []);

  // =============================================================================
  // Clear Error Helpers
  // =============================================================================

  const clearError = useCallback((field: keyof ErrorState) => {
    setErrors(prev => ({ ...prev, [field]: null }));
  }, []);

  const clearSaveState = useCallback((field: keyof SaveState) => {
    setTimeout(() => {
      setSaveState(prev => ({ ...prev, [field]: "idle" }));
    }, 3000);
  }, []);

  // =============================================================================
  // Save Handlers
  // =============================================================================

  const handleSaveName = async () => {
    // Validate
    const validationError = validateName(formState.name);
    if (validationError) {
      setErrors(prev => ({ 
        ...prev, 
        name: validationError,
        validation: validationError 
      }));
      return;
    }

    // Clear previous errors
    clearError("name");
    clearError("network");
    clearError("validation");
    
    // Set saving state
    setSaveState(prev => ({ ...prev, name: "saving" }));

    try {
      const result = await updateServerName(roomId, formState.name);
      
      if (result.success && result.settings) {
        setSaveState(prev => ({ ...prev, name: "success" }));
        onSettingsUpdated?.(result.settings);
        clearSaveState("name");
      } else {
        setSaveState(prev => ({ ...prev, name: "error" }));
        setErrors(prev => ({
          ...prev,
          name: result.error?.message || "Failed to update server name",
        }));
      }
    } catch (error: any) {
      setSaveState(prev => ({ ...prev, name: "error" }));
      if (error?.message?.includes("network") || error?.message?.includes("Network")) {
        setErrors(prev => ({ ...prev, network: error.message }));
      } else {
        setErrors(prev => ({ ...prev, name: error.message || "An error occurred" }));
      }
    }
  };

  const handleSaveDescription = async () => {
    // Validate
    const validationError = validateDescription(formState.description);
    if (validationError) {
      setErrors(prev => ({ 
        ...prev, 
        description: validationError,
        validation: validationError 
      }));
      return;
    }

    // Clear previous errors
    clearError("description");
    clearError("network");
    clearError("validation");

    // Set saving state
    setSaveState(prev => ({ ...prev, description: "saving" }));

    try {
      const descriptionValue = formState.description.trim() || null;
      const result = await updateServerDescription(roomId, descriptionValue);
      
      if (result.success && result.settings) {
        setSaveState(prev => ({ ...prev, description: "success" }));
        onSettingsUpdated?.(result.settings);
        clearSaveState("description");
      } else {
        setSaveState(prev => ({ ...prev, description: "error" }));
        setErrors(prev => ({
          ...prev,
          description: result.error?.message || "Failed to update description",
        }));
      }
    } catch (error: any) {
      setSaveState(prev => ({ ...prev, description: "error" }));
      if (error?.message?.includes("network") || error?.message?.includes("Network")) {
        setErrors(prev => ({ ...prev, network: error.message }));
      } else {
        setErrors(prev => ({ ...prev, description: error.message || "An error occurred" }));
      }
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setErrors(prev => ({
        ...prev,
        avatar: "Please upload a valid image file (PNG, JPEG, GIF, or WebP)",
      }));
      return;
    }

    // Validate file size
    if (file.size > MAX_AVATAR_SIZE) {
      setErrors(prev => ({
        ...prev,
        avatar: "Image must be smaller than 5MB",
      }));
      return;
    }

    // Clear previous errors
    clearError("avatar");
    clearError("network");

    // Set saving state
    setSaveState(prev => ({ ...prev, avatar: "saving" }));

    try {
      const client = getClient();
      if (!client) {
        throw new Error("Matrix client not available");
      }

      // Upload to Matrix content repository
      const uploadResult = await client.uploadContent(file, {
        name: file.name,
        type: file.type,
      });

      const mxcUrl = uploadResult.content_uri;

      // Update server avatar
      const result = await updateServerAvatar(roomId, mxcUrl);
      
      if (result.success && result.settings) {
        setFormState(prev => ({ ...prev, avatarUrl: mxcUrl }));
        setSaveState(prev => ({ ...prev, avatar: "success" }));
        onSettingsUpdated?.(result.settings);
        clearSaveState("avatar");
      } else {
        setSaveState(prev => ({ ...prev, avatar: "error" }));
        setErrors(prev => ({
          ...prev,
          avatar: result.error?.message || "Failed to update avatar",
        }));
      }
    } catch (error: any) {
      setSaveState(prev => ({ ...prev, avatar: "error" }));
      if (error?.message?.includes("network") || error?.message?.includes("Network")) {
        setErrors(prev => ({ ...prev, network: error.message }));
      } else {
        setErrors(prev => ({ ...prev, avatar: error.message || "Failed to upload avatar" }));
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    clearError("avatar");
    clearError("network");
    setSaveState(prev => ({ ...prev, avatar: "saving" }));

    try {
      const result = await updateServerAvatar(roomId, null);
      
      if (result.success && result.settings) {
        setFormState(prev => ({ ...prev, avatarUrl: null }));
        setSaveState(prev => ({ ...prev, avatar: "success" }));
        onSettingsUpdated?.(result.settings);
        clearSaveState("avatar");
      } else {
        setSaveState(prev => ({ ...prev, avatar: "error" }));
        setErrors(prev => ({
          ...prev,
          avatar: result.error?.message || "Failed to remove avatar",
        }));
      }
    } catch (error: any) {
      setSaveState(prev => ({ ...prev, avatar: "error" }));
      setErrors(prev => ({ ...prev, avatar: error.message || "Failed to remove avatar" }));
    }
  };

  // =============================================================================
  // Helper Functions
  // =============================================================================

  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isSaving = saveState.name === "saving" || saveState.description === "saving" || saveState.avatar === "saving";

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <div className={cn("space-y-8", className)}>
      {/* Network Error Banner */}
      {errors.network && (
        <div
          data-testid="network-error-message"
          className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-center gap-3"
        >
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-red-400 text-sm">{errors.network}</p>
        </div>
      )}

      {/* Validation Error Banner */}
      {errors.validation && (
        <div
          data-testid="validation-error-message"
          className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 flex items-center gap-3"
        >
          <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
          <p className="text-yellow-400 text-sm">{errors.validation}</p>
        </div>
      )}

      {/* Server Avatar Section */}
      <section
        data-testid="server-avatar-section"
        className="bg-zinc-800/50 rounded-lg p-6"
      >
        <div className="flex items-start gap-6">
          {/* Avatar Preview */}
          <div className="relative group">
            {formState.avatarUrl ? (
              <Avatar
                data-testid="server-avatar-image"
                className="h-24 w-24 rounded-2xl"
              >
                <AvatarImage
                  src={formState.avatarUrl.replace("mxc://", "/_matrix/media/r0/download/")}
                  alt="Server avatar"
                />
                <AvatarFallback className="rounded-2xl bg-indigo-500 text-white text-2xl font-semibold">
                  {getInitials(formState.name)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div
                data-testid="default-avatar-placeholder"
                className="h-24 w-24 rounded-2xl bg-zinc-700 flex items-center justify-center"
              >
                <Camera className="h-8 w-8 text-zinc-400" />
              </div>
            )}

            {/* Upload overlay */}
            {permissions.canEditAvatar && (
              <div className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="h-6 w-6 text-white" />
              </div>
            )}
          </div>

          {/* Avatar Actions */}
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="text-white font-medium">Server Avatar</h3>
              <p className="text-zinc-400 text-sm mt-1">
                Upload an image to represent your server. Recommended size: 512x512px.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_IMAGE_TYPES.join(",")}
                onChange={handleAvatarUpload}
                className="hidden"
                disabled={!permissions.canEditAvatar || saveState.avatar === "saving"}
              />

              <Button
                data-testid="avatar-upload-button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={!permissions.canEditAvatar || saveState.avatar === "saving"}
              >
                {saveState.avatar === "saving" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Upload Image
              </Button>

              {formState.avatarUrl && (
                <Button
                  data-testid="remove-avatar-button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveAvatar}
                  disabled={!permissions.canEditAvatar || saveState.avatar === "saving"}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <X className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              )}
            </div>

            {/* Avatar Success Message */}
            {saveState.avatar === "success" && (
              <div
                data-testid="avatar-success-message"
                className="flex items-center gap-2 text-green-400 text-sm"
              >
                <Check className="h-4 w-4" />
                Avatar updated successfully
              </div>
            )}

            {/* Avatar Error Message */}
            {errors.avatar && (
              <div
                data-testid="avatar-error-message"
                className="flex items-center gap-2 text-red-400 text-sm"
              >
                <AlertCircle className="h-4 w-4" />
                {errors.avatar}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Server Name Section */}
      <section className="space-y-4">
        <div>
          <Label htmlFor="server-name" className="text-white font-medium">
            Server Name
          </Label>
          <p className="text-zinc-400 text-sm mt-1">
            This is the display name for your server.
          </p>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex-1">
            <Input
              id="server-name"
              data-testid="server-name-input"
              value={formState.name}
              onChange={e => {
                setFormState(prev => ({ ...prev, name: e.target.value }));
                clearError("name");
                clearError("validation");
              }}
              placeholder="Enter server name"
              maxLength={MAX_NAME_LENGTH}
              disabled={!permissions.canEditName || saveState.name === "saving"}
              className={cn(
                "bg-zinc-900 border-zinc-700",
                errors.name && "border-red-500 focus-visible:ring-red-500"
              )}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-zinc-500 text-xs">
                {formState.name.length}/{MAX_NAME_LENGTH} characters
              </span>
              {errors.name && (
                <span
                  data-testid="error-message"
                  className="text-red-400 text-xs"
                >
                  {errors.name}
                </span>
              )}
            </div>
          </div>

          <Button
            data-testid="save-server-name-button"
            onClick={handleSaveName}
            disabled={!permissions.canEditName || saveState.name === "saving"}
            data-loading={saveState.name === "saving" ? "true" : "false"}
          >
            {saveState.name === "saving" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : saveState.name === "success" ? (
              <Check className="h-4 w-4 mr-2" />
            ) : null}
            Save
          </Button>
        </div>

        {/* Name Success Message */}
        {saveState.name === "success" && (
          <div
            data-testid="success-message"
            className="flex items-center gap-2 text-green-400 text-sm"
          >
            <Check className="h-4 w-4" />
            Server name saved successfully
          </div>
        )}
      </section>

      {/* Server Description Section */}
      <section className="space-y-4">
        <div>
          <Label htmlFor="server-description" className="text-white font-medium">
            Server Description
          </Label>
          <p className="text-zinc-400 text-sm mt-1">
            Tell people what your server is about.
          </p>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex-1">
            <Textarea
              id="server-description"
              data-testid="server-description-textarea"
              value={formState.description}
              onChange={e => {
                setFormState(prev => ({ ...prev, description: e.target.value }));
                clearError("description");
                clearError("validation");
              }}
              placeholder="Enter a description for your server..."
              maxLength={MAX_DESCRIPTION_LENGTH}
              disabled={!permissions.canEditDescription || saveState.description === "saving"}
              className={cn(
                "min-h-[120px] bg-zinc-900 border-zinc-700",
                errors.description && "border-red-500 focus-visible:ring-red-500"
              )}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-zinc-500 text-xs">
                {formState.description.length}/{MAX_DESCRIPTION_LENGTH} characters
              </span>
              {errors.description && (
                <span className="text-red-400 text-xs">{errors.description}</span>
              )}
            </div>
          </div>

          <Button
            data-testid="save-description-button"
            onClick={handleSaveDescription}
            disabled={!permissions.canEditDescription || saveState.description === "saving"}
            data-loading={saveState.description === "saving" ? "true" : "false"}
          >
            {saveState.description === "saving" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : saveState.description === "success" ? (
              <Check className="h-4 w-4 mr-2" />
            ) : null}
            Save
          </Button>
        </div>

        {/* Description Success Message */}
        {saveState.description === "success" && (
          <div
            data-testid="description-success-message"
            className="flex items-center gap-2 text-green-400 text-sm"
          >
            <Check className="h-4 w-4" />
            Server description saved successfully
          </div>
        )}
      </section>
    </div>
  );
}

export default ServerSettingsForm;
