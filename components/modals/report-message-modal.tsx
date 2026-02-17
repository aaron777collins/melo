"use client";

import React, { useState } from "react";
import { Flag, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useModal } from "@/hooks/use-modal-store";
import { useMatrixClient } from "@/hooks/use-matrix-client";

/**
 * Modal for reporting messages to server moderators
 */
export function ReportMessageModal() {
  const { isOpen, onClose, type, data } = useModal();
  const { client } = useMatrixClient();
  
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  
  const isModalOpen = isOpen && type === "reportMessage";
  const { eventId, roomId, senderId } = data;
  
  /**
   * Submit the report
   */
  const handleSubmit = async () => {
    if (!client || !eventId || !roomId || !reason.trim()) return;
    
    setLoading(true);
    try {
      // Submit report via API
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId,
          roomId,
          senderId,
          reason: reason.trim(),
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit report');
      }
      
      // Show success message to user
      console.log('Report submitted successfully:', result.reportId);
      
      toast.success("Report submitted successfully", {
        description: "Moderators have been notified and will review your report.",
        icon: <CheckCircle2 className="h-4 w-4" />
      });
      
      onClose();
      setReason("");
    } catch (error) {
      console.error("Failed to report message:", error);
      
      // Show error message to user
      toast.error("Failed to submit report", {
        description: error instanceof Error ? error.message : "Please try again later."
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleClose = () => {
    setReason("");
    onClose();
  };
  
  if (!isModalOpen) return null;
  
  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-red-500" />
            <DialogTitle>Report Message</DialogTitle>
          </div>
          <DialogDescription>
            Report this message to the server moderators. Please provide a reason for your report.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {senderId && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-700 dark:text-red-300">
                  Reporting message from: {senderId}
                </span>
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for reporting</Label>
            <Textarea
              id="reason"
              placeholder="Please describe why you're reporting this message..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !reason.trim()}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? "Reporting..." : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}