import React from "react";
import { redirect } from "next/navigation";

import { InitialModal } from "@/components/modals/initial-modal";
import { validateCurrentSession } from "@/lib/matrix/actions/auth";

export default async function SetupPage() {
  // Validate Matrix session
  const result = await validateCurrentSession();

  // If no session, redirect to sign-in
  if (!result.success || !result.data) {
    return redirect("/sign-in");
  }

  // Show the initial modal for server creation
  // The modal itself handles checking for existing spaces and navigation
  return <InitialModal />;
}
