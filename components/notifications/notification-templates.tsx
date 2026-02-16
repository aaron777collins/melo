/**
 * Notification Templates Component
 * 
 * Advanced notification customization interface allowing users to:
 * - Customize notification templates for different event types
 * - Configure notification sounds, icons, and timing
 * - Preview templates with real-time examples
 * - Import/export template configurations
 */

"use client";

import React, { useState, useCallback } from "react";
import {
  Bell,
  MessageCircle,
  AtSign,
  Users,
  UserPlus,
  MessageSquare,
  Heart,
  Hash,
  Settings,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Download,
  Upload,
  Eye,
  Edit,
  Copy,
  Trash2,
  Plus,
  Save,
  RotateCcw
} from "lucide-react";

import { useNotifications } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { NotificationType, type NotificationTemplate } from "@/lib/matrix/notifications";

// =============================================================================
// Types
// =============================================================================

interface NotificationTemplatesProps {
  className?: string;
}

interface TemplateEditorProps {
  template: NotificationTemplate;
  onSave: (template: NotificationTemplate) => void;
  onCancel: () => void;
}

interface TemplatePreviewProps {
  template: NotificationTemplate;
  sampleData: {
    sender: string;
    room: string;
    message: string;
    time: string;
  };
}

// =============================================================================
// Sample Data & Constants
// =============================================================================

const SAMPLE_DATA = {
  sender: "Alice Johnson",
  room: "HAOS Development",
  message: "Hey everyone! I just pushed the new notification system. What do you think?",
  time: "2 minutes ago"
};

const NOTIFICATION_TYPES = [
  {
    type: NotificationType.DirectMessage,
    name: "Direct Messages",
    description: "Personal messages sent directly to you",
    icon: MessageCircle,
    color: "text-blue-500"
  },
  {
    type: NotificationType.Mention,
    name: "Mentions",
    description: "When someone mentions you with @username",
    icon: AtSign,
    color: "text-red-500"
  },
  {
    type: NotificationType.RoomInvite,
    name: "Room Invitations",
    description: "When someone invites you to a room",
    icon: UserPlus,
    color: "text-green-500"
  },
  {
    type: NotificationType.ThreadReply,
    name: "Thread Replies",
    description: "Replies to threads you're participating in",
    icon: MessageSquare,
    color: "text-purple-500"
  },
  {
    type: NotificationType.Reaction,
    name: "Reactions",
    description: "When someone reacts to your messages",
    icon: Heart,
    color: "text-pink-500"
  },
  {
    type: NotificationType.KeywordHighlight,
    name: "Keyword Highlights",
    description: "Messages containing your highlight keywords",
    icon: Hash,
    color: "text-orange-500"
  }
];

const TEMPLATE_VARIABLES = [
  { variable: "{sender}", description: "Name of the person sending the message" },
  { variable: "{room}", description: "Name of the room or channel" },
  { variable: "{message}", description: "Content of the message (truncated)" },
  { variable: "{time}", description: "Formatted timestamp" }
];

const SOUND_OPTIONS = [
  { value: "default", label: "Default", file: "/sounds/default.mp3" },
  { value: "subtle", label: "Subtle", file: "/sounds/subtle.mp3" },
  { value: "alert", label: "Alert", file: "/sounds/alert.mp3" },
  { value: "chime", label: "Chime", file: "/sounds/chime.mp3" },
  { value: "pop", label: "Pop", file: "/sounds/pop.mp3" },
  { value: "none", label: "Silent", file: null }
];

// =============================================================================
// Utility Functions
// =============================================================================

function applyTemplateVariables(template: string, data: any): string {
  let result = template;
  Object.entries(data).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    result = result.replace(new RegExp(placeholder, 'g'), String(value));
  });
  return result;
}

function getDefaultTemplate(type: NotificationType): NotificationTemplate {
  const typeInfo = NOTIFICATION_TYPES.find(t => t.type === type);
  
  switch (type) {
    case NotificationType.DirectMessage:
      return {
        id: `${type}_default`,
        type,
        title: "{sender}",
        body: "{message}",
        actions: [
          { id: "reply", title: "Reply", icon: "💬" },
          { id: "dismiss", title: "Dismiss" }
        ],
        customization: {
          sound: "default",
          icon: "/icons/dm.png",
          vibrate: [200, 100, 200]
        }
      };
      
    case NotificationType.Mention:
      return {
        id: `${type}_default`,
        type,
        title: "{sender} mentioned you",
        body: "in {room}: {message}",
        actions: [
          { id: "view", title: "View", icon: "👀" },
          { id: "dismiss", title: "Dismiss" }
        ],
        customization: {
          sound: "alert",
          icon: "/icons/mention.png",
          vibrate: [300, 100, 300, 100, 300]
        }
      };
      
    case NotificationType.RoomInvite:
      return {
        id: `${type}_default`,
        type,
        title: "Room invitation from {sender}",
        body: "You've been invited to {room}",
        actions: [
          { id: "accept", title: "Accept", icon: "✅" },
          { id: "decline", title: "Decline", icon: "❌" }
        ],
        customization: {
          sound: "chime",
          icon: "/icons/invite.png",
          vibrate: [200, 200, 200]
        }
      };
      
    default:
      return {
        id: `${type}_default`,
        type,
        title: "{sender}",
        body: "{message}",
        actions: [
          { id: "view", title: "View" },
          { id: "dismiss", title: "Dismiss" }
        ]
      };
  }
}

// =============================================================================
// Components
// =============================================================================

/**
 * Template preview component
 */
function TemplatePreview({ template, sampleData }: TemplatePreviewProps) {
  const processedTitle = applyTemplateVariables(template.title, sampleData);
  const processedBody = applyTemplateVariables(template.body, sampleData);

  return (
    <div className="border rounded-lg p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
      <div className="flex items-start gap-3">
        {/* Mock notification icon */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <Bell className="h-5 w-5 text-white" />
        </div>
        
        <div className="flex-1">
          <div className="font-medium text-sm mb-1">{processedTitle}</div>
          <div className="text-sm text-muted-foreground mb-3">{processedBody}</div>
          
          {/* Mock actions */}
          {template.actions && template.actions.length > 0 && (
            <div className="flex gap-2">
              {template.actions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  disabled
                >
                  {action.icon && <span className="mr-1">{action.icon}</span>}
                  {action.title}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Template editor component
 */
function TemplateEditor({ template, onSave, onCancel }: TemplateEditorProps) {
  const [editedTemplate, setEditedTemplate] = useState<NotificationTemplate>({ ...template });
  const [isPlaying, setIsPlaying] = useState(false);

  const updateTemplate = useCallback((updates: Partial<NotificationTemplate>) => {
    setEditedTemplate(prev => ({ ...prev, ...updates }));
  }, []);

  const updateCustomization = useCallback((updates: any) => {
    setEditedTemplate(prev => ({
      ...prev,
      customization: { ...prev.customization, ...updates }
    }));
  }, []);

  const playSound = useCallback(async (soundFile: string | null) => {
    if (!soundFile) return;
    
    setIsPlaying(true);
    try {
      const audio = new Audio(soundFile);
      audio.volume = 0.3;
      await audio.play();
    } catch (error) {
      console.error("Failed to play sound:", error);
    } finally {
      setTimeout(() => setIsPlaying(false), 1000);
    }
  }, []);

  const handleSave = useCallback(() => {
    onSave(editedTemplate);
  }, [editedTemplate, onSave]);

  const handleReset = useCallback(() => {
    const defaultTemplate = getDefaultTemplate(template.type);
    setEditedTemplate(defaultTemplate);
  }, [template.type]);

  const typeInfo = NOTIFICATION_TYPES.find(t => t.type === template.type);
  const selectedSound = SOUND_OPTIONS.find(s => s.value === editedTemplate.customization?.sound);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {typeInfo?.icon && <typeInfo.icon className={`h-5 w-5 ${typeInfo.color}`} />}
          <div>
            <h3 className="text-lg font-semibold">{typeInfo?.name}</h3>
            <p className="text-sm text-muted-foreground">{typeInfo?.description}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Default
          </Button>
        </div>
      </div>

      <Tabs defaultValue="content" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="customization">Style</TabsTrigger>
        </TabsList>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-4">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="title">Notification Title</Label>
              <Input
                id="title"
                value={editedTemplate.title}
                onChange={(e) => updateTemplate({ title: e.target.value })}
                placeholder="Enter notification title..."
              />
            </div>
            
            <div>
              <Label htmlFor="body">Notification Body</Label>
              <Textarea
                id="body"
                value={editedTemplate.body}
                onChange={(e) => updateTemplate({ body: e.target.value })}
                placeholder="Enter notification body..."
                rows={3}
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Available Variables</Label>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATE_VARIABLES.map((variable) => (
                  <div
                    key={variable.variable}
                    className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-muted"
                    onClick={() => {
                      // Add variable to title/body on click
                      const textarea = document.activeElement as HTMLTextAreaElement | HTMLInputElement;
                      if (textarea && (textarea.id === 'title' || textarea.id === 'body')) {
                        const start = textarea.selectionStart || 0;
                        const end = textarea.selectionEnd || 0;
                        const value = textarea.value;
                        const newValue = value.slice(0, start) + variable.variable + value.slice(end);
                        
                        if (textarea.id === 'title') {
                          updateTemplate({ title: newValue });
                        } else {
                          updateTemplate({ body: newValue });
                        }
                      }
                    }}
                  >
                    <Badge variant="secondary" className="text-xs font-mono">
                      {variable.variable}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {variable.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Notification Actions</Label>
            <p className="text-xs text-muted-foreground mb-4">
              Configure the buttons that appear in the notification
            </p>
            
            {editedTemplate.actions?.map((action, index) => (
              <div key={index} className="flex items-center gap-2 p-3 border rounded mb-2">
                <Input
                  placeholder="Action title"
                  value={action.title}
                  onChange={(e) => {
                    const newActions = [...(editedTemplate.actions || [])];
                    newActions[index] = { ...action, title: e.target.value };
                    updateTemplate({ actions: newActions });
                  }}
                />
                <Input
                  placeholder="Icon (emoji)"
                  value={action.icon || ""}
                  onChange={(e) => {
                    const newActions = [...(editedTemplate.actions || [])];
                    newActions[index] = { ...action, icon: e.target.value };
                    updateTemplate({ actions: newActions });
                  }}
                  className="w-20"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newActions = editedTemplate.actions?.filter((_, i) => i !== index) || [];
                    updateTemplate({ actions: newActions });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newActions = [...(editedTemplate.actions || []), { id: `action${Date.now()}`, title: "New Action" }];
                updateTemplate({ actions: newActions });
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Action
            </Button>
          </div>
        </TabsContent>

        {/* Customization Tab */}
        <TabsContent value="customization" className="space-y-4">
          <div className="grid gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Sound</Label>
              <div className="flex items-center gap-2">
                <Select
                  value={editedTemplate.customization?.sound || "default"}
                  onValueChange={(value) => updateCustomization({ sound: value })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOUND_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {selectedSound?.file && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => playSound(selectedSound.file)}
                    disabled={isPlaying}
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="icon">Custom Icon URL</Label>
              <Input
                id="icon"
                value={editedTemplate.customization?.icon || ""}
                onChange={(e) => updateCustomization({ icon: e.target.value })}
                placeholder="https://example.com/icon.png"
              />
            </div>

            <div>
              <Label htmlFor="badge">Badge Icon URL</Label>
              <Input
                id="badge"
                value={editedTemplate.customization?.badge || ""}
                onChange={(e) => updateCustomization({ badge: e.target.value })}
                placeholder="https://example.com/badge.png"
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Vibration Pattern</Label>
              <div className="text-xs text-muted-foreground mb-2">
                Comma-separated values in milliseconds (vibrate, pause, vibrate...)
              </div>
              <Input
                value={(editedTemplate.customization?.vibrate || []).join(", ")}
                onChange={(e) => {
                  const pattern = e.target.value
                    .split(",")
                    .map(s => parseInt(s.trim()))
                    .filter(n => !isNaN(n));
                  updateCustomization({ vibrate: pattern });
                }}
                placeholder="200, 100, 200"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Preview */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Preview</Label>
        <TemplatePreview template={editedTemplate} sampleData={SAMPLE_DATA} />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save Template
        </Button>
      </div>
    </div>
  );
}

/**
 * Template list item component
 */
function TemplateListItem({
  template,
  onEdit,
  onDuplicate,
  onDelete
}: {
  template: NotificationTemplate;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const typeInfo = NOTIFICATION_TYPES.find(t => t.type === template.type);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {typeInfo?.icon && <typeInfo.icon className={`h-5 w-5 ${typeInfo.color}`} />}
            <div>
              <div className="font-medium">{typeInfo?.name}</div>
              <div className="text-sm text-muted-foreground">
                &ldquo;{applyTemplateVariables(template.title, SAMPLE_DATA)}&rdquo;
              </div>
            </div>
          </div>
          
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDuplicate}>
              <Copy className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Template</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this notification template? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function NotificationTemplates({ className }: NotificationTemplatesProps) {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [activeTab, setActiveTab] = useState("templates");

  // Initialize with default templates
  React.useEffect(() => {
    const defaultTemplates = NOTIFICATION_TYPES.map(type => getDefaultTemplate(type.type));
    setTemplates(defaultTemplates);
  }, []);

  const handleSaveTemplate = useCallback((template: NotificationTemplate) => {
    setTemplates(prev => {
      const index = prev.findIndex(t => t.id === template.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = template;
        return updated;
      } else {
        return [...prev, template];
      }
    });
    setEditingTemplate(null);
  }, []);

  const handleDuplicateTemplate = useCallback((template: NotificationTemplate) => {
    const duplicated = {
      ...template,
      id: `${template.type}_custom_${Date.now()}`,
      title: `${template.title} (Copy)`
    };
    setTemplates(prev => [...prev, duplicated]);
  }, []);

  const handleDeleteTemplate = useCallback((templateId: string) => {
    setTemplates(prev => prev.filter(t => t.id !== templateId));
  }, []);

  const handleImportTemplates = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        setTemplates(imported);
      } catch (error) {
        console.error("Failed to import templates:", error);
      }
    };
    reader.readAsText(file);
  }, []);

  const handleExportTemplates = useCallback(() => {
    const dataStr = JSON.stringify(templates, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'haos-notification-templates.json';
    link.click();
    URL.revokeObjectURL(url);
  }, [templates]);

  if (editingTemplate) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Edit Notification Template</CardTitle>
          <CardDescription>
            Customize how notifications appear for different types of events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TemplateEditor
            template={editingTemplate}
            onSave={handleSaveTemplate}
            onCancel={() => setEditingTemplate(null)}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Notification Templates
            </CardTitle>
            <CardDescription>
              Customize notification appearance, sounds, and behavior
            </CardDescription>
          </div>
          
          <div className="flex gap-2">
            <input
              type="file"
              accept=".json"
              onChange={handleImportTemplates}
              className="hidden"
              id="import-templates"
            />
            <Label htmlFor="import-templates" asChild>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
            </Label>
            
            <Button variant="outline" size="sm" onClick={handleExportTemplates}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="global">Global Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4 mt-6">
            <div className="space-y-3">
              {templates.map((template) => (
                <TemplateListItem
                  key={template.id}
                  template={template}
                  onEdit={() => setEditingTemplate(template)}
                  onDuplicate={() => handleDuplicateTemplate(template)}
                  onDelete={() => handleDeleteTemplate(template.id)}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="global" className="space-y-4 mt-6">
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">Global Sound Settings</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Master controls that apply to all notifications
                </p>
                
                <div className="grid gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Sounds</Label>
                      <p className="text-sm text-muted-foreground">
                        Play notification sounds when enabled
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div>
                    <Label>Master Volume</Label>
                    <Slider defaultValue={[70]} max={100} step={1} className="mt-2" />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-base font-medium">Global Display Settings</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Default behavior for all notification types
                </p>
                
                <div className="grid gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Persistent Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Keep notifications visible until dismissed
                      </p>
                    </div>
                    <Switch />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Group by Room</Label>
                      <p className="text-sm text-muted-foreground">
                        Stack notifications from the same room
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default NotificationTemplates;