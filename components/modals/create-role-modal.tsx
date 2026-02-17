"use client";

/**
 * Create Role Modal Component
 * 
 * Modal for creating new roles with name, color, icon selection,
 * and Matrix power level mapping.
 */

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Crown, Hammer, Shield, Users, Check, AlertCircle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useModal } from "@/hooks/use-modal-store";
import { 
  createCustomRole, 
  validateRoleName, 
  validatePowerLevel,
  getDefaultColorForPowerLevel,
  getClosestPermissionTemplate,
  type RoleIcon,
  type CreateRoleData
} from "@/lib/matrix/roles";
import { PermissionEditor } from "@/components/server/permission-editor";
import {
  MeloPermissions,
  PERMISSION_TEMPLATES,
  getPermissionTemplate,
  calculateRequiredPowerLevel,
  validatePermissions
} from "@/lib/matrix/permissions";

// =============================================================================
// Form Schema & Types
// =============================================================================

const createRoleSchema = z.object({
  name: z.string()
    .min(1, "Role name is required")
    .max(32, "Role name cannot exceed 32 characters")
    .refine((name) => !name.includes("@"), "Role name cannot contain @ symbol"),
  color: z.string()
    .regex(/^#[0-9A-F]{6}$/i, "Color must be a valid hex color"),
  icon: z.enum(["crown", "hammer", "shield", "users"]),
  powerLevel: z.number()
    .min(0, "Power level must be at least 0")
    .max(100, "Power level cannot exceed 100"),
  template: z.string().optional(),
});

type CreateRoleForm = z.infer<typeof createRoleSchema>;

// =============================================================================
// Constants
// =============================================================================

const ROLE_ICONS = [
  { value: "crown" as const, icon: Crown, label: "Crown", description: "For leadership roles" },
  { value: "hammer" as const, icon: Hammer, label: "Hammer", description: "For moderation roles" },
  { value: "shield" as const, icon: Shield, label: "Shield", description: "For security roles" },
  { value: "users" as const, icon: Users, label: "Users", description: "For community roles" },
];

const PRESET_COLORS = [
  "#f04747", // Red
  "#faa61a", // Orange
  "#f1c40f", // Yellow
  "#43b581", // Green
  "#3498db", // Blue
  "#7289da", // Blurple
  "#9b59b6", // Purple
  "#e91e63", // Pink
  "#99aab5", // Gray
];

const POWER_LEVEL_PRESETS = [
  { level: 100, label: "Admin", description: "Full server control", color: "#f04747" },
  { level: 50, label: "Moderator", description: "Can moderate and manage channels", color: "#7289da" },
  { level: 25, label: "Helper", description: "Can help with basic moderation", color: "#43b581" },
  { level: 0, label: "Member", description: "Basic member permissions", color: "#99aab5" },
];

// =============================================================================
// Components
// =============================================================================

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [customColor, setCustomColor] = useState(value);

  return (
    <div className="space-y-3">
      {/* Preset Colors */}
      <div className="grid grid-cols-9 gap-2">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            className={`w-8 h-8 rounded-full border-2 transition-all ${
              value === color ? "border-white scale-110" : "border-zinc-600 hover:border-zinc-400"
            }`}
            style={{ backgroundColor: color }}
            onClick={() => onChange(color)}
          />
        ))}
      </div>
      
      {/* Custom Color Input */}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={customColor}
          onChange={(e) => {
            setCustomColor(e.target.value);
            onChange(e.target.value);
          }}
          className="w-8 h-8 rounded border border-zinc-600"
        />
        <Input
          value={customColor}
          onChange={(e) => {
            setCustomColor(e.target.value);
            if (e.target.value.match(/^#[0-9A-F]{6}$/i)) {
              onChange(e.target.value);
            }
          }}
          placeholder="#7289da"
          className="font-mono text-sm"
        />
      </div>
    </div>
  );
}

interface IconSelectorProps {
  value: RoleIcon;
  onChange: (icon: RoleIcon) => void;
}

function IconSelector({ value, onChange }: IconSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {ROLE_ICONS.map(({ value: iconValue, icon: Icon, label, description }) => (
        <button
          key={iconValue}
          type="button"
          className={`p-4 rounded-lg border-2 transition-all ${
            value === iconValue
              ? "border-indigo-500 bg-indigo-500/10"
              : "border-zinc-600 bg-zinc-800/50 hover:border-zinc-500"
          }`}
          onClick={() => onChange(iconValue)}
        >
          <div className="flex flex-col items-center text-center">
            <Icon className="h-6 w-6 mb-2 text-zinc-300" />
            <span className="text-sm font-medium text-white">{label}</span>
            <span className="text-xs text-zinc-400 mt-1">{description}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

interface PowerLevelSliderProps {
  value: number;
  onChange: (value: number) => void;
  userPowerLevel: number;
}

function PowerLevelSlider({ value, onChange, userPowerLevel }: PowerLevelSliderProps) {
  const permissions = getClosestPermissionTemplate(value);
  const permissionCount = Object.values(permissions).filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Slider */}
      <div className="space-y-2">
        <Slider
          value={[value]}
          onValueChange={([newValue]) => onChange(newValue)}
          max={Math.min(99, userPowerLevel - 1)} // Can't create equal or higher
          min={0}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-zinc-500">
          <span>0 (Member)</span>
          <span className="font-medium text-white">{value}</span>
          <span>100 (Admin)</span>
        </div>
      </div>

      {/* Presets */}
      <div className="grid grid-cols-4 gap-2">
        {POWER_LEVEL_PRESETS.map(({ level, label, description }) => (
          <button
            key={level}
            type="button"
            disabled={level >= userPowerLevel}
            className={`p-2 text-left rounded-md border transition-all text-sm ${
              value === level
                ? "border-indigo-500 bg-indigo-500/10"
                : level >= userPowerLevel
                ? "border-zinc-700 bg-zinc-800/30 opacity-50 cursor-not-allowed"
                : "border-zinc-600 bg-zinc-800/50 hover:border-zinc-500"
            }`}
            onClick={() => level < userPowerLevel && onChange(level)}
          >
            <div className="font-medium text-white">{label}</div>
            <div className="text-xs text-zinc-400 mt-0.5">{description}</div>
          </button>
        ))}
      </div>

      {/* Permission Summary */}
      <div className="bg-zinc-800/50 p-3 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-4 w-4 text-zinc-400" />
          <span className="text-sm font-medium text-white">
            {permissionCount} permissions enabled
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1 text-xs">
          {Object.entries(permissions).map(([permission, enabled]) => (
            <div
              key={permission}
              className={`flex items-center gap-1 ${enabled ? "text-green-400" : "text-zinc-500"}`}
            >
              <div className={`w-1 h-1 rounded-full ${enabled ? "bg-green-400" : "bg-zinc-600"}`} />
              {permission.replace(/([A-Z])/g, " $1").toLowerCase()}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function CreateRoleModal() {
  const { isOpen, onClose, type, data } = useModal();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<MeloPermissions>(() => {
    const memberTemplate = getPermissionTemplate('member');
    return memberTemplate?.permissions || {} as MeloPermissions;
  });

  const isModalOpen = isOpen && type === "createRole";
  const { space, serverId, userPowerLevel = 50 } = data;

  const form = useForm<CreateRoleForm>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      name: "",
      color: getDefaultColorForPowerLevel(25),
      icon: "shield",
      powerLevel: 25,
      template: "member",
    },
  });

  const watchedColor = form.watch("color");
  const watchedIcon = form.watch("icon");
  const watchedPowerLevel = form.watch("powerLevel");
  const watchedTemplate = form.watch("template");

  // =============================================================================
  // Handlers
  // =============================================================================

  const handlePermissionsChange = (newPermissions: MeloPermissions) => {
    setPermissions(newPermissions);
    
    // Update power level if permissions require it
    const requiredLevel = calculateRequiredPowerLevel(newPermissions);
    if (requiredLevel > watchedPowerLevel) {
      form.setValue("powerLevel", Math.min(requiredLevel, userPowerLevel - 1));
    }
  };

  const handlePowerLevelChange = (newPowerLevel: number) => {
    form.setValue("powerLevel", Math.min(newPowerLevel, userPowerLevel - 1));
  };

  const handleTemplateChange = React.useCallback((templateId: string) => {
    if (!templateId) return;
    
    const template = getPermissionTemplate(templateId);
    if (template) {
      setPermissions(template.permissions);
      form.setValue("color", template.color);
      form.setValue("powerLevel", Math.min(template.recommendedPowerLevel, userPowerLevel - 1));
    }
  }, [form, userPowerLevel]);

  // Update permissions when template changes
  React.useEffect(() => {
    if (watchedTemplate) {
      handleTemplateChange(watchedTemplate);
    }
  }, [watchedTemplate, handleTemplateChange]);

  const onSubmit = async (values: CreateRoleForm) => {
    if (!serverId) {
      setError("Server ID is required");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Validate role name
      const nameValidation = validateRoleName(values.name);
      if (!nameValidation.isValid) {
        throw new Error(nameValidation.error);
      }

      // Validate power level
      const powerValidation = validatePowerLevel(values.powerLevel, userPowerLevel);
      if (!powerValidation.isValid) {
        throw new Error(powerValidation.error);
      }

      // Validate permissions
      const permissionValidation = validatePermissions(permissions, values.powerLevel);
      if (!permissionValidation.valid) {
        throw new Error(permissionValidation.errors[0]);
      }

      // Create role data
      const roleData: CreateRoleData = {
        name: values.name.trim(),
        color: values.color,
        icon: values.icon,
        powerLevel: values.powerLevel,
        isHoist: true,
        isMentionable: true,
        permissions,
      };

      // Create the role
      await createCustomRole(serverId, roleData);

      // Reset form and close modal
      form.reset();
      onClose();
      
      console.log("Role created successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create role";
      setError(errorMessage);
      console.error("Failed to create role:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (isCreating) return; // Prevent closing while creating
    form.reset();
    setError(null);
    onClose();
  };

  // Role preview
  const selectedIcon = ROLE_ICONS.find(icon => icon.value === watchedIcon);
  const IconComponent = selectedIcon?.icon || Shield;

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-[#2B2D31] text-white border-zinc-700 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-center">
            Create Role
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-center">
            Create a new role with custom permissions and appearance.
          </DialogDescription>
        </DialogHeader>

        {/* Role Preview */}
        <div className="bg-zinc-800/50 p-4 rounded-lg mb-4">
          <div className="text-xs text-zinc-500 mb-2">Preview</div>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-8 h-8 rounded-full"
              style={{ backgroundColor: watchedColor + "20", color: watchedColor }}
            >
              <IconComponent className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">
                {form.watch("name") || "New Role"}
              </span>
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: watchedColor }}
              />
            </div>
            <Badge variant="secondary" className="text-xs">
              Power Level: {watchedPowerLevel}
            </Badge>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Error Alert */}
            {error && (
              <Alert className="border-red-500 bg-red-500/10">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-400">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Role Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter role name..."
                      disabled={isCreating}
                      className="bg-zinc-800/50 border-zinc-600 text-white"
                      maxLength={32}
                    />
                  </FormControl>
                  <FormDescription>
                    Maximum 32 characters. Cannot contain @ symbol.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Role Color */}
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role Color</FormLabel>
                  <FormControl>
                    <ColorPicker value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormDescription>
                    This color will be displayed next to the role name.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Role Icon */}
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role Icon</FormLabel>
                  <FormControl>
                    <IconSelector value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormDescription>
                    Choose an icon that represents this role.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Template Selection */}
            <FormField
              control={form.control}
              name="template"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Permission Template</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="bg-zinc-800/50 border-zinc-600 text-white">
                        <SelectValue placeholder="Select a permission template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {PERMISSION_TEMPLATES.map((template) => (
                          <SelectItem 
                            key={template.id} 
                            value={template.id}
                            disabled={template.recommendedPowerLevel >= userPowerLevel}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: template.color }}
                              />
                              <div>
                                <div className="font-medium">{template.name}</div>
                                <div className="text-xs text-zinc-400">{template.description}</div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription>
                    Choose a base template that matches the role&apos;s intended purpose.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Power Level */}
            <FormField
              control={form.control}
              name="powerLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Power Level</FormLabel>
                  <FormControl>
                    <PowerLevelSlider
                      value={field.value}
                      onChange={field.onChange}
                      userPowerLevel={userPowerLevel}
                    />
                  </FormControl>
                  <FormDescription>
                    Higher power levels have more permissions. You can only create roles with lower power levels than your own ({userPowerLevel}).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Permission Editor */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-white">Detailed Permissions</div>
              <PermissionEditor
                permissions={permissions}
                powerLevel={watchedPowerLevel}
                maxPowerLevel={userPowerLevel}
                onPermissionsChange={handlePermissionsChange}
                onPowerLevelChange={handlePowerLevelChange}
                showPowerLevelInfo={false}
                compact={true}
              />
            </div>
          </form>
        </Form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isCreating}
            className="border-zinc-600 text-zinc-300 hover:bg-zinc-700"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={form.handleSubmit(onSubmit)}
            disabled={isCreating}
            className="bg-indigo-500 hover:bg-indigo-600"
          >
            {isCreating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Create Role
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}