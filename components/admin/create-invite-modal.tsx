/**
 * Create Invite Modal Component
 * 
 * Modal for creating new admin invite codes for external users.
 */

"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const inviteFormSchema = z.object({
  userId: z
    .string()
    .min(1, "Matrix user ID is required")
    .regex(
      /^@[^:]+:.+$/,
      "Invalid Matrix user ID format. Expected: @user:homeserver.com"
    ),
  expirationDays: z.string().default("30"),
  customExpirationDate: z.string().optional(),
  notes: z.string().optional(),
});

type InviteFormData = z.infer<typeof inviteFormSchema>;

interface CreateInviteModalProps {
  onInviteCreated?: () => void;
  children?: React.ReactNode;
}

const expirationOptions = [
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
  { value: "custom", label: "Custom date" },
];

export function CreateInviteModal({ onInviteCreated, children }: CreateInviteModalProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState<{ invite: any; isExisting: boolean } | null>(null);
  
  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      userId: "",
      expirationDays: "30",
      customExpirationDate: "",
      notes: "",
    },
  });

  const watchedExpiration = form.watch("expirationDays");
  
  const calculateExpirationDays = (formData: InviteFormData): number | undefined => {
    if (formData.expirationDays === "custom") {
      if (!formData.customExpirationDate) return undefined;
      
      const customDate = new Date(formData.customExpirationDate);
      const now = new Date();
      const diffTime = customDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays > 0 ? diffDays : undefined;
    }
    
    return parseInt(formData.expirationDays);
  };
  
  const resetForm = () => {
    form.reset();
    setSuccess(null);
    form.clearErrors();
  };
  
  const onSubmit = async (data: InviteFormData) => {
    try {
      setCreating(true);
      setSuccess(null);
      
      // Calculate expiration days
      const expirationDays = calculateExpirationDays(data);
      
      // Validate custom date if selected
      if (data.expirationDays === "custom") {
        if (!data.customExpirationDate) {
          form.setError("customExpirationDate", { message: "Custom expiration date is required" });
          return;
        }
        
        const customDate = new Date(data.customExpirationDate);
        const now = new Date();
        
        if (customDate <= now) {
          form.setError("customExpirationDate", { message: "Expiration date must be in the future" });
          return;
        }
      }
      
      const requestBody = {
        userId: data.userId.trim(),
        expirationDays,
        notes: data.notes?.trim() || undefined,
      };
      
      const response = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSuccess({
          invite: result.data.invite,
          isExisting: result.data.isExisting || false,
        });
        // Don't close modal immediately, let user see the success message
      } else {
        form.setError("root", { 
          message: result.error?.message || "Failed to create invite" 
        });
      }
    } catch (error) {
      form.setError("root", { message: "Failed to create invite" });
    } finally {
      setCreating(false);
    }
  };
  
  const handleClose = () => {
    setOpen(false);
    // Reset form after modal closes
    setTimeout(() => {
      resetForm();
    }, 150);
  };
  
  const handleSuccessClose = () => {
    handleClose();
    onInviteCreated?.(); // Trigger refresh of invite list
  };
  
  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (newOpen) {
        setOpen(true);
      } else {
        handleClose();
      }
    }}>
      <DialogTrigger asChild>
        {children || (
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Invite
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Invite Code</DialogTitle>
          <DialogDescription>
            Generate an invite code for an external user to join the server.
          </DialogDescription>
        </DialogHeader>
        
        {success ? (
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                {success.isExisting 
                  ? "Invite already exists for this user and is still active!"
                  : "Invite code created successfully!"
                }
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">User ID:</p>
                <p className="text-sm text-muted-foreground font-mono">
                  {success.invite.invitedUserId}
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium">Invite Code:</p>
                <p className="text-sm text-muted-foreground font-mono bg-muted p-2 rounded">
                  {success.invite.id}
                </p>
              </div>
              
              {success.invite.expiresAt && (
                <div>
                  <p className="text-sm font-medium">Expires:</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(success.invite.expiresAt).toLocaleString()}
                  </p>
                </div>
              )}
              
              {success.invite.notes && (
                <div>
                  <p className="text-sm font-medium">Notes:</p>
                  <p className="text-sm text-muted-foreground">
                    {success.invite.notes}
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button onClick={handleSuccessClose} className="w-full">
                Done
              </Button>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Matrix User ID</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="@user:homeserver.com" 
                        {...field}
                        disabled={creating}
                      />
                    </FormControl>
                    <FormDescription>
                      The full Matrix user ID of the person to invite.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="expirationDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expires In</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value} disabled={creating}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select expiration" />
                        </SelectTrigger>
                        <SelectContent>
                          {expirationOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription>
                      How long the invite code will remain valid.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {watchedExpiration === "custom" && (
                <FormField
                  control={form.control}
                  name="customExpirationDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Expiration Date</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          disabled={creating}
                          min={new Date(Date.now() + 60000).toISOString().slice(0, 16)} // Minimum 1 minute from now
                        />
                      </FormControl>
                      <FormDescription>
                        Select a specific date and time for expiration.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Optional notes about this invite..."
                        className="min-h-[80px]"
                        {...field}
                        disabled={creating}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional notes for tracking or reference.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {form.formState.errors.root && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {form.formState.errors.root.message}
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {creating ? "Creating..." : "Create Invite"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}