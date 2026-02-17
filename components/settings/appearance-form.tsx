"use client";

/**
 * Appearance Form Component
 *
 * Comprehensive appearance settings form with visual indicators for unsaved changes.
 * Handles theme selection, accent colors, message display options, chat backgrounds,
 * and accessibility preferences with real-time preview.
 */

import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Save, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Palette,
  Eye,
  MessageSquare,
  User,
  Clock
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// =============================================================================
// Types & Validation
// =============================================================================

const appearanceFormSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  accentColor: z.enum(["blue", "green", "purple", "red", "orange", "pink", "cyan", "yellow"]),
  fontSize: z.enum(["small", "medium", "large"]),
  messageDisplay: z.enum(["compact", "cozy", "comfortable"]),
  showTimestamps: z.boolean(),
  showReactions: z.boolean(),
  chatBackground: z.enum(["default", "subtle", "image", "custom"]),
  zoomLevel: z.number().min(75).max(125),
  reduceMotion: z.boolean(),
  highContrast: z.boolean(),
});

type AppearanceFormData = z.infer<typeof appearanceFormSchema>;

interface UpdateState {
  type: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
}

// Accent color presets
const accentColors = {
  blue: { name: "Blue", value: "#3b82f6", class: "bg-blue-500" },
  green: { name: "Green", value: "#10b981", class: "bg-green-500" },
  purple: { name: "Purple", value: "#8b5cf6", class: "bg-purple-500" },
  red: { name: "Red", value: "#ef4444", class: "bg-red-500" },
  orange: { name: "Orange", value: "#f97316", class: "bg-orange-500" },
  pink: { name: "Pink", value: "#ec4899", class: "bg-pink-500" },
  cyan: { name: "Cyan", value: "#06b6d4", class: "bg-cyan-500" },
  yellow: { name: "Yellow", value: "#eab308", class: "bg-yellow-500" },
};

// =============================================================================
// Component
// =============================================================================

export function AppearanceForm() {
  // Form state
  const form = useForm<AppearanceFormData>({
    resolver: zodResolver(appearanceFormSchema),
    defaultValues: {
      theme: "system",
      accentColor: "blue",
      fontSize: "medium",
      messageDisplay: "cozy",
      showTimestamps: true,
      showReactions: true,
      chatBackground: "default",
      zoomLevel: 100,
      reduceMotion: false,
      highContrast: false,
    },
  });

  // Component state
  const [updateState, setUpdateState] = useState<UpdateState>({ type: 'idle' });
  const [previewData, setPreviewData] = useState<AppearanceFormData | null>(null);

  // Load saved settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // First try localStorage
        const localSettings = localStorage.getItem('melo-appearance-settings');
        if (localSettings) {
          const settings = JSON.parse(localSettings);
          form.reset(settings);
          setPreviewData(settings);
        }
        
        // TODO: Also load from Matrix account data when available
        // const matrixSettings = await loadMatrixSettings();
        // if (matrixSettings) form.reset(matrixSettings);
        
      } catch (error) {
        console.error('Failed to load appearance settings:', error);
      }
    };

    loadSettings();
  }, [form]);

  // Watch for form changes to update preview
  const watchedValues = form.watch();
  useEffect(() => {
    setPreviewData(watchedValues);
  }, [watchedValues]);

  // =============================================================================
  // Form Submission
  // =============================================================================

  const onSubmit = useCallback(async (data: AppearanceFormData) => {
    setUpdateState({ type: 'loading', message: 'Saving appearance settings...' });

    try {
      // Apply theme changes immediately
      applyThemeChanges(data);

      // Save to localStorage for persistence
      localStorage.setItem('melo-appearance-settings', JSON.stringify(data));

      // TODO: Save to Matrix account data
      // await saveToMatrixAccountData(data);

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

  // Apply theme changes to document
  const applyThemeChanges = (data: AppearanceFormData) => {
    const root = document.documentElement;
    
    // Apply theme
    if (data.theme === 'dark') {
      root.classList.add('dark');
    } else if (data.theme === 'light') {
      root.classList.remove('dark');
    } else {
      // System theme
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (systemDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }

    // Apply accent color as CSS variable
    root.style.setProperty('--accent-color', accentColors[data.accentColor].value);
    
    // Apply font size
    const fontSizeMap = { small: '14px', medium: '16px', large: '18px' };
    root.style.setProperty('--base-font-size', fontSizeMap[data.fontSize]);
    
    // Apply zoom level
    root.style.setProperty('--zoom-scale', `${data.zoomLevel / 100}`);
    
    // Apply motion preference
    if (data.reduceMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
    
    // Apply high contrast
    if (data.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
  };

  // =============================================================================
  // Preview Component
  // =============================================================================

  const PreviewPanel = ({ data }: { data: AppearanceFormData | null }) => {
    if (!data) return null;

    const densityStyles = {
      compact: "py-1 text-sm",
      cozy: "py-2",
      comfortable: "py-3 text-lg"
    };

    return (
      <Card className="sticky top-0">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <CardTitle className="text-lg">Live Preview</CardTitle>
          </div>
          <CardDescription>See how your settings will look</CardDescription>
        </CardHeader>
        <CardContent>
          <div 
            className={`border rounded-lg p-4 space-y-3 ${
              data.theme === 'dark' ? 'bg-gray-900 border-gray-700' : 
              data.theme === 'light' ? 'bg-white border-gray-200' : 
              'bg-gray-50 border-gray-300'
            }`}
            style={{
              fontSize: data.fontSize === 'small' ? '14px' : 
                       data.fontSize === 'large' ? '18px' : '16px',
              backgroundColor: data.chatBackground === 'subtle' ? 
                (data.theme === 'dark' ? '#1f2937' : '#f9fafb') : undefined
            }}
          >
            {/* Sample messages with different densities */}
            {['Alice', 'Bob', 'Charlie'].map((name, i) => (
              <div key={name} className={`flex items-start gap-3 ${densityStyles[data.messageDisplay]}`}>
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold"
                  style={{ backgroundColor: accentColors[data.accentColor].value }}
                >
                  {name[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{name}</span>
                    {data.showTimestamps && (
                      <span className="text-xs text-muted-foreground">
                        {new Date().toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Sample message with {data.messageDisplay} density
                  </p>
                  {data.showReactions && i === 1 && (
                    <div className="flex gap-1 mt-2">
                      <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                        👍 2
                      </div>
                      <div className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">
                        ❤️ 1
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Settings Form */}
      <div className="lg:col-span-2 space-y-6">
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

            {/* Accent Colors */}
            <Card>
              <CardHeader>
                <CardTitle>Accent Color</CardTitle>
                <CardDescription>
                  Choose a primary accent color for buttons and highlights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="accentColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="grid grid-cols-4 gap-3"
                        >
                          {Object.entries(accentColors).map(([key, color]) => (
                            <div key={key} className="flex items-center space-x-2">
                              <RadioGroupItem value={key} id={key} className="sr-only" />
                              <Label 
                                htmlFor={key} 
                                className="flex flex-col items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                              >
                                <div className={`w-8 h-8 rounded-full ${color.class}`}></div>
                                <span className="text-sm">{color.name}</span>
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Typography & Layout */}
            <Card>
              <CardHeader>
                <CardTitle>Typography & Layout</CardTitle>
                <CardDescription>
                  Adjust font size and message layout
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="fontSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Font size</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select font size" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="small">Small (14px)</SelectItem>
                          <SelectItem value="medium">Medium (16px)</SelectItem>
                          <SelectItem value="large">Large (18px)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="messageDisplay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message density</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="space-y-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="compact" id="compact" />
                            <Label htmlFor="compact">Compact - Fits more messages on screen</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="cozy" id="cozy" />
                            <Label htmlFor="cozy">Cozy - Balanced spacing with profile pictures</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="comfortable" id="comfortable" />
                            <Label htmlFor="comfortable">Comfortable - Extra spacing for easy reading</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Chat Background */}
            <Card>
              <CardHeader>
                <CardTitle>Chat Background</CardTitle>
                <CardDescription>
                  Customize the background of chat areas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="chatBackground"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="space-y-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="default" id="bg-default" />
                            <Label htmlFor="bg-default">Default - Standard background</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="subtle" id="bg-subtle" />
                            <Label htmlFor="bg-subtle">Subtle - Light tinted background</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="image" id="bg-image" />
                            <Label htmlFor="bg-image">Image - Background pattern (Coming Soon)</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="custom" id="bg-custom" />
                            <Label htmlFor="bg-custom">Custom - Upload your own (Coming Soon)</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Message Options */}
            <Card>
              <CardHeader>
                <CardTitle>Message Display</CardTitle>
                <CardDescription>
                  Configure what information to show with messages
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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

      {/* Preview Panel */}
      <div className="lg:col-span-1">
        <PreviewPanel data={previewData} />
      </div>
    </div>
  );
}

export default AppearanceForm;