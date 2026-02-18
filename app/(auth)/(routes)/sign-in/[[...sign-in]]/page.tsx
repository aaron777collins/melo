"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { initializeMatrixClient } from "@/lib/matrix-client";

export default function Page() {
  const [homeserver, setHomeserver] = useState("https://matrix.org");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const client = await initializeMatrixClient(homeserver, username, password);
      if (client) {
        router.push("/");
      } else {
        setError("Failed to sign in");
      }
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center">
      <div className="bg-white dark:bg-[#313338] p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-white">
          Welcome back!
        </h1>
        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Homeserver
            </label>
            <input
              type="url"
              value={homeserver}
              onChange={(e) => setHomeserver(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-[#1e1f22] dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-[#1e1f22] dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-[#1e1f22] dark:text-white"
              required
            />
          </div>
          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white font-medium py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
