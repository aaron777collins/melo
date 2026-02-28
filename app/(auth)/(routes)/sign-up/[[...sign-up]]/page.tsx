"use client";

import React from "react";
import { useState, FormEvent, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Lock, Ticket, AlertCircle, Loader2 } from "lucide-react";
import { useMatrixAuth } from "@/components/providers/matrix-auth-provider";
import { HomeserverToggle } from "@/components/auth/homeserver-toggle";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// Registration form validation schema with enhanced validation
const registrationSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string().refine((email) => !email || z.string().email().safeParse(email).success, {
    message: "Please enter a valid email address"
  }),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
  homeserver: z.string().url("Invalid homeserver URL"),
  inviteCode: z.string().optional()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

type RegistrationFormValues = z.infer<typeof registrationSchema>;

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
  let allowedHomeserver = process.env.NEXT_PUBLIC_MATRIX_HOMESERVER_URL || 
                         'https://matrix.org';
  
  // Add validation for homeserver URL
  try {
    new URL(allowedHomeserver);
  } catch {
    console.warn(`[SignUpPage] Invalid homeserver URL: ${allowedHomeserver}. Falling back to default.`);
    allowedHomeserver = 'https://matrix.org';
  }
  
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
  
  // EMERGENCY FIX for ST-P2-01-D: Prevent stuck loading state
  const [loadingOverride, setLoadingOverride] = useState(false);
  
  useEffect(() => {
    // Safety mechanism: if loading state is stuck for too long, override it
    let safetyTimeout: NodeJS.Timeout;
    
    if (isLoading) {
      safetyTimeout = setTimeout(() => {
        console.warn('[SignUpPage] ⚠️ Auth loading state stuck, overriding...');
        setLoadingOverride(true);
      }, 12000); // 12 seconds - within the auth provider's timeout
    } else {
      setLoadingOverride(false);
    }
    
    return () => {
      if (safetyTimeout) {
        clearTimeout(safetyTimeout);
      }
    };
  }, [isLoading]);
  
  // Use override when loading is stuck
  const effectiveIsLoading = isLoading && !loadingOverride;
  
  // Get private mode config
  const config = getClientConfig();
  
  // Add state for matrix.org toggle 
  const [useMatrixOrgHomeserver, setUseMatrixOrgHomeserver] = useState(false);

  // React Hook Form setup with Zod validation
  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    mode: "onChange", // Enable real-time validation
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      inviteCode: "",
      // In private mode, use the configured homeserver
      homeserver: config.privateMode ? config.allowedHomeserver : "https://matrix.org"
    }
  });

  // Watch form values for reactive updates
  const formData = form.watch();
  const [isValidatingInvite, setIsValidatingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteValidated, setInviteValidated] = useState(false);
  
  // Username availability checking
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  
  // Password strength state
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);

  // Helper function to calculate password strength
  const calculatePasswordStrength = (password: string): 'weak' | 'medium' | 'strong' => {
    let score = 0;
    
    if (password.length >= 8) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
    
    if (score <= 2) return 'weak';
    if (score <= 4) return 'medium';
    return 'strong';
  };

  // Debounced username availability check
  const checkUsernameAvailability = async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      setUsernameError(null);
      return;
    }

    setIsCheckingUsername(true);
    setUsernameError(null);

    try {
      const response = await fetch('/api/auth/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });

      const result = await response.json();

      if (result.available) {
        setUsernameAvailable(true);
        setUsernameError(null);
      } else {
        setUsernameAvailable(false);
        setUsernameError(result.reason || 'Username already taken');
      }
    } catch (err) {
      setUsernameError('Failed to check username availability');
      setUsernameAvailable(null);
    } finally {
      setIsCheckingUsername(false);
    }
  };

  // Real-time validation effects
  useEffect(() => {
    const password = formData.password;
    if (password) {
      setPasswordStrength(calculatePasswordStrength(password));
    } else {
      setPasswordStrength(null);
    }
  }, [formData.password]);

  // Debounce username availability check
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.username && !form.formState.errors.username) {
        checkUsernameAvailability(formData.username);
      } else {
        setUsernameAvailable(null);
        setUsernameError(null);
      }
    }, 500); // 500ms delay

    return () => clearTimeout(timeoutId);
  }, [formData.username, form.formState.errors.username]);

  // Check if passwords match
  const passwordsMatch = formData.password && formData.confirmPassword && 
                        formData.password === formData.confirmPassword;

  // Update homeserver and invite fields when toggle is used
  useEffect(() => {
    // If toggle is on, switch to matrix.org and reset invite code
    if (useMatrixOrgHomeserver) {
      form.setValue("homeserver", "https://matrix.org");
      form.setValue("inviteCode", ""); // Clear invite code when switching
    } else {
      // If in private mode, use the configured homeserver
      // Otherwise, reset to previous non-matrix.org homeserver 
      const currentHomeserver = form.getValues("homeserver");
      form.setValue("homeserver", config.privateMode ? config.allowedHomeserver : currentHomeserver === "https://matrix.org" ? "" : currentHomeserver);
      form.setValue("inviteCode", ""); // Clear invite code to be safe
    }
    // Reset invite validation when toggle changes
    setInviteValidated(false);
    setInviteError(null);
  }, [useMatrixOrgHomeserver, config.privateMode, config.allowedHomeserver, form]);

  // Determine if invite is required based on homeserver
  const isExternalHomeserver = useMemo(() => {
    if (config.publicMode) return false; // No invites needed in public mode
    if (!config.allowedHomeserver) return false;
    
    // If using matrix.org, it's considered external if configured homeserver is different
    const homeserverToCheck = useMatrixOrgHomeserver 
      ? "https://matrix.org"
      : formData.homeserver;
    
    return !homeserversMatch(homeserverToCheck, config.allowedHomeserver);
  }, [config.publicMode, config.allowedHomeserver, formData.homeserver, useMatrixOrgHomeserver]);

  // Show invite field when:
  // - NOT in private mode (private mode locks to configured homeserver)
  // - AND using an external homeserver (different from configured)
  const showInviteField = !config.privateMode && isExternalHomeserver;

  // Reset homeserver if config changes
  useEffect(() => {
    if (config.privateMode) {
      form.setValue("homeserver", config.allowedHomeserver);
    }
  }, [config.privateMode, config.allowedHomeserver, form]);

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

  const handleSubmit = async (values: RegistrationFormValues) => {
    clearError(); // Clear previous errors
    setInviteError(null);

    // Enhanced validation before submission
    if (!values.username || !values.password || !values.confirmPassword) {
      return; // React Hook Form will handle the validation messages
    }

    // Check if username is available (if not already checked)
    if (usernameAvailable === false || usernameError) {
      return; // Don't submit if username is not available
    }

    // Validate invite code if required
    if (showInviteField) {
      const inviteValid = await validateInviteCode();
      if (!inviteValid) {
        return;
      }
    }

    // Use configured homeserver in private mode
    const homeserver = config.privateMode ? config.allowedHomeserver : values.homeserver;

    const success = await register(
      values.username,
      values.password,
      values.email || undefined,
      homeserver
    );

    if (success) {
      // Mark invite as used (best effort, don't block on failure)
      if (showInviteField && values.inviteCode) {
        try {
          await fetch("/api/auth/use-invite", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              inviteCode: values.inviteCode,
              username: values.username,
              homeserverUrl: values.homeserver
            })
          });
        } catch (err) {
          console.warn("Failed to mark invite as used:", err);
        }
      }
      router.push("/");
    }
  };

  // Form validation state
  const isFormValid = form.formState.isValid && 
                     (!showInviteField || inviteValidated) &&
                     (usernameAvailable !== false) &&
                     (!isCheckingUsername);

  // Extract homeserver display name
  const getHomeserverName = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#36393f]">
      <div className="bg-[#2f3136] p-8 rounded-lg shadow-lg max-w-md w-full">
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

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Homeserver Toggle & Input - Hidden in Private Mode */}
          {!config.privateMode && (
            <div className="space-y-3">
              {/* Matrix.org Quick Toggle */}
              <div className="flex items-center justify-between p-3 bg-zinc-700/30 rounded border border-zinc-600/50">
                <label className="text-zinc-300 text-sm font-medium flex items-center gap-2">
                  <span>Use matrix.org instead</span>
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={useMatrixOrgHomeserver}
                    onChange={(e) => setUseMatrixOrgHomeserver(e.target.checked)}
                    disabled={effectiveIsLoading}
                    data-testid="matrix-org-toggle"
                    className="sr-only peer"
                  />
                  <div className={`w-11 h-6 rounded-full transition-colors
                    ${useMatrixOrgHomeserver 
                      ? 'bg-indigo-500 peer-focus:ring-2 peer-focus:ring-indigo-300' 
                      : 'bg-zinc-600 peer-focus:ring-2 peer-focus:ring-zinc-500'}
                    after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                    after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all
                    ${useMatrixOrgHomeserver ? 'after:translate-x-full' : ''}`}>
                  </div>
                </label>
              </div>

              {/* Homeserver Toggle */}
              <HomeserverToggle 
                configuredHomeserver={config.allowedHomeserver} 
                onHomeserverChange={(homeserver) => {
                  // Only allow changing if matrix.org toggle is off
                  if (!useMatrixOrgHomeserver) {
                    form.setValue("homeserver", homeserver);
                    form.setValue("inviteCode", ""); // Reset invite code when homeserver changes
                  }
                }}
                disabled={effectiveIsLoading || useMatrixOrgHomeserver}
              />

              {/* Homeserver Input */}
              <div>
                <label className="block text-zinc-300 text-sm font-medium mb-2">
                  Homeserver
                </label>
                <input
                  type="url"
                  placeholder="https://matrix.org"
                  {...form.register("homeserver")}
                  disabled={effectiveIsLoading || useMatrixOrgHomeserver}
                  data-testid="homeserver-input"
                  className={`w-full p-3 rounded bg-[#40444b] text-white placeholder-zinc-500 border focus:outline-none disabled:opacity-50 ${
                    useMatrixOrgHomeserver 
                      ? 'border-indigo-500/50 bg-zinc-700/50 text-zinc-500 cursor-not-allowed'
                      : form.formState.errors.homeserver
                        ? 'border-red-500 focus:border-red-500'
                        : formData.homeserver 
                          ? 'border-zinc-600 focus:border-indigo-500' 
                          : 'border-red-500 focus:border-red-500'
                  }`}
                  required
                />
                {form.formState.errors.homeserver && (
                  <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {form.formState.errors.homeserver.message}
                  </p>
                )}
                {/* External homeserver notice */}
                {isExternalHomeserver && (
                  <p className="text-amber-400 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    External homeserver - invite code required
                  </p>
                )}
              </div>
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
                {...form.register("inviteCode")}
                disabled={effectiveIsLoading || isValidatingInvite}
                data-testid="invite-code-input"
                className={`w-full p-3 rounded bg-[#40444b] text-white placeholder-zinc-500 border focus:outline-none disabled:opacity-50 font-mono text-sm ${
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
              {...form.register("username")}
              disabled={effectiveIsLoading}
              data-testid="username-input"
              aria-describedby="username-error username-availability"
              className={`w-full p-3 rounded bg-[#40444b] text-white placeholder-zinc-500 border focus:outline-none disabled:opacity-50 ${
                form.formState.errors.username || usernameError
                  ? 'border-red-500 focus:border-red-500'
                  : usernameAvailable === true
                    ? 'border-green-500 focus:border-green-500'
                    : formData.username 
                      ? 'border-zinc-600 focus:border-indigo-500' 
                      : 'border-zinc-600 focus:border-indigo-500'
              }`}
              required
            />
            
            {/* Username validation errors */}
            {form.formState.errors.username && (
              <p id="username-error" className="text-red-400 text-xs mt-1 flex items-center gap-1" aria-live="polite">
                <AlertCircle className="h-3 w-3" />
                {form.formState.errors.username.message}
              </p>
            )}
            
            {/* Username availability feedback */}
            {!form.formState.errors.username && (
              <div id="username-availability" className="mt-1">
                {isCheckingUsername && (
                  <div data-testid="username-checking-indicator" className="text-zinc-400 text-xs flex items-center gap-1" aria-live="polite">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Checking availability...
                  </div>
                )}
                
                {usernameAvailable === true && !isCheckingUsername && (
                  <div data-testid="username-availability-indicator" className="text-green-400 text-xs flex items-center gap-1" aria-live="polite">
                    ✓ Username available
                  </div>
                )}
                
                {usernameError && !isCheckingUsername && (
                  <p className="text-red-400 text-xs flex items-center gap-1" aria-live="polite">
                    <AlertCircle className="h-3 w-3" />
                    {usernameError}
                  </p>
                )}
              </div>
            )}
            
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
              {...form.register("email")}
              disabled={effectiveIsLoading}
              className={`w-full p-3 rounded bg-[#40444b] text-white placeholder-zinc-500 border focus:outline-none disabled:opacity-50 ${
                form.formState.errors.email
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-zinc-600 focus:border-indigo-500'
              }`}
            />
            {form.formState.errors.email && (
              <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {form.formState.errors.email.message}
              </p>
            )}
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
              {...form.register("password")}
              disabled={effectiveIsLoading}
              data-testid="password-input"
              aria-describedby="password-error password-strength"
              className={`w-full p-3 rounded bg-[#40444b] text-white placeholder-zinc-500 border focus:outline-none disabled:opacity-50 ${
                form.formState.errors.password
                  ? 'border-red-500 focus:border-red-500'
                  : formData.password 
                    ? 'border-zinc-600 focus:border-indigo-500' 
                    : 'border-zinc-600 focus:border-indigo-500'
              }`}
              required
              minLength={8}
            />
            
            {/* Password strength indicator */}
            {passwordStrength && (
              <div id="password-strength" className="mt-2">
                <div data-testid="password-strength-indicator" className="flex items-center gap-2">
                  <span className="text-zinc-300 text-xs">Strength:</span>
                  <span className={`text-xs font-medium ${
                    passwordStrength === 'weak' ? 'text-red-400' :
                    passwordStrength === 'medium' ? 'text-yellow-400' :
                    'text-green-400'
                  }`}>
                    {passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)}
                  </span>
                </div>
                <div className="mt-1 w-full bg-zinc-600 rounded-full h-1">
                  <div 
                    data-testid="password-strength-bar"
                    className={`h-1 rounded-full transition-all duration-300 ${
                      passwordStrength === 'weak' ? 'w-1/3 bg-red-400 strength-weak' :
                      passwordStrength === 'medium' ? 'w-2/3 bg-yellow-400 strength-medium' :
                      'w-full bg-green-400 strength-strong'
                    }`}
                  />
                </div>
              </div>
            )}
            
            {form.formState.errors.password && (
              <div id="password-error" className="text-red-400 text-xs mt-1" aria-live="polite">
                <div className="flex items-center gap-1 mb-1">
                  <AlertCircle className="h-3 w-3" />
                  Password requirements:
                </div>
                <ul className="ml-4 space-y-1">
                  <li>• {form.formState.errors.password.message}</li>
                </ul>
              </div>
            )}
          </div>

          {/* Confirm Password Input */}
          <div>
            <label htmlFor="confirmPassword" className="block text-zinc-300 text-sm font-medium mb-2">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              {...form.register("confirmPassword")}
              disabled={effectiveIsLoading}
              aria-describedby="confirm-password-error confirm-password-match"
              className={`w-full p-3 rounded bg-[#40444b] text-white placeholder-zinc-500 border focus:outline-none disabled:opacity-50 ${
                form.formState.errors.confirmPassword
                  ? 'border-red-500 focus:border-red-500'
                  : passwordsMatch
                    ? 'border-green-500 focus:border-green-500'
                    : formData.confirmPassword 
                      ? 'border-zinc-600 focus:border-indigo-500' 
                      : 'border-zinc-600 focus:border-indigo-500'
              }`}
              required
            />
            
            {/* Password match indicator */}
            {passwordsMatch && !form.formState.errors.confirmPassword && (
              <div id="confirm-password-match" data-testid="password-match-indicator" className="text-green-400 text-xs mt-1 flex items-center gap-1" aria-live="polite">
                ✓ Passwords match
              </div>
            )}
            
            {form.formState.errors.confirmPassword && (
              <p id="confirm-password-error" className="text-red-400 text-xs mt-1 flex items-center gap-1" aria-live="polite">
                <AlertCircle className="h-3 w-3" />
                {form.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isFormValid || effectiveIsLoading || isValidatingInvite || isCheckingUsername}
            data-testid="signup-button"
            className="w-full p-3 rounded bg-indigo-500 hover:bg-indigo-600 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {effectiveIsLoading 
              ? "Creating Account..." 
              : isValidatingInvite 
                ? "Validating..." 
                : isCheckingUsername 
                  ? "Checking username..."
                  : "Create Account"
            }
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
