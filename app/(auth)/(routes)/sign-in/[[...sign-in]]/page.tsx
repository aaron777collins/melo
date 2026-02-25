"use client";

import React, { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Lock } from "lucide-react";
import { useMatrixAuth } from "@/components/providers/matrix-auth-provider";
import TwoFactorPrompt from "@/components/auth/two-factor-prompt";

/**
 * Matrix Sign In Page
 * 
 * Provides username/password login with homeserver selection.
 * Integrates with Matrix authentication context and Two-Factor Authentication.
 * Supports private mode to restrict logins to a specific homeserver.
 */

// Client-side access control config from environment
// Private mode is DEFAULT - only MELO_PUBLIC_MODE=true disables it
function getClientConfig() {
  // Robust private mode detection with multiple fallbacks
  let privateMode = true; // Default to private mode
  let allowedHomeserver = 'https://dev2.aaroncollins.info'; // Default to dev2
  
  try {
    // Check Next.js environment variable
    const publicModeEnv = process.env.NEXT_PUBLIC_MELO_PUBLIC_MODE;
    if (publicModeEnv === 'true') {
      privateMode = false;
    }
    
    // Get homeserver from environment
    const homeserverEnv = process.env.NEXT_PUBLIC_MATRIX_HOMESERVER_URL;
    if (homeserverEnv) {
      allowedHomeserver = homeserverEnv;
    }
  } catch (error) {
    // Fallback to defaults if environment access fails
    console.warn('Environment variable access failed, using defaults:', error);
  }
  
  return { privateMode, allowedHomeserver };
}

export default function SignInPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError, complete2FALogin } = useMatrixAuth();
  
  // Get private mode config
  const config = getClientConfig();
  
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    // In private mode, use the configured homeserver
    homeserver: config.privateMode ? config.allowedHomeserver : "https://matrix.org"
  });

  const [showTwoFactorPrompt, setShowTwoFactorPrompt] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});
  const [accessDeniedError, setAccessDeniedError] = useState<string | null>(null);

  // Reset homeserver if config changes
  useEffect(() => {
    if (config.privateMode) {
      setFormData(prev => ({
        ...prev,
        homeserver: config.allowedHomeserver
      }));
    }
  }, [config.privateMode, config.allowedHomeserver]);

  const validateField = (field: string, value: string) => {
    let error = '';
    
    switch (field) {
      case 'username':
        if (!value.trim()) {
          error = 'Username is required';
        }
        break;
      case 'password':
        if (!value.trim()) {
          error = 'Password is required';
        }
        break;
      case 'homeserver':
        // Skip validation in private mode (homeserver is fixed)
        if (config.privateMode) break;
        
        if (!value.trim()) {
          error = 'Homeserver is required';
        } else {
          try {
            new URL(value);
          } catch {
            error = 'Please enter a valid homeserver URL';
          }
        }
        break;
    }
    
    setFieldErrors(prev => ({ ...prev, [field]: error }));
    return !error;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setFieldErrors({});
    setAccessDeniedError(null);
    
    // Validate all fields
    const isUsernameValid = validateField('username', formData.username);
    const isPasswordValid = validateField('password', formData.password);
    const isHomeserverValid = config.privateMode || validateField('homeserver', formData.homeserver);
    
    if (!isUsernameValid || !isPasswordValid || !isHomeserverValid) {
      return;
    }

    // Use configured homeserver in private mode
    const homeserver = config.privateMode ? config.allowedHomeserver : formData.homeserver;

    const result = await login(
      formData.username,
      formData.password,
      homeserver
    );

    if (result === true) {
      router.push("/");
    } else if (result === "2fa_required") {
      setShowTwoFactorPrompt(true);
    }
    // If result is false, error is handled by the auth provider
  };

  const handleTwoFactorSuccess = (session: any, user: any) => {
    complete2FALogin(session, user);
    setShowTwoFactorPrompt(false);
    router.push("/");
  };

  const handleTwoFactorCancel = () => {
    setShowTwoFactorPrompt(false);
    clearError();
  };

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Clear access denied error when user makes changes
    if (accessDeniedError) {
      setAccessDeniedError(null);
    }
  };

  // Show 2FA prompt if required
  if (showTwoFactorPrompt) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#36393f]">
        <TwoFactorPrompt 
          onVerificationSuccess={handleTwoFactorSuccess}
          onCancel={handleTwoFactorCancel}
          loading={isLoading}
        />
      </div>
    );
  }

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
          Welcome to Melo
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
            ? `Sign in to ${getHomeserverName(config.allowedHomeserver)}`
            : "Sign in to your Matrix account"
          }
        </p>
        
        {/* Error Display */}
        {(error || accessDeniedError) && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4" data-testid="error-message">
            <p className="text-red-400 text-sm">{error || accessDeniedError}</p>
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
                className={`w-full p-3 rounded bg-[#40444b] text-white placeholder-zinc-500 border focus:outline-none disabled:opacity-50 ${
                  fieldErrors.homeserver ? 'border-red-500 focus:border-red-500' : 'border-zinc-600 focus:border-indigo-500'
                }`}
              />
              {fieldErrors.homeserver && (
                <p className="text-red-400 text-sm mt-1">{fieldErrors.homeserver}</p>
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

          {/* Username Input */}
          <div>
            <label className="block text-zinc-300 text-sm font-medium mb-2">
              Username
            </label>
            <input
              type="text"
              placeholder={config.privateMode 
                ? "username" 
                : "@user:matrix.org or just username"
              }
              value={formData.username}
              onChange={handleInputChange("username")}
              disabled={isLoading}
              data-testid="username-input"
              className={`w-full p-3 rounded bg-[#40444b] text-white placeholder-zinc-500 border focus:outline-none disabled:opacity-50 ${
                fieldErrors.username ? 'border-red-500 focus:border-red-500' : 'border-zinc-600 focus:border-indigo-500'
              }`}
            />
            {fieldErrors.username && (
              <p className="text-red-400 text-sm mt-1">{fieldErrors.username}</p>
            )}
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-zinc-300 text-sm font-medium mb-2">
              Password
            </label>
            <input
              type="password"
              placeholder="Your password"
              value={formData.password}
              onChange={handleInputChange("password")}
              disabled={isLoading}
              data-testid="password-input"
              className={`w-full p-3 rounded bg-[#40444b] text-white placeholder-zinc-500 border focus:outline-none disabled:opacity-50 ${
                fieldErrors.password ? 'border-red-500 focus:border-red-500' : 'border-zinc-600 focus:border-indigo-500'
              }`}
            />
            {fieldErrors.password && (
              <p className="text-red-400 text-sm mt-1">{fieldErrors.password}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            data-testid="login-button"
            className="w-full p-3 rounded bg-indigo-500 hover:bg-indigo-600 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        {/* Registration Link */}
        <div className="mt-6 text-center">
          <p className="text-zinc-400 text-sm">
            Don&apos;t have an account?{" "}
            <Link
              href="/sign-up"
              className="text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Create one here
            </Link>
          </p>
        </div>

        {/* Info Box */}
        <div className="mt-6 p-3 bg-zinc-700/20 rounded border border-zinc-600/30">
          <p className="text-zinc-400 text-xs text-center">
            {config.privateMode 
              ? "This is a private Melo instance. Only accounts from the configured homeserver can sign in."
              : "Melo uses the Matrix protocol for secure, decentralized communication. Use your existing Matrix account or register on any Matrix homeserver."
            }
          </p>
        </div>
      </div>
    </div>
  );
}
