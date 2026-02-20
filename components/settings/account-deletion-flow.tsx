"use client";

/**
 * Account Deletion Flow Component
 *
 * Multi-step account deletion flow with comprehensive warnings,
 * data retention options, and security confirmations.
 */

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Eye, EyeOff, Loader2, Mail, Shield, Trash2, UserMinus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { type MatrixProfile } from "@/lib/current-profile";
import { 
  deactivateAccount, 
  validateDeactivationEligibility, 
  getDeactivationInfo,
  type DeactivationOptions 
} from "@/lib/matrix/account-deactivation";

// =============================================================================
// Types
// =============================================================================

interface AccountDeletionFlowProps {
  profile: MatrixProfile;
}

type DeletionStep = "warning" | "options" | "confirmation" | "final" | "processing" | "complete";

interface DeletionState {
  step: DeletionStep;
  eraseData: boolean;
  password: string;
  confirmationText: string;
  emailConfirm: string;
  acknowledgedConsequences: boolean;
  acknowledgedNoRecovery: boolean;
  acknowledgedDataRetention: boolean;
  isEligible: boolean;
  eligibilityReason?: string;
  showPassword: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function AccountDeletionFlow({ profile }: AccountDeletionFlowProps) {
  const router = useRouter();
  
  const [state, setState] = useState<DeletionState>({
    step: "warning",
    eraseData: false,
    password: "",
    confirmationText: "",
    emailConfirm: "",
    acknowledgedConsequences: false,
    acknowledgedNoRecovery: false,
    acknowledgedDataRetention: false,
    isEligible: false,
    showPassword: false,
  });
  
  const [isLoading, setIsLoading] = useState(false);

  // Get user display name and info
  const displayName = profile.name || profile.userId.split(":")[0].replace("@", "");
  const deactivationInfo = getDeactivationInfo(profile.userId);

  // Validate eligibility on component mount
  useEffect(() => {
    validateEligibility();
  }, []);

  /**
   * Validate if user can deactivate their account
   */
  const validateEligibility = async () => {
    try {
      const result = await validateDeactivationEligibility();
      setState(prev => ({
        ...prev,
        isEligible: result.eligible,
        eligibilityReason: result.reason,
      }));
    } catch (error) {
      console.error("Failed to validate eligibility:", error);
      setState(prev => ({
        ...prev,
        isEligible: false,
        eligibilityReason: "Failed to validate account status.",
      }));
    }
  };

  /**
   * Handle step navigation
   */
  const goToStep = (step: DeletionStep) => {
    setState(prev => ({ ...prev, step }));
  };

  /**
   * Validate current step and allow progression
   */
  const canProceedFromStep = (step: DeletionStep): boolean => {
    switch (step) {
      case "warning":
        return state.acknowledgedConsequences && state.acknowledgedNoRecovery;
      
      case "options":
        return state.acknowledgedDataRetention;
      
      case "confirmation":
        return (
          state.confirmationText.toLowerCase() === displayName.toLowerCase() &&
          state.emailConfirm.toLowerCase() === profile.email?.toLowerCase() &&
          state.password.length > 0
        );
      
      case "final":
        return true;
      
      default:
        return false;
    }
  };

  /**
   * Handle the final account deletion
   */
  const handleAccountDeletion = async () => {
    if (!canProceedFromStep("final")) return;

    setIsLoading(true);
    setState(prev => ({ ...prev, step: "processing" }));

    try {
      const options: DeactivationOptions = {
        password: state.password,
        eraseData: state.eraseData,
      };

      const result = await deactivateAccount(options);

      if (result.success) {
        setState(prev => ({ ...prev, step: "complete" }));
        toast.error("Account has been permanently deleted.");
        
        // Redirect to login after brief delay
        setTimeout(() => {
          router.push("/sign-in");
        }, 3000);
      } else {
        throw new Error(result.error || "Account deletion failed");
      }
    } catch (error: any) {
      console.error("Account deletion failed:", error);
      toast.error(error.message || "Failed to delete account. Please try again.");
      setState(prev => ({ ...prev, step: "final" }));
    } finally {
      setIsLoading(false);
    }
  };

  // Show eligibility error
  if (!state.isEligible) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Account deletion not available:</strong> {state.eligibilityReason}
          </AlertDescription>
        </Alert>
        <Button 
          variant="outline" 
          onClick={() => router.push("/settings")}
          className="w-full"
        >
          Return to Settings
        </Button>
      </div>
    );
  }

  // Step 1: Warning and Initial Acknowledgment
  if (state.step === "warning") {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>This action is permanent and irreversible.</strong>
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h4 className="font-semibold text-red-600">What will happen:</h4>
            <ul className="space-y-2">
              {deactivationInfo.consequences.map((consequence, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 mt-0.5 text-red-500 flex-shrink-0" />
                  {consequence}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-start space-x-2">
            <Checkbox
              id="acknowledge-consequences"
              checked={state.acknowledgedConsequences}
              onCheckedChange={(checked) =>
                setState(prev => ({ ...prev, acknowledgedConsequences: !!checked }))
              }
            />
            <Label
              htmlFor="acknowledge-consequences"
              className="text-sm leading-5"
            >
              I understand that deleting my account will remove me from all rooms and spaces,
              delete my profile, and prevent others from contacting me.
            </Label>
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
              id="acknowledge-no-recovery"
              checked={state.acknowledgedNoRecovery}
              onCheckedChange={(checked) =>
                setState(prev => ({ ...prev, acknowledgedNoRecovery: !!checked }))
              }
            />
            <Label
              htmlFor="acknowledge-no-recovery"
              className="text-sm leading-5 font-semibold text-red-600"
            >
              I understand this action is permanent and my account cannot be recovered.
            </Label>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.push("/settings")}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => goToStep("options")}
            disabled={!canProceedFromStep("warning")}
            className="flex-1"
          >
            Continue
          </Button>
        </div>
      </div>
    );
  }

  // Step 2: Data Retention Options
  if (state.step === "options") {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <h4 className="font-semibold">Data Retention Options</h4>
          <p className="text-sm text-muted-foreground">
            Choose what happens to your data when your account is deleted.
          </p>

          <RadioGroup
            value={state.eraseData ? "erase" : "keep"}
            onValueChange={(value) => 
              setState(prev => ({ ...prev, eraseData: value === "erase" }))
            }
          >
            <div className="space-y-4">
              <Card className="p-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="keep" id="keep-data" />
                  <Label htmlFor="keep-data" className="font-medium">
                    Keep message history (recommended)
                  </Label>
                </div>
                <div className="ml-6 mt-2 space-y-1 text-sm text-muted-foreground">
                  {deactivationInfo.dataOptions.keepData.details.map((detail, index) => (
                    <div key={index}>• {detail}</div>
                  ))}
                </div>
              </Card>

              <Card className="p-4 border-amber-200 dark:border-amber-800">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="erase" id="erase-data" />
                  <Label htmlFor="erase-data" className="font-medium text-amber-700 dark:text-amber-300">
                    Request data erasure (experimental)
                  </Label>
                </div>
                <div className="ml-6 mt-2 space-y-1 text-sm text-muted-foreground">
                  {deactivationInfo.dataOptions.eraseData.details.map((detail, index) => (
                    <div key={index}>• {detail}</div>
                  ))}
                </div>
              </Card>
            </div>
          </RadioGroup>
        </div>

        <div className="flex items-start space-x-2">
          <Checkbox
            id="acknowledge-data-retention"
            checked={state.acknowledgedDataRetention}
            onCheckedChange={(checked) =>
              setState(prev => ({ ...prev, acknowledgedDataRetention: !!checked }))
            }
          />
          <Label
            htmlFor="acknowledge-data-retention"
            className="text-sm leading-5"
          >
            I understand the data retention implications of my choice and how it affects
            message visibility in rooms and spaces.
          </Label>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => goToStep("warning")}
            className="flex-1"
          >
            Back
          </Button>
          <Button
            variant="destructive"
            onClick={() => goToStep("confirmation")}
            disabled={!canProceedFromStep("options")}
            className="flex-1"
          >
            Continue
          </Button>
        </div>
      </div>
    );
  }

  // Step 3: Identity Confirmation
  if (state.step === "confirmation") {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <h4 className="font-semibold">Confirm Your Identity</h4>
          <p className="text-sm text-muted-foreground">
            To delete your account, please confirm your identity by entering the required information.
          </p>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="confirm-name">
                Type your display name to confirm: <span className="font-semibold">{displayName}</span>
              </Label>
              <Input
                id="confirm-name"
                value={state.confirmationText}
                onChange={(e) => setState(prev => ({ ...prev, confirmationText: e.target.value }))}
                placeholder={displayName}
                className="font-mono"
              />
            </div>

            {profile.email && (
              <div className="space-y-2">
                <Label htmlFor="confirm-email">
                  Type your email to confirm: <span className="font-semibold">{profile.email}</span>
                </Label>
                <Input
                  id="confirm-email"
                  type="email"
                  value={state.emailConfirm}
                  onChange={(e) => setState(prev => ({ ...prev, emailConfirm: e.target.value }))}
                  placeholder={profile.email}
                  className="font-mono"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Enter your account password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={state.showPassword ? "text" : "password"}
                  value={state.password}
                  onChange={(e) => setState(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setState(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                >
                  {state.showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => goToStep("options")}
            className="flex-1"
          >
            Back
          </Button>
          <Button
            variant="destructive"
            onClick={() => goToStep("final")}
            disabled={!canProceedFromStep("confirmation")}
            className="flex-1"
          >
            Continue
          </Button>
        </div>
      </div>
    );
  }

  // Step 4: Final Confirmation
  if (state.step === "final") {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Final Warning:</strong> This is your last chance to cancel.
            Once you click &quot;Delete Account&quot;, the process cannot be stopped or undone.
          </AlertDescription>
        </Alert>

        <Card className="border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="text-red-600">Deletion Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Account:</span>
              <span className="font-mono">{profile.userId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Display Name:</span>
              <span>{displayName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Data Handling:</span>
              <span>{state.eraseData ? "Request erasure" : "Keep message history"}</span>
            </div>
            <Separator />
            <div className="text-xs text-muted-foreground">
              This action will permanently delete your account and cannot be reversed.
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => goToStep("confirmation")}
            className="flex-1"
          >
            Back
          </Button>
          <Button
            variant="destructive"
            onClick={handleAccountDeletion}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting Account...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Processing state
  if (state.step === "processing") {
    return (
      <div className="text-center space-y-4 py-8">
        <Loader2 className="h-12 w-12 animate-spin mx-auto text-red-500" />
        <h4 className="text-lg font-semibold">Deleting Account...</h4>
        <p className="text-muted-foreground">
          Please wait while we process your account deletion.
        </p>
      </div>
    );
  }

  // Completion state
  if (state.step === "complete") {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
          <Check className="h-6 w-6 text-red-600" />
        </div>
        <h4 className="text-lg font-semibold">Account Deleted</h4>
        <p className="text-muted-foreground">
          Your account has been permanently deleted. You will be redirected to the login page shortly.
        </p>
      </div>
    );
  }

  return null;
}