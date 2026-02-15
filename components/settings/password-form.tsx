/**
 * Password Form Component
 *
 * Secure password change form with current password verification,
 * strength validation, and Matrix account integration.
 */

"use client";

import React, { useState, useCallback } from "react";
import { Eye, EyeOff, Lock, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useMatrixClient } from "@/hooks/use-matrix-client";
import { type MatrixProfile } from "@/lib/current-profile";

// =============================================================================
// Types & Validation
// =============================================================================

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your new password")
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don&apos;t match",
  path: ["confirmPassword"]
});

type PasswordFormData = z.infer<typeof passwordSchema>;

interface PasswordFormProps {
  profile: MatrixProfile;
}

interface PasswordStrength {
  score: number; // 0-4
  feedback: string[];
  warning?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate password strength
 */
function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return {
      score: 0,
      feedback: ["Enter a password"]
    };
  }

  let score = 0;
  const feedback: string[] = [];
  let warning: string | undefined;

  // Length check
  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push("Use at least 8 characters");
  }

  // Character variety checks
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const varietyCount = [hasLower, hasUpper, hasNumbers, hasSpecial].filter(Boolean).length;

  if (varietyCount >= 3) {
    score += 1;
  } else {
    feedback.push("Mix uppercase, lowercase, numbers, and symbols");
  }

  // Length bonuses
  if (password.length >= 12) {
    score += 1;
  }

  if (password.length >= 16) {
    score += 1;
  }

  // Common patterns (simplified)
  const commonPatterns = [
    /^password/i,
    /123456/,
    /qwerty/i,
    /abc/i,
    /(.)\1{2,}/, // repeated characters
  ];

  const hasCommonPattern = commonPatterns.some(pattern => pattern.test(password));
  if (hasCommonPattern) {
    score = Math.max(0, score - 1);
    warning = "Avoid common patterns and repeated characters";
  }

  // Adjust feedback based on score
  if (score >= 3) {
    feedback.length = 0; // Clear negative feedback for strong passwords
    if (score === 4) {
      feedback.push("Excellent password strength");
    } else {
      feedback.push("Good password strength");
    }
  }

  return {
    score: Math.min(4, Math.max(0, score)),
    feedback,
    warning
  };
}

/**
 * Get strength color based on score
 */
function getStrengthColor(score: number): string {
  switch (score) {
    case 0: return "bg-gray-300";
    case 1: return "bg-red-500";
    case 2: return "bg-orange-500";
    case 3: return "bg-yellow-500";
    case 4: return "bg-green-500";
    default: return "bg-gray-300";
  }
}

/**
 * Get strength label based on score
 */
function getStrengthLabel(score: number): string {
  switch (score) {
    case 0: return "Enter password";
    case 1: return "Weak";
    case 2: return "Fair";
    case 3: return "Good";
    case 4: return "Strong";
    default: return "Unknown";
  }
}

// =============================================================================
// Components
// =============================================================================

/**
 * Password strength indicator
 */
function PasswordStrengthIndicator({ password }: { password: string }) {
  const strength = calculatePasswordStrength(password);
  const progressValue = (strength.score / 4) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Password strength</span>
        <span className={`font-medium ${
          strength.score >= 3 ? "text-green-600" : 
          strength.score >= 2 ? "text-yellow-600" : 
          strength.score >= 1 ? "text-orange-600" : 
          "text-red-600"
        }`}>
          {getStrengthLabel(strength.score)}
        </span>
      </div>
      
      <Progress 
        value={progressValue} 
        className="h-2"
      />
      
      {strength.warning && (
        <Alert variant="destructive" className="p-2">
          <AlertTriangle className="h-3 w-3" />
          <AlertDescription className="text-xs">
            {strength.warning}
          </AlertDescription>
        </Alert>
      )}
      
      {strength.feedback.length > 0 && (
        <div className="space-y-1">
          {strength.feedback.map((item, index) => (
            <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
              {strength.score >= 3 ? (
                <CheckCircle className="h-3 w-3 text-green-500" />
              ) : (
                <div className="h-3 w-3 rounded-full border border-muted-foreground/30" />
              )}
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Password change form component
 */
export function PasswordForm({ profile }: PasswordFormProps) {
  const { client } = useMatrixClient();
  const [formData, setFormData] = useState<PasswordFormData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [errors, setErrors] = useState<Partial<Record<keyof PasswordFormData, string>>>({});
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  /**
   * Handle form field changes
   */
  const handleChange = useCallback((field: keyof PasswordFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
    // Clear success state if user modifies form
    if (success) {
      setSuccess(false);
    }
  }, [errors, success]);

  /**
   * Toggle password visibility
   */
  const togglePasswordVisibility = useCallback((field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  }, []);

  /**
   * Validate form data
   */
  const validateForm = useCallback((): boolean => {
    try {
      passwordSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<Record<keyof PasswordFormData, string>> = {};
        error.errors.forEach(err => {
          const field = err.path[0] as keyof PasswordFormData;
          fieldErrors[field] = err.message;
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  }, [formData]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!client) {
      setApiError("Matrix client not available. Please try again.");
      return;
    }

    const passwordStrength = calculatePasswordStrength(formData.newPassword);
    if (passwordStrength.score < 2) {
      setApiError("Please choose a stronger password before continuing.");
      return;
    }

    setIsLoading(true);
    setApiError(null);

    try {
      // Change password via Matrix client
      await client.setPassword(
        {
          type: "m.login.password",
          user: profile.userId,
          password: formData.currentPassword
        },
        formData.newPassword
      );

      // Success!
      setSuccess(true);
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      
      console.log("Password changed successfully");

    } catch (error: any) {
      console.error("Password change failed:", error);
      
      // Handle specific Matrix errors
      if (error.errcode === "M_FORBIDDEN") {
        setApiError("Current password is incorrect. Please try again.");
      } else if (error.errcode === "M_WEAK_PASSWORD") {
        setApiError("New password is too weak. Please choose a stronger password.");
      } else if (error.errcode === "M_PASSWORD_TOO_LONG") {
        setApiError("New password is too long. Please choose a shorter password.");
      } else if (error.errcode === "M_INVALID_PASSWORD") {
        setApiError("New password contains invalid characters.");
      } else {
        setApiError(
          error.message || 
          "Failed to change password. Please try again or contact support."
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [client, profile.userId, formData, validateForm]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Success Message */}
      {success && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Password changed successfully! You&apos;ll remain logged in on this device.
          </AlertDescription>
        </Alert>
      )}

      {/* API Error */}
      {apiError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}

      {/* Current Password */}
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current Password</Label>
        <div className="relative">
          <Input
            id="currentPassword"
            name="currentPassword"
            type={showPasswords.current ? "text" : "password"}
            value={formData.currentPassword}
            onChange={(e) => handleChange("currentPassword", e.target.value)}
            placeholder="Enter your current password"
            className={errors.currentPassword ? "border-red-500" : ""}
            disabled={isLoading}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1 h-8 w-8 p-0"
            onClick={() => togglePasswordVisibility("current")}
            tabIndex={-1}
          >
            {showPasswords.current ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
        {errors.currentPassword && (
          <p className="text-sm text-red-600">{errors.currentPassword}</p>
        )}
      </div>

      {/* New Password */}
      <div className="space-y-2">
        <Label htmlFor="newPassword">New Password</Label>
        <div className="relative">
          <Input
            id="newPassword"
            name="newPassword"
            type={showPasswords.new ? "text" : "password"}
            value={formData.newPassword}
            onChange={(e) => handleChange("newPassword", e.target.value)}
            placeholder="Enter your new password"
            className={errors.newPassword ? "border-red-500" : ""}
            disabled={isLoading}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1 h-8 w-8 p-0"
            onClick={() => togglePasswordVisibility("new")}
            tabIndex={-1}
          >
            {showPasswords.new ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
        {errors.newPassword && (
          <p className="text-sm text-red-600">{errors.newPassword}</p>
        )}
        
        {/* Password Strength Indicator */}
        {formData.newPassword && (
          <PasswordStrengthIndicator password={formData.newPassword} />
        )}
      </div>

      {/* Confirm Password */}
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showPasswords.confirm ? "text" : "password"}
            value={formData.confirmPassword}
            onChange={(e) => handleChange("confirmPassword", e.target.value)}
            placeholder="Confirm your new password"
            className={errors.confirmPassword ? "border-red-500" : ""}
            disabled={isLoading}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1 h-8 w-8 p-0"
            onClick={() => togglePasswordVisibility("confirm")}
            tabIndex={-1}
          >
            {showPasswords.confirm ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
        {errors.confirmPassword && (
          <p className="text-sm text-red-600">{errors.confirmPassword}</p>
        )}
      </div>

      {/* Security Notice */}
      <Alert>
        <Lock className="h-4 w-4" />
        <AlertDescription>
          <strong>Security Notice:</strong> Changing your password will not sign out your other devices. 
          If you suspect unauthorized access, consider revoking other device sessions from the 
          Device Management section above.
        </AlertDescription>
      </Alert>

      {/* Submit Button */}
      <div className="flex gap-3">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Changing Password...
            </>
          ) : (
            <>
              <Lock className="h-4 w-4 mr-2" />
              Change Password
            </>
          )}
        </Button>
        
        {formData.currentPassword || formData.newPassword || formData.confirmPassword ? (
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => {
              setFormData({
                currentPassword: "",
                newPassword: "",
                confirmPassword: ""
              });
              setErrors({});
              setApiError(null);
              setSuccess(false);
            }}
            disabled={isLoading}
          >
            Clear Form
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export default PasswordForm;