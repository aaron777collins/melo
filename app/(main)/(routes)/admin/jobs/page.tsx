/**
 * Job Queue Admin Page
 * 
 * Main admin page for the background job queue system.
 */

import React from "react";
import { JobQueueDashboard } from "@/components/admin/job-queue-dashboard";

export default function JobQueueAdminPage() {
  return (
    <div className="h-full">
      <JobQueueDashboard />
    </div>
  );
}

export const metadata = {
  title: "Job Queue Admin - Melo",
  description: "Monitor and manage background jobs",
};