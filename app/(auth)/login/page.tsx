"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { initializeMatrixClient } from "@/lib/matrix-client";

export default function LoginPage() {
  const [homeserver, setHomeserver] = useState("https://matrix.org");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const client = await initializeMatrixClient(homeserver, username, password);
      
      if (client) {
        // Successful login - redirect to main app
        router.push("/");
      } else {
        setError("Failed to login. Please check your credentials.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Login failed. Please check your credentials and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#313338] flex items-center justify-center">
      <div className="w-full max-w-md bg-[#2b2d31] p-8 rounded-lg shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Welcome Back!</h1>
          <p className="text-[#b5bac1]">We&apos;re so excited to see you again!</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="homeserver" className="block text-[#b5bac1] text-sm font-medium mb-2">
              HOMESERVER <span className="text-red-500">*</span>
            </label>
            <input
              id="homeserver"
              type="url"
              value={homeserver}
              onChange={(e) => setHomeserver(e.target.value)}
              className="w-full px-3 py-2 bg-[#1e1f22] text-white rounded border border-[#404249] focus:border-[#5865f2] focus:outline-none"
              placeholder="https://matrix.org"
              required
            />
          </div>

          <div>
            <label htmlFor="username" className="block text-[#b5bac1] text-sm font-medium mb-2">
              USERNAME <span className="text-red-500">*</span>
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 bg-[#1e1f22] text-white rounded border border-[#404249] focus:border-[#5865f2] focus:outline-none"
              placeholder="@username:matrix.org"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-[#b5bac1] text-sm font-medium mb-2">
              PASSWORD <span className="text-red-500">*</span>
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-[#1e1f22] text-white rounded border border-[#404249] focus:border-[#5865f2] focus:outline-none"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm mt-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#5865f2] hover:bg-[#4752c4] disabled:bg-[#4752c4] disabled:opacity-50 text-white font-medium py-2 rounded transition-colors"
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-[#b5bac1] text-sm">
            Need an account?{" "}
            <a href="/register" className="text-[#00a8fc] hover:underline">
              Register
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}