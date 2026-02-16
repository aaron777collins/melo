/**
 * Server Templates Page
 * 
 * Template selection interface for creating new servers with pre-configured room structures.
 * Allows users to choose from various templates (gaming, study group, community, etc.)
 * and customize server settings before creation.
 */

"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Server, Settings, Loader2, CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
// Note: Using Alert components for feedback instead of toast

import { useMatrixClient } from "@/hooks/use-matrix-client";
import TemplateSelector from "@/components/servers/template-selector";
import { 
  SERVER_TEMPLATES, 
  createServerTemplateService,
  type ServerTemplate,
  type CreateServerFromTemplateOptions 
} from "@/lib/matrix/server-templates";

// =============================================================================
// Types
// =============================================================================

interface ServerSettings {
  name: string;
  description: string;
  isPublic: boolean;
}

type CreationStep = "template" | "settings" | "creating" | "success" | "error";

// =============================================================================
// Main Component
// =============================================================================

export default function ServerTemplatesPage() {
  const router = useRouter();
  const { client, isReady } = useMatrixClient();

  // State
  const [step, setStep] = useState<CreationStep>("template");
  const [selectedTemplate, setSelectedTemplate] = useState<ServerTemplate | undefined>();
  const [serverSettings, setServerSettings] = useState<ServerSettings>({
    name: "",
    description: "",
    isPublic: false,
  });
  const [error, setError] = useState<string>("");
  const [createdServerId, setCreatedServerId] = useState<string>("");

  // Handle template selection
  const handleTemplateSelect = useCallback((template: ServerTemplate) => {
    setSelectedTemplate(template);
    // Auto-populate server name with template name if empty
    if (!serverSettings.name) {
      setServerSettings(prev => ({
        ...prev,
        name: `${template.name} Server`,
      }));
    }
  }, [serverSettings.name]);

  // Handle settings form
  const handleSettingsChange = useCallback((field: keyof ServerSettings, value: string | boolean) => {
    setServerSettings(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  // Validate settings
  const validateSettings = useCallback((): string | null => {
    if (!serverSettings.name.trim()) {
      return "Server name is required";
    }
    if (serverSettings.name.length < 3) {
      return "Server name must be at least 3 characters long";
    }
    if (serverSettings.name.length > 50) {
      return "Server name cannot exceed 50 characters";
    }
    if (serverSettings.description.length > 200) {
      return "Server description cannot exceed 200 characters";
    }
    return null;
  }, [serverSettings]);

  // Create server from template
  const handleCreateServer = useCallback(async () => {
    if (!client || !isReady || !selectedTemplate) {
      setError("Matrix client not ready. Please wait and try again.");
      return;
    }

    const validationError = validateSettings();
    if (validationError) {
      setError(validationError);
      return;
    }

    setStep("creating");
    setError("");

    try {
      const templateService = createServerTemplateService(client);
      
      const options: CreateServerFromTemplateOptions = {
        name: serverSettings.name.trim(),
        description: serverSettings.description.trim() || undefined,
        template: selectedTemplate,
        isPublic: serverSettings.isPublic,
      };

      const result = await templateService.createServerFromTemplate(options);

      if (result.success && result.server) {
        setCreatedServerId(result.server.id);
        setStep("success");
        console.log(`[ServerTemplate] Created server "${serverSettings.name}" with ${result.server.rooms.length} channels`);
      } else {
        throw new Error(result.error || "Failed to create server");
      }
    } catch (err) {
      console.error("[ServerTemplates] Creation failed:", err);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      setStep("error");
    }
  }, [client, isReady, selectedTemplate, serverSettings, validateSettings]);

  // Navigate to created server
  const handleNavigateToServer = useCallback(() => {
    if (createdServerId) {
      router.push(`/servers/${createdServerId}`);
    }
  }, [router, createdServerId]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (step === "settings") {
      setStep("template");
    } else {
      router.back();
    }
  }, [step, router]);

  // Handle next step
  const handleNext = useCallback(() => {
    if (step === "template" && selectedTemplate) {
      setStep("settings");
    } else if (step === "settings") {
      void handleCreateServer();
    }
  }, [step, selectedTemplate, handleCreateServer]);

  // Check if can proceed
  const canProceed = useCallback(() => {
    if (step === "template") {
      return selectedTemplate !== undefined;
    } else if (step === "settings") {
      return validateSettings() === null;
    }
    return false;
  }, [step, selectedTemplate, validateSettings]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            disabled={step === "creating"}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Server className="w-6 h-6" />
            <h1 className="text-2xl font-bold">Create Server from Template</h1>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className={`w-2 h-2 rounded-full ${step === "template" ? "bg-primary" : "bg-primary/30"}`} />
          <span className={step === "template" ? "font-medium" : ""}>Choose Template</span>
          <div className="w-6 h-px bg-border" />
          <div className={`w-2 h-2 rounded-full ${step === "settings" ? "bg-primary" : "bg-primary/30"}`} />
          <span className={step === "settings" ? "font-medium" : ""}>Configure Server</span>
          <div className="w-6 h-px bg-border" />
          <div className={`w-2 h-2 rounded-full ${["creating", "success", "error"].includes(step) ? "bg-primary" : "bg-primary/30"}`} />
          <span className={["creating", "success", "error"].includes(step) ? "font-medium" : ""}>Create</span>
        </div>
      </div>

      {/* Template Selection Step */}
      {step === "template" && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold mb-2">Choose a Template</h2>
            <p className="text-muted-foreground">
              Select a pre-configured template to get started quickly with organized channels and settings.
            </p>
          </div>

          <TemplateSelector
            templates={SERVER_TEMPLATES}
            selectedTemplate={selectedTemplate}
            onTemplateSelect={handleTemplateSelect}
            disabled={!isReady}
          />
        </div>
      )}

      {/* Settings Configuration Step */}
      {step === "settings" && selectedTemplate && (
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold mb-2">Configure Your Server</h2>
            <p className="text-muted-foreground">
              Customize your server settings before creation.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Server Settings
              </CardTitle>
              <CardDescription>
                Configure basic settings for your new server based on the "{selectedTemplate.name}" template.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Server Name */}
              <div className="space-y-2">
                <Label htmlFor="server-name">Server Name *</Label>
                <Input
                  id="server-name"
                  placeholder="My Awesome Server"
                  value={serverSettings.name}
                  onChange={(e) => handleSettingsChange("name", e.target.value)}
                  maxLength={50}
                />
                <p className="text-xs text-muted-foreground">
                  {serverSettings.name.length}/50 characters
                </p>
              </div>

              {/* Server Description */}
              <div className="space-y-2">
                <Label htmlFor="server-description">Description (Optional)</Label>
                <Textarea
                  id="server-description"
                  placeholder="Describe what your server is about..."
                  value={serverSettings.description}
                  onChange={(e) => handleSettingsChange("description", e.target.value)}
                  maxLength={200}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  {serverSettings.description.length}/200 characters
                </p>
              </div>

              <Separator />

              {/* Privacy Settings */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Privacy Settings</Label>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-normal">Public Server</Label>
                    <p className="text-xs text-muted-foreground">
                      Anyone can discover and join this server
                    </p>
                  </div>
                  <Switch
                    checked={serverSettings.isPublic}
                    onCheckedChange={(checked) => handleSettingsChange("isPublic", checked)}
                  />
                </div>
              </div>

              {/* Template Info */}
              <Separator />
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Template: {selectedTemplate.name}</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  {selectedTemplate.description}
                </p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>• {selectedTemplate.structure.categories.length} categories</div>
                  <div>• {selectedTemplate.structure.categories.reduce((total, cat) => total + cat.channels.length, 0)} channels</div>
                  <div>• {selectedTemplate.structure.server.encrypted ? "Encrypted" : "Unencrypted"} by default</div>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Creating Step */}
      {step === "creating" && (
        <div className="max-w-md mx-auto text-center">
          <Card>
            <CardContent className="pt-8 pb-8">
              <div className="space-y-4">
                <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">Creating Your Server</h3>
                  <p className="text-sm text-muted-foreground">
                    Setting up channels and configuring permissions...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Success Step */}
      {step === "success" && (
        <div className="max-w-md mx-auto text-center">
          <Card>
            <CardContent className="pt-8 pb-8">
              <div className="space-y-4">
                <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">Server Created!</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Your server "{serverSettings.name}" has been created successfully.
                  </p>
                  <Button onClick={handleNavigateToServer} className="w-full">
                    Go to Server
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error Step */}
      {step === "error" && (
        <div className="max-w-md mx-auto text-center">
          <Card>
            <CardContent className="pt-8 pb-8">
              <div className="space-y-4">
                <div className="w-12 h-12 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
                  <Server className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Creation Failed</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {error || "An unexpected error occurred while creating your server."}
                  </p>
                  <div className="space-y-2">
                    <Button 
                      onClick={() => {
                        setStep("settings");
                        setError("");
                      }}
                      className="w-full"
                    >
                      Try Again
                    </Button>
                    <Button variant="ghost" onClick={() => router.back()} className="w-full">
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Action Buttons */}
      {(step === "template" || step === "settings") && (
        <div className="flex justify-between items-center mt-8 max-w-2xl mx-auto">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {step === "settings" ? "Back to Templates" : "Cancel"}
          </Button>
          
          <Button 
            onClick={handleNext}
            disabled={!canProceed() || !isReady}
          >
            {step === "template" ? "Configure Server" : "Create Server"}
            {step === "settings" && <Server className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      )}
    </div>
  );
}