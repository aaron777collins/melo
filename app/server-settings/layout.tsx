/**
 * Server Settings Layout
 * 
 * Layout wrapper for the server settings page.
 * Provides consistent structure and styling.
 */

import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Server Settings | Melo",
  description: "Manage your server settings, name, description, and avatar.",
};

interface ServerSettingsLayoutProps {
  children: React.ReactNode;
}

export default function ServerSettingsLayout({ children }: ServerSettingsLayoutProps) {
  return (
    <div className="min-h-screen bg-[#313338] text-white">
      {children}
    </div>
  );
}
