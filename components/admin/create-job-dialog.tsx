/**
 * Create Job Dialog Component
 * 
 * Dialog for manually creating new background jobs.
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const jobFormSchema = z.object({
  type: z.string().min(1, "Job type is required"),
  payload: z.string().min(1, "Payload is required"),
  priority: z.number().int().min(0).max(100).default(0),
  maxAttempts: z.number().int().min(1).max(10).default(3),
  scheduledAt: z.string().optional(),
  tags: z.array(z.string()).default([]),
  createdBy: z.string().optional(),
});

type JobFormData = z.infer<typeof jobFormSchema>;

interface CreateJobDialogProps {
  onJobCreated?: () => void;
}

const commonJobTypes = [
  "email:send",
  "email:batch",
  "email:digest",
  "file:process-upload",
  "file:generate-thumbnails",
  "notification:push",
  "notification:batch",
  "matrix:room-cleanup",
  "matrix:user-export",
  "cleanup:old-files",
  "cleanup:expired-invites",
];

const jobTemplates = {
  "email:send": {
    payload: {
      to: "user@example.com",
      subject: "Test Email",
      html: "<p>Hello, this is a test email!</p>",
      text: "Hello, this is a test email!",
    },
  },
  "email:batch": {
    payload: {
      emails: [
        {
          to: "user1@example.com",
          subject: "Batch Email 1",
          text: "Hello from batch email 1",
        },
        {
          to: "user2@example.com",
          subject: "Batch Email 2",
          text: "Hello from batch email 2",
        },
      ],
      batchSize: 10,
    },
  },
  "notification:push": {
    payload: {
      userId: "@user:example.com",
      title: "Test Notification",
      body: "This is a test push notification",
      data: { type: "test" },
    },
  },
  "file:process-upload": {
    payload: {
      fileId: "file_123",
      filePath: "/tmp/uploads/file.jpg",
      originalName: "photo.jpg",
      contentType: "image/jpeg",
      size: 1024000,
      uploadedBy: "@user:example.com",
    },
  },
  "cleanup:old-files": {
    payload: {
      directory: "/tmp/old-files",
      olderThanDays: 30,
      extensions: [".log", ".tmp"],
      dryRun: true,
    },
  },
};

export function CreateJobDialog({ onJobCreated }: CreateJobDialogProps) {
  const [open, setOpen] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  
  const form = useForm<JobFormData>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      type: "",
      payload: "",
      priority: 0,
      maxAttempts: 3,
      tags: [],
    },
  });
  
  const handleJobTypeChange = (jobType: string) => {
    form.setValue("type", jobType);
    
    // Load template if available
    if (jobTemplates[jobType as keyof typeof jobTemplates]) {
      const template = jobTemplates[jobType as keyof typeof jobTemplates];
      form.setValue("payload", JSON.stringify(template.payload, null, 2));
    }
  };
  
  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const updatedTags = [...tags, newTag.trim()];
      setTags(updatedTags);
      form.setValue("tags", updatedTags);
      setNewTag("");
    }
  };
  
  const removeTag = (tagToRemove: string) => {
    const updatedTags = tags.filter(tag => tag !== tagToRemove);
    setTags(updatedTags);
    form.setValue("tags", updatedTags);
  };
  
  const onSubmit = async (data: JobFormData) => {
    try {
      setCreating(true);
      
      let payload;
      try {
        payload = JSON.parse(data.payload);
      } catch (error) {
        form.setError("payload", { message: "Invalid JSON in payload" });
        return;
      }
      
      const requestBody = {
        type: data.type,
        payload,
        options: {
          priority: data.priority,
          maxAttempts: data.maxAttempts,
          scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
          tags: data.tags,
          createdBy: data.createdBy || undefined,
        },
      };
      
      const response = await fetch("/api/admin/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setOpen(false);
        form.reset();
        setTags([]);
        onJobCreated?.();
      } else {
        form.setError("root", { message: result.error || "Failed to create job" });
      }
    } catch (error) {
      form.setError("root", { message: "Failed to create job" });
    } finally {
      setCreating(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Job
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Job</DialogTitle>
          <DialogDescription>
            Manually create a background job for testing or admin purposes.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Type</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Select onValueChange={handleJobTypeChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a job type" />
                        </SelectTrigger>
                        <SelectContent>
                          {commonJobTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Or enter custom job type"
                        value={field.value}
                        onChange={(e) => form.setValue("type", e.target.value)}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Choose from common job types or enter a custom type.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="payload"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payload (JSON)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='{"key": "value"}'
                      className="min-h-[200px] font-mono text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Job payload as JSON. Use templates above for examples.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>0 = lowest, 100 = highest</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="maxAttempts"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Attempts</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>Number of retry attempts</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="scheduledAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scheduled At (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    When to run the job. Leave empty to run immediately.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div>
              <Label>Tags</Label>
              <div className="flex items-center space-x-2 mt-2">
                <Input
                  placeholder="Add tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <Button type="button" variant="outline" size="sm" onClick={addTag}>
                  Add
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                      <button
                        type="button"
                        className="ml-1 hover:text-destructive"
                        onClick={() => removeTag(tag)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                Optional tags for organizing and filtering jobs.
              </p>
            </div>
            
            <FormField
              control={form.control}
              name="createdBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Created By (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="@user:example.com" {...field} />
                  </FormControl>
                  <FormDescription>
                    Matrix user ID who created this job.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {form.formState.errors.root && (
              <div className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </div>
            )}
            
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Creating..." : "Create Job"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}