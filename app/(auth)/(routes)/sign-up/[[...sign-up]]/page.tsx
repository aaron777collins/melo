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

// Client-side access control config from environment
function getClientConfig() {
  const publicMode = process.env.NEXT_PUBLIC_MELO_PUBLIC_MODE === 'true';
  const privateMode = !publicMode;
  let allowedHomeserver = process.env.NEXT_PUBLIC_MATRIX_HOMESERVER_URL || 
                         'https://matrix.org';
  
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
    let safetyTimeout: NodeJS.Timeout;
    
    if (isLoading) {
      safetyTimeout = setTimeout(() => {
        console.warn('[SignUpPage] ⚠️ Auth loading state stuck, overriding...');
        setLoadingOverride(true);
      }, 12000);
    } else {
      setLoadingOverride(false);
    }
    
    return () => {
      if (safetyTimeout) {
        clearTimeout(safetyTimeout);
      }
    };
  }, [isLoading]);
  
  const effectiveIsLoading = isLoading && !loadingOverride;
  const config = getClientConfig();
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
  const formData = form.watch() || {};

  const [isValidatingInvite, setIsValidatingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteValidated, setInviteValidated] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);

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

  const validateForm = () => {
    const errors: Partial<Record<keyof typeof formData, string>> = {};
    
    // Username validation
    if (!formData.username) {
      errors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.username = 'Username can only contain letters, numbers, and underscores';
    }

    // Email validation (optional)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(formData.password)) {
      errors.password = 'Password must contain at least one uppercase letter';
    } else if (!/[a-z]/.test(formData.password)) {
      errors.password = 'Password must contain at least one lowercase letter';
    } else if (!/[0-9]/.test(formData.password)) {
      errors.password = 'Password must contain at least one number';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords don\'t match';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

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

  // AC-5: Clear errors and suggestions when username changes
  useEffect(() => {
    const username = formData?.username || '';
    if (username && username !== lastSubmittedUsername) {
      // Clear registration errors when user changes username after a conflict
      clearError();
      setUsernameSuggestions([]);
    }
  }, [formData?.username, lastSubmittedUsername, clearError]);

  // Effects
  useEffect(() => {
    const password = formData?.password || '';
    if (password) {
      setPasswordStrength(calculatePasswordStrength(password));
    } else {
      setPasswordStrength(null);
    }
  }, [formData?.password]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const username = formData?.username || '';
      const usernameFieldError = form.formState.errors.username;
      if (username && !usernameFieldError) {
        checkUsernameAvailability(username);
      } else {
        setUsernameAvailable(null);
        setUsernameError(null);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData?.username, form.formState.errors.username]);

  const passwordsMatch = formData?.password && formData?.confirmPassword && 
                        formData.password === formData.confirmPassword;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    clearError();
    setInviteError(null);

    if (!validateForm()) {
      return;
    }

    if (usernameAvailable === false || usernameError) {
      return;
    }

    const homeserver = config.privateMode ? config.allowedHomeserver : formData.homeserver;

    const success = await register(
      formData.username,
      formData.password,
      formData.email || undefined,
      homeserver
    );

    if (success) {
      router.push("/");
    }
  };

  const isFormValid = form.formState.isValid && 
                     (!showInviteField || inviteValidated) &&
                     (usernameAvailable !== false) &&
                     (!isCheckingUsername);

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
        
        {error && (
          <div 
            className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4" 
            data-testid="error-message"
            role="alert"
            aria-live="polite"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-400 text-sm">{error}</p>
                
                {/* AC-5: Show username suggestions if available */}
                {usernameSuggestions.length > 0 && lastSubmittedUsername && (
                  <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded">
                    <p className="text-blue-300 text-xs font-medium mb-1">
                      Suggested alternatives:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {usernameSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            form.setValue('username', suggestion);
                            setUsernameSuggestions([]);
                            clearError();
                          }}
                          className="px-2 py-1 text-xs bg-blue-500/20 hover:bg-blue-500/30 
                                   text-blue-300 rounded border border-blue-500/30 
                                   hover:border-blue-500/50 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
                    : formData?.username 
                      ? 'border-zinc-600 focus:border-indigo-500' 
                      : 'border-zinc-600 focus:border-indigo-500'
              }`}
              required
            />
            
            {form.formState.errors.username && (
              <p id="username-error" className="text-red-400 text-xs mt-1 flex items-center gap-1" aria-live="polite">
                <AlertCircle className="h-3 w-3" />
                {form.formState.errors.username.message}
              </p>
            )}
            
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
                  <p className="text-red-400 text-xs flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {usernameError}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Email Input */}
          <div>
            <label className="block text-zinc-300 text-sm font-medium mb-2">
              Email (optional)
            </label>
            <input
              type="email"
              name="email"
              placeholder="your.email@example.com"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              disabled={effectiveIsLoading}
              className={`w-full p-3 rounded bg-[#40444b] text-white placeholder-zinc-500 border focus:outline-none disabled:opacity-50 ${
                formErrors.email
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-zinc-600 focus:border-indigo-500'
              }`}
            />
            {formErrors.email && (
              <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {formErrors.email}
              </p>
            )}
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-zinc-300 text-sm font-medium mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              placeholder="Create a strong password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              disabled={effectiveIsLoading}
              data-testid="password-input"
              className={`w-full p-3 rounded bg-[#40444b] text-white placeholder-zinc-500 border focus:outline-none disabled:opacity-50 ${
                formErrors.password
                  ? 'border-red-500 focus:border-red-500'
                  : formData.password 
                    ? 'border-zinc-600 focus:border-indigo-500' 
                    : 'border-zinc-600 focus:border-indigo-500'
              }`}
              required
            />
            
            {passwordStrength && (
              <div className="mt-2">
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
              </div>
            )}
            
            {formErrors.password && (
              <div className="text-red-400 text-xs mt-1">
                <div className="flex items-center gap-1 mb-1">
                  <AlertCircle className="h-3 w-3" />
                  Password requirements:
                </div>
                <ul className="ml-4 space-y-1">
                  <li>• {formErrors.password}</li>
                </ul>
              </div>
            )}
          </div>

          {/* Confirm Password Input */}
          <div>
            <label className="block text-zinc-300 text-sm font-medium mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              disabled={effectiveIsLoading}
              className={`w-full p-3 rounded bg-[#40444b] text-white placeholder-zinc-500 border focus:outline-none disabled:opacity-50 ${
                formErrors.confirmPassword
                  ? 'border-red-500 focus:border-red-500'
                  : passwordsMatch
                    ? 'border-green-500 focus:border-green-500'
                    : formData.confirmPassword 
                      ? 'border-zinc-600 focus:border-indigo-500' 
                      : 'border-zinc-600 focus:border-indigo-500'
              }`}
              required
            />
            
            {passwordsMatch && !formErrors.confirmPassword && (
              <div data-testid="password-match-indicator" className="text-green-400 text-xs mt-1 flex items-center gap-1">
                ✓ Passwords match
              </div>
            )}
            
            {formErrors.confirmPassword && (
              <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {formErrors.confirmPassword}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isFormValid || effectiveIsLoading}
            data-testid="signup-button"
            className="w-full p-3 rounded bg-indigo-500 hover:bg-indigo-600 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {effectiveIsLoading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

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
      </div>
    </div>
  );
}