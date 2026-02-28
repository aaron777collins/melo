"use client";

import React, { useEffect } from "react";
import { useMatrixAuth } from "@/components/providers/matrix-auth-provider";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const { user, isLoading } = useMatrixAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for auth state to be determined
    if (isLoading) return;

    if (user) {
      // User is logged in, redirect to channels
      router.replace("/channels");
    } else {
      // User is not logged in, redirect to sign-in
      router.replace("/sign-in");
    }
  }, [user, isLoading, router]);

  // Show loading screen while checking auth state
  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-900">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-4">MELO V2</h1>
        <p className="text-zinc-400">Loading...</p>
        <a href="/sign-up" className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded mt-4">
          Sign Up
        </a>
      </div>
    </div>
  );
    <div className="flex items-center justify-center min-h-screen bg-zinc-900">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-4">MELO V2</h1>
        <p className="text-zinc-400">Loading...</p>
      </div>
    </div>
  );
}
