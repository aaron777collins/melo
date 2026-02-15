/**
 * Settings Overview Page
 * 
 * Default page that shows when accessing /settings
 */

import React from "react";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  // Redirect to profile settings as the default
  redirect("/settings/profile");
}