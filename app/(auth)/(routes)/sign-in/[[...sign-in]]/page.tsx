"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMatrixAuth } from "@/components/providers/matrix-auth-provider";

/**
 * Matrix Sign In Page
 * 
 * Provides username/password login with homeserver selection.
 * Integrates with Matrix authentication context.
 */
export default function SignInPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useMatrixAuth();
  
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    homeserver: "https://matrix.org"
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError(); // Clear previous errors
    
    if (!formData.username || !formData.password) {
      return;
    }

    const success = await login(
      formData.username,
      formData.password,
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
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#313338]">
      <div className="bg-[#1e1f22] p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">
          Welcome to HAOS
        </h1>
        <p className="text-zinc-400 text-center mb-6">
          Sign in to your Matrix account
        </p>
        
        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
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
              placeholder="@user:matrix.org or just username"
              value={formData.username}
              onChange={handleInputChange("username")}
              disabled={isLoading}
              className="w-full p-3 rounded bg-[#383a40] text-white placeholder-zinc-500 border border-zinc-600 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
              required
            />
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

        {/* Matrix Info */}
        <div className="mt-6 p-3 bg-zinc-700/20 rounded border border-zinc-600/30">
          <p className="text-zinc-400 text-xs text-center">
            HAOS uses the Matrix protocol for secure, decentralized communication.
            Use your existing Matrix account or register on any Matrix homeserver.
          </p>
        </div>
      </div>
    </div>
  );
}
