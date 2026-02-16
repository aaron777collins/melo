"use client";

/**
 * Appearance Form Component
 *
 * Comprehensive appearance settings form with visual indicators for unsaved changes.
 * Handles theme selection, message display options, and accessibility preferences.
 */

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Save, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Palette
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// =============================================================================
// Types & Validation
// =============================================================================

const appearanceFormSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  messageDisplay: z.enum(["cozy", "compact"]),
  showTimestamps: z.boolean(),
  showReactions: z.boolean(),
  zoomLevel: z.number().min(75).max(125),
  reduceMotion: z.boolean(),
  highContrast: z.boolean(),
});

type AppearanceFormData = z.infer<typeof appearanceFormSchema>;

interface UpdateState {
  type: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
}

// =============================================================================
// Component
// =============================================================================

export function AppearanceForm() {
  // Form state
  const form = useForm<AppearanceFormData>({
    resolver: zodResolver(appearanceFormSchema),
    defaultValues: {
      theme: "system",
      messageDisplay: "cozy",
      showTimestamps: true,
      showReactions: true,
      zoomLevel: 100,
      reduceMotion: false,
      highContrast: false,
    },
  });

  // Component state
  const [updateState, setUpdateState] = useState<UpdateState>({ type: 'idle' });

  // =============================================================================
  // Form Submission
  // =============================================================================

  const onSubmit = useCallback(async (data: AppearanceFormData) => {
    setUpdateState({ type: 'loading', message: 'Saving appearance settings...' });

    try {
      // Simulate API call to save settings
      // In real implementation, this would save to localStorage or Matrix account data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Apply theme changes
      if (data.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (data.theme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        // System theme
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (systemDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }

      // Save to localStorage for persistence
      localStorage.setItem('haos-appearance-settings', JSON.stringify(data));

      setUpdateState({ 
        type: 'success', 
        message: 'Appearance settings saved successfully!' 
      });

      // Reset form dirty state
      form.reset(data);

    } catch (error) {
      console.error('Failed to save appearance settings:', error);
      setUpdateState({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to save settings' 
      });
    }
  }, [form]);

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <div className="space-y-6">
      {/* Status Alert */}
      {updateState.type !== 'idle' && (
        <Alert 
          variant={updateState.type === 'error' ? 'destructive' : 'default'}
          className={updateState.type === 'success' ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-400' : undefined}
        >
          {updateState.type === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
          {updateState.type === 'success' && <CheckCircle className="h-4 w-4" />}
          {updateState.type === 'error' && <AlertCircle className="h-4 w-4" />}
          <AlertDescription>{updateState.message}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Theme */}
          <Card>
            <CardHeader>
              <CardTitle>Theme</CardTitle>
              <CardDescription>
                Choose between light, dark, or system theme
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="theme"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="grid grid-cols-1 md:grid-cols-3 gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="light" id="light" />
                          <Label htmlFor="light" className="flex flex-col gap-2 cursor-pointer">
                            <div className="w-full h-20 bg-gray-100 border-2 border-gray-200 rounded-lg flex items-center justify-center">
                              <div className="w-8 h-8 bg-white border border-gray-300 rounded shadow-sm"></div>
                            </div>
                            <span className="text-sm font-medium">Light</span>
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="dark" id="dark" />
                          <Label htmlFor="dark" className="flex flex-col gap-2 cursor-pointer">
                            <div className="w-full h-20 bg-gray-800 border-2 border-gray-700 rounded-lg flex items-center justify-center">
                              <div className="w-8 h-8 bg-gray-900 border border-gray-600 rounded shadow-sm"></div>
                            </div>
                            <span className="text-sm font-medium">Dark</span>
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="system" id="system" />
                          <Label htmlFor="system" className="flex flex-col gap-2 cursor-pointer">
                            <div className="w-full h-20 bg-gradient-to-r from-gray-100 to-gray-800 border-2 border-gray-400 rounded-lg flex items-center justify-center">
                              <div className="w-8 h-8 bg-gradient-to-r from-white to-gray-900 border border-gray-400 rounded shadow-sm"></div>
                            </div>
                            <span className="text-sm font-medium">System</span>
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Message Display */}
          <Card>
            <CardHeader>
              <CardTitle>Message Display</CardTitle>
              <CardDescription>
                Customize how messages appear in chat
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="messageDisplay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message grouping</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="cozy" id="cozy" />
                          <Label htmlFor="cozy">Cozy - Modern spacing with profile pictures</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="compact" id="compact" />
                          <Label htmlFor="compact">Compact - Fits more messages on screen</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="showTimestamps"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel>Show message timestamps</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Display timestamps on hover or always visible
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="showReactions"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel>Show emoji reactions</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Display emoji reactions on messages
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Advanced */}
          <Card>
            <CardHeader>
              <CardTitle>Advanced</CardTitle>
              <CardDescription>
                Fine-tune the visual experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="zoomLevel"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Interface zoom level</FormLabel>
                      <span className="text-sm text-muted-foreground">{field.value}%</span>
                    </div>
                    <FormControl>
                      <Slider
                        min={75}
                        max={125}
                        step={5}
                        value={[field.value]}
                        onValueChange={(value) => field.onChange(value[0])}
                        className="w-full"
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Adjust the overall size of the interface
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reduceMotion"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel>Reduce motion</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Minimize animations and transitions
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="highContrast"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel>High contrast mode</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Increase contrast for better visibility
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Save Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={updateState.type === 'loading' || !form.formState.isDirty}
              className="min-w-[120px]"
            >
              {updateState.type === 'loading' ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
            
            {form.formState.isDirty && (
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
              >
                Reset
              </Button>
            )}
          </div>

          {/* Unsaved Changes Indicator */}
          {form.formState.isDirty && (
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4" />
              <span>You have unsaved changes</span>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}

export default AppearanceForm;