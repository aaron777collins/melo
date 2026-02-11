"use client";

/**
 * Sign Up Page
 * 
 * TODO: Implement Matrix registration
 * - Username/password
 * - Email verification
 * - Homeserver selection
 */

export default function SignUpPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#313338]">
      <div className="bg-[#1e1f22] p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">
          Create Account
        </h1>
        <p className="text-zinc-400 text-center mb-6">
          Matrix registration coming soon
        </p>
        {/* TODO: Add Matrix registration form */}
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            disabled
            className="w-full p-3 rounded bg-[#383a40] text-white placeholder-zinc-500"
          />
          <input
            type="email"
            placeholder="Email"
            disabled
            className="w-full p-3 rounded bg-[#383a40] text-white placeholder-zinc-500"
          />
          <input
            type="password"
            placeholder="Password"
            disabled
            className="w-full p-3 rounded bg-[#383a40] text-white placeholder-zinc-500"
          />
          <button
            disabled
            className="w-full p-3 rounded bg-indigo-500 text-white font-medium opacity-50 cursor-not-allowed"
          >
            Sign Up (Coming Soon)
          </button>
        </div>
      </div>
    </div>
  );
}
