"use client";

import { useState, FormEvent, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Lock, Ticket, AlertCircle, Loader2 } from "lucide-react";
import { useMatrixAuth } from "@/components/providers/matrix-auth-provider";

/**
 * Matrix Registration Page
 * 
 * Provides account creation with username/password/email and homeserver selection.
 * Integrates with Matrix authentication context.
 * Supports private mode to restrict registration to a specific homeserver.
 * Supports invite codes for external homeserver users.
 */

// Client-side access control config from environment
// Private mode is DEFAULT - only MELO_PUBLIC_MODE=true disables it
function getClientConfig() {
  const publicMode = process.env.NEXT_PUBLIC_MELO_PUBLIC_MODE === 'true';
  const privateMode = !publicMode; // Private is default
  const allowedHomeserver = process.env.NEXT_PUBLIC_MATRIX_HOMESERVER_URL || 
                            'https://matrix.org';
  return { privateMode, allowedHomeserver, publicMode };
}

// Helper to extract hostname from URL
function getHostname(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

// Check if two homeserver URLs match
function homeserversMatch(url1: string, url2: string): boolean {
  return getHostname(url1) === getHostname(url2);
}

export default function SignUpPage() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useMatrixAuth();
  
  // Get private mode config
  const config = getClientConfig();
  
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    inviteCode: "",
    // In private mode, use the configured homeserver
    homeserver: config.privateMode ? config.allowedHomeserver : "https://matrix.org"
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValidatingInvite, setIsValidatingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteValidated, setInviteValidated] = useState(false);

  // Determine if invite is required based on homeserver
  const isExternalHomeserver = useMemo(() => {
    if (config.publicMode) return false; // No invites needed in public mode
    if (!config.allowedHomeserver) return false;
    return !homeserversMatch(formData.homeserver, config.allowedHomeserver);
  }, [config.publicMode, config.allowedHomeserver, formData.homeserver]);

  // Show invite field when:
  // - NOT in private mode (private mode locks to configured homeserver)
  // - AND using an external homeserver (different from configured)
  const showInviteField = !config.privateMode && isExternalHomeserver;

  // Reset homeserver if config changes
  useEffect(() => {
    if (config.privateMode) {
      setFormData(prev => ({
        ...prev,
        homeserver: config.allowedHomeserver
      }));
    }
  }, [config.privateMode, config.allowedHomeserver]);

  // Reset invite validation when relevant fields change
  useEffect(() => {
    setInviteValidated(false);
    setInviteError(null);
  }, [formData.username, formData.homeserver, formData.inviteCode]);

  // Validate invite code format
  const validateInviteCodeFormat = (code: string): boolean => {
    if (!code) return false;
    // Format: inv_timestamp_random (e.g., inv_1739832456789_abc123def)
    return /^inv_\d+_[a-z0-9]+$/i.test(code);
  };

  // Validate invite code with API
  const validateInviteCode = async (): Promise<boolean> => {
    if (!showInviteField) return true; // No validation needed
    if (!formData.inviteCode) {
      setInviteError("Invite code is required for external homeserver registration");
      return false;
    }

    if (!validateInviteCodeFormat(formData.inviteCode)) {
      setInviteError("Invalid invite code format");
      return false;
    }

    setIsValidatingInvite(true);
    setInviteError(null);

    try {
      const response = await fetch("/api/auth/validate-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteCode: formData.inviteCode,
          username: formData.username,
          homeserverUrl: formData.homeserver
        })
      });

      const result = await response.json();

      if (!result.valid) {
        setInviteError(result.reason || "Invalid invite code");
        return false;
      }

      setInviteValidated(true);
      return true;

    } catch (err) {
      setInviteError("Failed to validate invite code");
      return false;
    } finally {
      setIsValidatingInvite(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError(); // Clear previous errors
    setValidationErrors([]); // Clear validation errors
    setInviteError(null);
    
    // Validate form
    const errors: string[] = [];
    
    if (!formData.username) {
      errors.push("Username is required");
    }
    if (!formData.password) {
      errors.push("Password is required");
    }
    if (formData.password !== formData.confirmPassword) {
      errors.push("Passwords do not match");
    }
    if (formData.password && formData.password.length < 8) {
      errors.push("Password must be at least 8 characters");
    }
    
    // Skip homeserver validation in private mode
    if (!config.privateMode) {
      try {
        new URL(formData.homeserver);
      } catch {
        errors.push("Invalid homeserver URL");
      }
    }
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Validate invite code if required
    if (showInviteField) {
      const inviteValid = await validateInviteCode();
      if (!inviteValid) {
        return;
      }
    }

    // Use configured homeserver in private mode
    const homeserver = config.privateMode ? config.allowedHomeserver : formData.homeserver;

    const success = await register(
      formData.username,
      formData.password,
      formData.email || undefined,
      homeserver
    );

    if (success) {
      // Mark invite as used (best effort, don't block on failure)
      if (showInviteField && formData.inviteCode) {
        try {
          await fetch("/api/auth/use-invite", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              inviteCode: formData.inviteCode,
              username: formData.username,
              homeserverUrl: formData.homeserver
            })
          });
        } catch (err) {
          console.warn("Failed to mark invite as used:", err);
        }
      }
      router.push("/");
    }
  };

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    // Clear validation errors when user starts typing
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };

  // Extract homeserver display name
  const getHomeserverName = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#313338]">
      <div className="bg-[#1e1f22] p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">
          Create Account
        </h1>
        
        {/* Private Server Badge */}
        {config.privateMode && (
          <div 
            className="flex items-center justify-center gap-2 mb-4 p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg"
            data-testid="private-mode-badge"
          >
            <Shield className="h-4 w-4 text-indigo-400" />
            <span className="text-indigo-300 text-sm font-medium">
              Private Server
            </span>
          </div>
        )}

        <p className="text-zinc-400 text-center mb-6">
          {config.privateMode 
            ? `Create an account on ${getHomeserverName(config.allowedHomeserver)}`
            : "Join the Matrix network"
          }
        </p>
        
        {/* Error Display */}
        {error && (
          <div 
            className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4" 
            data-testid="error-message"
          >
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
            {validationErrors.map((validationError, index) => (
              <p key={index} className="text-red-400 text-sm">{validationError}</p>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Homeserver Input - Hidden in Private Mode */}
          {!config.privateMode && (
            <div>
              <label className="block text-zinc-300 text-sm font-medium mb-2">
                Homeserver
              </label>
              <input
                type="url"
                placeholder="https://matrix.org"
                value={formData.homeserver}
                onChange={handleInputChange("homeserver")}
                disabled={isLoading}
                data-testid="homeserver-input"
                className={`w-full p-3 rounded bg-[#383a40] text-white placeholder-zinc-500 border focus:outline-none disabled:opacity-50 ${
                  formData.homeserver ? 'border-zinc-600 focus:border-indigo-500' : 'border-red-500 focus:border-red-500'
                }`}
                required
              />
              {/* External homeserver notice */}
              {isExternalHomeserver && (
                <p className="text-amber-400 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  External homeserver - invite code required
                </p>
              )}
            </div>
          )}

          {/* Private Mode Homeserver Display */}
          {config.privateMode && (
            <div className="flex items-center gap-2 p-3 bg-zinc-700/30 rounded border border-zinc-600/50">
              <Lock className="h-4 w-4 text-zinc-500" />
              <span className="text-zinc-400 text-sm">
                {getHomeserverName(config.allowedHomeserver)}
              </span>
            </div>
          )}

          {/* Invite Code Input - Only shown for external homeserver */}
          {showInviteField && (
            <div>
              <label className="block text-zinc-300 text-sm font-medium mb-2">
                <span className="flex items-center gap-2">
                  <Ticket className="h-4 w-4" />
                  Invite Code
                </span>
              </label>
              <input
                type="text"
                placeholder="inv_..."
                value={formData.inviteCode}
                onChange={handleInputChange("inviteCode")}
                disabled={isLoading || isValidatingInvite}
                data-testid="invite-code-input"
                className={`w-full p-3 rounded bg-[#383a40] text-white placeholder-zinc-500 border focus:outline-none disabled:opacity-50 font-mono text-sm ${
                  inviteError 
                    ? 'border-red-500 focus:border-red-500' 
                    : inviteValidated 
                      ? 'border-green-500 focus:border-green-500' 
                      : formData.inviteCode 
                        ? 'border-zinc-600 focus:border-indigo-500' 
                        : 'border-amber-500 focus:border-amber-500'
                }`}
                required
              />
              {/* Invite validation status */}
              {isValidatingInvite && (
                <p className="text-zinc-400 text-xs mt-1 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Validating invite code...
                </p>
              )}
              {inviteError && (
                <p className="text-red-400 text-xs mt-1 flex items-center gap-1" data-testid="invite-error">
                  <AlertCircle className="h-3 w-3" />
                  {inviteError}
                </p>
              )}
              {inviteValidated && (
                <p className="text-green-400 text-xs mt-1">
                  ✓ Invite code valid
                </p>
              )}
              {!inviteError && !inviteValidated && !isValidatingInvite && (
                <p className="text-zinc-500 text-xs mt-1">
                  Contact a server administrator to receive an invite code
                </p>
              )}
            </div>
          )}

          {/* Username Input */}
          <div>
            <label className="block text-zinc-300 text-sm font-medium mb-2">
              Username
            </label>
            <input
              type="text"
              placeholder="Choose a username"
              value={formData.username}
              onChange={handleInputChange("username")}
              disabled={isLoading}
              data-testid="username-input"
              className={`w-full p-3 rounded bg-[#383a40] text-white placeholder-zinc-500 border focus:outline-none disabled:opacity-50 ${
                formData.username ? 'border-zinc-600 focus:border-indigo-500' : 'border-red-500 focus:border-red-500'
              }`}
              required
            />
            <p className="text-zinc-500 text-xs mt-1">
              Your Matrix ID will be @{formData.username || "username"}:{getHomeserverName(
                config.privateMode ? config.allowedHomeserver : formData.homeserver
              )}
            </p>
          </div>

          {/* Email Input */}
          <div>
            <label className="block text-zinc-300 text-sm font-medium mb-2">
              Email (optional)
            </label>
            <input
              type="email"
              placeholder="your.email@example.com"
              value={formData.email}
              onChange={handleInputChange("email")}
              disabled={isLoading}
              className="w-full p-3 rounded bg-[#383a40] text-white placeholder-zinc-500 border border-zinc-600 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
            />
            <p className="text-zinc-500 text-xs mt-1">
              For account recovery and verification
            </p>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-zinc-300 text-sm font-medium mb-2">
              Password
            </label>
            <input
              type="password"
              placeholder="Create a strong password"
              value={formData.password}
              onChange={handleInputChange("password")}
              disabled={isLoading}
              className={`w-full p-3 rounded bg-[#383a40] text-white placeholder-zinc-500 border focus:outline-none disabled:opacity-50 ${
                formData.password ? 'border-zinc-600 focus:border-indigo-500' : 'border-red-500 focus:border-red-500'
              }`}
              required
              minLength={8}
            />
          </div>

          {/* Confirm Password Input */}
          <div>
            <label className="block text-zinc-300 text-sm font-medium mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleInputChange("confirmPassword")}
              disabled={isLoading}
              className={`w-full p-3 rounded bg-[#383a40] text-white placeholder-zinc-500 border focus:outline-none disabled:opacity-50 ${
                formData.confirmPassword ? 'border-zinc-600 focus:border-indigo-500' : 'border-red-500 focus:border-red-500'
              }`}
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || isValidatingInvite || !formData.username || !formData.password || (showInviteField && !formData.inviteCode)}
            data-testid="signup-button"
            className="w-full p-3 rounded bg-indigo-500 hover:bg-indigo-600 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Creating Account..." : isValidatingInvite ? "Validating..." : "Create Account"}
          </button>
        </form>

        {/* Sign In Link */}
        <div className="mt-6 text-center">
          <p className="text-zinc-400 text-sm">
            Already have an account?{" "}
            <Link
              href="/sign-in"
              className="text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Sign in here
            </Link>
          </p>
        </div>

        {/* Matrix Info */}
        <div className="mt-6 p-3 bg-zinc-700/20 rounded border border-zinc-600/30">
          <p className="text-zinc-400 text-xs text-center">
            {config.privateMode 
              ? "This is a private Melo instance. Only accounts from the configured homeserver can be created."
              : isExternalHomeserver
                ? "You are registering with an external homeserver. An invite code from a server administrator is required."
                : "Creating an account on the Matrix network allows you to communicate securely across any Matrix homeserver. Choose a server you trust or run your own."
            }
          </p>
        </div>
      </div>
    </div>
  );
}
