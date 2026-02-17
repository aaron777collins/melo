import React, { useState, useMemo } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { 
  Crown,
  Shield,
  User,
  Users,
  Settings,
  MessageSquare,
  Mic,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { useChannelPermissions } from '@/hooks/use-channel-permissions';
import { PERMISSION_CATEGORIES, type MeloPermissions } from '@/lib/matrix/permissions';
import rolesService from '@/lib/matrix/roles';
import type { 
  ChannelRolePermissionOverride,
  ChannelUserPermissionOverride,
  BulkPermissionOperation
} from '@/src/types/channel';

interface ChannelPermissionsProps {
  channelId: string;
  currentUserId: string;
}

export function ChannelPermissions({ channelId, currentUserId }: ChannelPermissionsProps) {
  const {
    channelPermissions,
    userRoles,
    isLoading,
    isUpdating,
    setRolePermissionOverride,
    setUserPermissionOverride,
    removeRoleOverride,
    removeUserOverride,
    executeBulkOperation,
    refreshPermissions
  } = useChannelPermissions({ channelId, userId: currentUserId });

  const [activeTab, setActiveTab] = useState<'roles' | 'users' | 'bulk'>('roles');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [editingPermissions, setEditingPermissions] = useState<Partial<MeloPermissions>>({});
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [bulkTargets, setBulkTargets] = useState<string[]>([]);
  const [bulkPermissions, setBulkPermissions] = useState<(keyof MeloPermissions)[]>([]);

  // Get available roles for the channel
  const [availableRoles, setAvailableRoles] = useState<Array<{ id: string; name: string; powerLevel: number }>>([]);
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; displayName: string }>>([]);

  // Load available roles and users
  React.useEffect(() => {
    const loadAvailableTargets = async () => {
      try {
        const customRoles = await rolesService.getCustomRoles(channelId);
        setAvailableRoles(customRoles.map(role => ({
          id: role.id,
          name: role.name,
          powerLevel: role.powerLevel
        })));
        
        // TODO: Load actual users from the room/server
        // For now, using placeholder data
        setAvailableUsers([
          { id: '@user1:matrix.org', displayName: 'User 1' },
          { id: '@user2:matrix.org', displayName: 'User 2' }
        ]);
      } catch (error) {
        console.error('Failed to load available targets:', error);
      }
    };

    loadAvailableTargets();
  }, [channelId]);

  const getPermissionIcon = (category: string) => {
    const iconMap = {
      general: Settings,
      text: MessageSquare,
      voice: Mic,
      moderation: Shield,
      management: Crown,
    };
    return iconMap[category as keyof typeof iconMap] || Settings;
  };

  const getPermissionStatus = (
    permission: keyof MeloPermissions,
    overrides: Partial<MeloPermissions>
  ): 'inherit' | 'allow' | 'deny' => {
    if (!(permission in overrides)) return 'inherit';
    return overrides[permission] ? 'allow' : 'deny';
  };

  const getPermissionStatusIcon = (status: 'inherit' | 'allow' | 'deny') => {
    switch (status) {
      case 'allow': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'deny': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'inherit': return <Eye className="w-4 h-4 text-gray-400" />;
    }
  };

  const handlePermissionToggle = (
    permission: keyof MeloPermissions,
    currentStatus: 'inherit' | 'allow' | 'deny'
  ) => {
    const newPermissions = { ...editingPermissions };
    
    if (currentStatus === 'inherit') {
      newPermissions[permission] = true; // Allow
    } else if (currentStatus === 'allow') {
      newPermissions[permission] = false; // Deny
    } else {
      delete newPermissions[permission]; // Inherit
    }
    
    setEditingPermissions(newPermissions);
  };

  const handleSavePermissions = async () => {
    try {
      if (selectedRole) {
        const role = availableRoles.find(r => r.id === selectedRole);
        if (role) {
          await setRolePermissionOverride(role.id, role.name, editingPermissions);
        }
      } else if (selectedUser) {
        const user = availableUsers.find(u => u.id === selectedUser);
        if (user) {
          await setUserPermissionOverride(user.id, user.displayName, editingPermissions);
        }
      }
      setShowPermissionModal(false);
      setEditingPermissions({});
      setSelectedRole('');
      setSelectedUser('');
    } catch (error) {
      console.error('Failed to save permissions:', error);
    }
  };

  const handleBulkOperation = async (operation: Omit<BulkPermissionOperation, 'targetIds'>) => {
    if (bulkTargets.length === 0 || bulkPermissions.length === 0) return;

    try {
      await executeBulkOperation({
        ...operation,
        targetIds: bulkTargets,
        permissions: bulkPermissions
      });
      setBulkTargets([]);
      setBulkPermissions([]);
    } catch (error) {
      console.error('Failed to execute bulk operation:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Channel Permissions
          </CardTitle>
          <CardDescription>
            Manage role and user permissions for this channel. 
            Channel-specific permissions override server-wide role permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="roles" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Roles
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="bulk" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Bulk Actions
              </TabsTrigger>
            </TabsList>

            {/* Role Permissions Tab */}
            <TabsContent value="roles" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Role Permission Overrides</h3>
                <Dialog open={showPermissionModal} onOpenChange={setShowPermissionModal}>
                  <DialogTrigger asChild>
                    <Button 
                      onClick={() => {
                        setSelectedUser('');
                        setEditingPermissions({});
                      }}
                      disabled={isUpdating}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Role Override
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Edit Role Permissions</DialogTitle>
                      <DialogDescription>
                        Configure channel-specific permission overrides for a role
                      </DialogDescription>
                    </DialogHeader>
                    <PermissionEditor
                      availableRoles={availableRoles}
                      selectedRole={selectedRole}
                      onRoleSelect={setSelectedRole}
                      permissions={editingPermissions}
                      onPermissionsChange={setEditingPermissions}
                      onSave={handleSavePermissions}
                      onCancel={() => {
                        setShowPermissionModal(false);
                        setEditingPermissions({});
                        setSelectedRole('');
                      }}
                      isUpdating={isUpdating}
                    />
                  </DialogContent>
                </Dialog>
              </div>

              {channelPermissions?.roleOverrides && channelPermissions.roleOverrides.length > 0 ? (
                <div className="space-y-3">
                  {channelPermissions.roleOverrides.map((override) => (
                    <PermissionOverrideCard
                      key={override.roleId}
                      type="role"
                      override={override}
                      onEdit={() => {
                        setSelectedRole(override.roleId);
                        setEditingPermissions(override.permissions);
                        setShowPermissionModal(true);
                      }}
                      onRemove={() => removeRoleOverride(override.roleId)}
                      isUpdating={isUpdating}
                    />
                  ))}
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                    <Users className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="font-semibold text-lg mb-2">No Role Overrides</h3>
                    <p className="text-muted-foreground mb-4">
                      This channel inherits all permissions from server roles. 
                      Add overrides to customize permissions for specific roles.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* User Permissions Tab */}
            <TabsContent value="users" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">User Permission Overrides</h3>
                <Dialog open={showPermissionModal && !selectedRole} onOpenChange={setShowPermissionModal}>
                  <DialogTrigger asChild>
                    <Button 
                      onClick={() => {
                        setSelectedRole('');
                        setEditingPermissions({});
                      }}
                      disabled={isUpdating}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add User Override
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Edit User Permissions</DialogTitle>
                      <DialogDescription>
                        Configure channel-specific permission overrides for a user
                      </DialogDescription>
                    </DialogHeader>
                    <PermissionEditor
                      availableUsers={availableUsers}
                      selectedUser={selectedUser}
                      onUserSelect={setSelectedUser}
                      permissions={editingPermissions}
                      onPermissionsChange={setEditingPermissions}
                      onSave={handleSavePermissions}
                      onCancel={() => {
                        setShowPermissionModal(false);
                        setEditingPermissions({});
                        setSelectedUser('');
                      }}
                      isUpdating={isUpdating}
                    />
                  </DialogContent>
                </Dialog>
              </div>

              {channelPermissions?.userOverrides && channelPermissions.userOverrides.length > 0 ? (
                <div className="space-y-3">
                  {channelPermissions.userOverrides.map((override) => (
                    <PermissionOverrideCard
                      key={override.userId}
                      type="user"
                      override={override}
                      onEdit={() => {
                        setSelectedUser(override.userId);
                        setEditingPermissions(override.permissions);
                        setShowPermissionModal(true);
                      }}
                      onRemove={() => removeUserOverride(override.userId)}
                      isUpdating={isUpdating}
                    />
                  ))}
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                    <User className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="font-semibold text-lg mb-2">No User Overrides</h3>
                    <p className="text-muted-foreground mb-4">
                      All users inherit permissions from their roles. 
                      Add overrides to grant or restrict permissions for specific users.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Bulk Actions Tab */}
            <TabsContent value="bulk" className="space-y-4">
              <BulkPermissionManager
                availableRoles={availableRoles}
                availableUsers={availableUsers}
                selectedTargets={bulkTargets}
                onTargetsChange={setBulkTargets}
                selectedPermissions={bulkPermissions}
                onPermissionsChange={setBulkPermissions}
                onExecuteOperation={handleBulkOperation}
                isUpdating={isUpdating}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper Components

interface PermissionEditorProps {
  availableRoles?: Array<{ id: string; name: string; powerLevel: number }>;
  availableUsers?: Array<{ id: string; displayName: string }>;
  selectedRole?: string;
  selectedUser?: string;
  onRoleSelect?: (roleId: string) => void;
  onUserSelect?: (userId: string) => void;
  permissions: Partial<MeloPermissions>;
  onPermissionsChange: (permissions: Partial<MeloPermissions>) => void;
  onSave: () => void;
  onCancel: () => void;
  isUpdating: boolean;
}

function PermissionEditor({
  availableRoles,
  availableUsers,
  selectedRole,
  selectedUser,
  onRoleSelect,
  onUserSelect,
  permissions,
  onPermissionsChange,
  onSave,
  onCancel,
  isUpdating
}: PermissionEditorProps) {
  const isRole = !!availableRoles;
  const selected = selectedRole || selectedUser;

  const handlePermissionToggle = (permission: keyof MeloPermissions) => {
    const newPermissions = { ...permissions };
    
    if (!(permission in permissions)) {
      newPermissions[permission] = true; // Allow
    } else if (permissions[permission]) {
      newPermissions[permission] = false; // Deny
    } else {
      delete newPermissions[permission]; // Inherit
    }
    
    onPermissionsChange(newPermissions);
  };

  const getPermissionStatus = (permission: keyof MeloPermissions): 'inherit' | 'allow' | 'deny' => {
    if (!(permission in permissions)) return 'inherit';
    return permissions[permission] ? 'allow' : 'deny';
  };

  return (
    <div className="space-y-6">
      {/* Target Selection */}
      <div className="space-y-2">
        <Label>{isRole ? 'Select Role' : 'Select User'}</Label>
        <Select 
          value={selected || ''} 
          onValueChange={isRole ? onRoleSelect : onUserSelect}
        >
          <SelectTrigger>
            <SelectValue placeholder={`Choose a ${isRole ? 'role' : 'user'}...`} />
          </SelectTrigger>
          <SelectContent>
            {isRole ? 
              availableRoles?.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Level {role.powerLevel}</Badge>
                    {role.name}
                  </div>
                </SelectItem>
              )) :
              availableUsers?.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.displayName}
                </SelectItem>
              ))
            }
          </SelectContent>
        </Select>
      </div>

      {selected && (
        <>
          <Separator />
          
          {/* Permission Categories */}
          <div className="space-y-6">
            {PERMISSION_CATEGORIES.map((category) => {
              const Icon = category.icon === 'settings' ? Settings :
                          category.icon === 'message-square' ? MessageSquare :
                          category.icon === 'mic' ? Mic :
                          category.icon === 'shield' ? Shield :
                          category.icon === 'crown' ? Crown : Settings;
              
              return (
                <Card key={category.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {category.name}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {category.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {category.permissions.map((permission) => {
                      const status = getPermissionStatus(permission);
                      return (
                        <div key={permission} className="flex items-center justify-between">
                          <Label className="text-sm font-normal cursor-pointer">
                            {permission.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/^./, str => str.toUpperCase())}
                          </Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePermissionToggle(permission)}
                            className={`min-w-20 ${
                              status === 'allow' ? 'text-green-600 hover:text-green-700' :
                              status === 'deny' ? 'text-red-600 hover:text-red-700' :
                              'text-gray-400 hover:text-gray-600'
                            }`}
                          >
                            <div className="flex items-center gap-1">
                              {status === 'allow' && <CheckCircle2 className="w-3 h-3" />}
                              {status === 'deny' && <XCircle className="w-3 h-3" />}
                              {status === 'inherit' && <Eye className="w-3 h-3" />}
                              <span className="text-xs">
                                {status === 'allow' ? 'Allow' :
                                 status === 'deny' ? 'Deny' : 'Inherit'}
                              </span>
                            </div>
                          </Button>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button onClick={onSave} disabled={isUpdating}>
              {isUpdating ? 'Saving...' : 'Save Permissions'}
            </Button>
            <Button variant="outline" onClick={onCancel} disabled={isUpdating}>
              Cancel
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

interface PermissionOverrideCardProps {
  type: 'role' | 'user';
  override: ChannelRolePermissionOverride | ChannelUserPermissionOverride;
  onEdit: () => void;
  onRemove: () => void;
  isUpdating: boolean;
}

function PermissionOverrideCard({ 
  type, 
  override, 
  onEdit, 
  onRemove, 
  isUpdating 
}: PermissionOverrideCardProps) {
  const isRole = type === 'role';
  const name = isRole ? (override as ChannelRolePermissionOverride).roleName : 
               (override as ChannelUserPermissionOverride).displayName;
  
  const permissionCount = Object.keys(override.permissions).length;
  const allowedCount = Object.values(override.permissions).filter(Boolean).length;
  const deniedCount = permissionCount - allowedCount;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isRole ? (
              <Crown className="w-5 h-5 text-yellow-600" />
            ) : (
              <User className="w-5 h-5 text-blue-600" />
            )}
            <div>
              <h4 className="font-semibold">{name}</h4>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                  {allowedCount} allowed
                </span>
                <span className="flex items-center gap-1">
                  <XCircle className="w-3 h-3 text-red-600" />
                  {deniedCount} denied
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onEdit}
              disabled={isUpdating}
            >
              Edit
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRemove}
              disabled={isUpdating}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface BulkPermissionManagerProps {
  availableRoles: Array<{ id: string; name: string; powerLevel: number }>;
  availableUsers: Array<{ id: string; displayName: string }>;
  selectedTargets: string[];
  onTargetsChange: (targets: string[]) => void;
  selectedPermissions: (keyof MeloPermissions)[];
  onPermissionsChange: (permissions: (keyof MeloPermissions)[]) => void;
  onExecuteOperation: (operation: Omit<BulkPermissionOperation, 'targetIds'>) => void;
  isUpdating: boolean;
}

function BulkPermissionManager({
  availableRoles,
  availableUsers,
  selectedTargets,
  onTargetsChange,
  selectedPermissions,
  onPermissionsChange,
  onExecuteOperation,
  isUpdating
}: BulkPermissionManagerProps) {
  const [targetType, setTargetType] = useState<'role' | 'user'>('role');
  const [operationType, setOperationType] = useState<'grant' | 'deny' | 'reset'>('grant');

  const availableTargets = targetType === 'role' ? availableRoles : availableUsers;
  
  const allPermissions = PERMISSION_CATEGORIES.flatMap(category => category.permissions);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Bulk Permission Management
          </CardTitle>
          <CardDescription>
            Apply permission changes to multiple roles or users at once
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Target Type Selection */}
          <div className="space-y-2">
            <Label>Target Type</Label>
            <Select value={targetType} onValueChange={(value: 'role' | 'user') => setTargetType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="role">Roles</SelectItem>
                <SelectItem value="user">Users</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Target Selection */}
          <div className="space-y-2">
            <Label>Select Targets</Label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded p-2">
              {availableTargets.map((target) => (
                <div key={target.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={target.id}
                    checked={selectedTargets.includes(target.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onTargetsChange([...selectedTargets, target.id]);
                      } else {
                        onTargetsChange(selectedTargets.filter(id => id !== target.id));
                      }
                    }}
                  />
                  <Label htmlFor={target.id} className="text-sm">
                    {targetType === 'role' ? 
                      (target as any).name : 
                      (target as any).displayName
                    }
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Operation Type */}
          <div className="space-y-2">
            <Label>Operation</Label>
            <Select 
              value={operationType} 
              onValueChange={(value: 'grant' | 'deny' | 'reset') => setOperationType(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grant">Grant Permissions</SelectItem>
                <SelectItem value="deny">Deny Permissions</SelectItem>
                <SelectItem value="reset">Reset to Inherit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Permission Selection */}
          {operationType !== 'reset' && (
            <div className="space-y-2">
              <Label>Select Permissions</Label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded p-2">
                {allPermissions.map((permission) => (
                  <div key={permission} className="flex items-center space-x-2">
                    <Checkbox
                      id={permission}
                      checked={selectedPermissions.includes(permission)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          onPermissionsChange([...selectedPermissions, permission]);
                        } else {
                          onPermissionsChange(selectedPermissions.filter(p => p !== permission));
                        }
                      }}
                    />
                    <Label htmlFor={permission} className="text-sm">
                      {permission.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/^./, str => str.toUpperCase())}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Execute Button */}
          <Button
            onClick={() => {
              onExecuteOperation({
                type: operationType as any,
                targetType,
                permissions: selectedPermissions,
                action: operationType === 'grant' ? 'allow' : 
                       operationType === 'deny' ? 'deny' : 'inherit'
              });
            }}
            disabled={
              isUpdating || 
              selectedTargets.length === 0 || 
              (operationType !== 'reset' && selectedPermissions.length === 0)
            }
            className="w-full"
          >
            {isUpdating ? 'Processing...' : `${operationType === 'grant' ? 'Grant' : operationType === 'deny' ? 'Deny' : 'Reset'} Permissions`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}