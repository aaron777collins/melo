"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMatrixAuth } from "@/components/providers/matrix-auth-provider";

/**
 * Matrix Registration Page
 * 
 * Provides account creation with username/password/email and homeserver selection.
 * Integrates with Matrix authentication context.
 */
export default function SignUpPage() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useMatrixAuth();
  
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    homeserver: "https://matrix.org"
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError(); // Clear previous errors
    setValidationErrors([]); // Clear validation errors
    
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
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    const success = await register(
      formData.username,
      formData.password,
      formData.email || undefined,
      formData.homeserver
    );

    if (success) {
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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#313338]">
      <div className="bg-[#1e1f22] p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">
          Create Account
        </h1>
        <p className="text-zinc-400 text-center mb-6">
          Join the Matrix network
        </p>
        
        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
            {validationErrors.map((error, index) => (
              <p key={index} className="text-red-400 text-sm">{error}</p>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Homeserver Input */}
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
              className="w-full p-3 rounded bg-[#383a40] text-white placeholder-zinc-500 border border-zinc-600 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
              required
            />
          </div>

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
              className="w-full p-3 rounded bg-[#383a40] text-white placeholder-zinc-500 border border-zinc-600 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
              required
            />
            <p className="text-zinc-500 text-xs mt-1">
              Your Matrix ID will be @{formData.username || "username"}:{new URL(formData.homeserver).hostname}
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
              className="w-full p-3 rounded bg-[#383a40] text-white placeholder-zinc-500 border border-zinc-600 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
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
              className="w-full p-3 rounded bg-[#383a40] text-white placeholder-zinc-500 border border-zinc-600 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !formData.username || !formData.password}
            className="w-full p-3 rounded bg-indigo-500 hover:bg-indigo-600 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Creating Account..." : "Create Account"}
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
            Creating an account on the Matrix network allows you to communicate securely 
            across any Matrix homeserver. Choose a server you trust or run your own.
          </p>
        </div>
      </div>
    </div>
  );
}
