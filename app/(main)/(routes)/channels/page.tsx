import React from "react";
/**
 * Channels root page - redirects to Direct Messages
 * 
 * The /channels route should redirect to /channels/@me which is the 
 * main direct messages page. This ensures compatibility with any
 * navigation that references the root /channels path.
 */

import { redirect } from "next/navigation";

export default function ChannelsPage() {
  // Redirect to the direct messages page
  redirect("/channels/@me");
}

// Export metadata
export const metadata = {
  title: "Channels | Melo",
  description: "Redirecting to your direct messages and channels",
};