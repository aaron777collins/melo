/**
 * Admin Invites Page
 * 
 * Main admin page for managing invite codes for external users.
 */

import { AdminInvitesDashboard } from "@/components/admin/admin-invites-dashboard";

export default function AdminInvitesPage() {
  return (
    <div className="h-full">
      <AdminInvitesDashboard />
    </div>
  );
}

export const metadata = {
  title: "Admin Invites - Melo",
  description: "Manage invite codes for external users",
};