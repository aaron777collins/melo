"use client";

import { useState, useEffect } from "react";
import { Copy, Download, LinkIcon, QrCode, Plus, Trash2, Settings, ExternalLink, BarChart3, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useMatrix } from "@/components/providers/matrix-provider";
import { useModal } from "@/hooks/use-modal-store";
import { createInviteService, InviteLink, CreateInviteOptions, MatrixInviteService } from "@/lib/matrix/invites";
import { useInviteManagement } from "@/hooks/use-invite-management";
import { InviteAnalyticsComponent } from "./invite-analytics";

interface EnhancedInviteGeneratorProps {
  spaceId: string;
  spaceName: string;
}

export function EnhancedInviteGenerator({ spaceId, spaceName }: EnhancedInviteGeneratorProps) {
  const { client } = useMatrix();
  const { onOpen } = useModal();
  const [inviteService, setInviteService] = useState<MatrixInviteService | null>(null);
  
  // Form state
  const [customSlug, setCustomSlug] = useState("");
  const [slugValid, setSlugValid] = useState(true);
  const [slugError, setSlugError] = useState("");
  const [createAlias, setCreateAlias] = useState(false);
  const [expirationEnabled, setExpirationEnabled] = useState(false);
  const [expirationPeriod, setExpirationPeriod] = useState("7d");
  const [maxUsesEnabled, setMaxUsesEnabled] = useState(false);
  const [maxUses, setMaxUses] = useState(10);
  
  // State
  const [isCreating, setIsCreating] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState<InviteLink | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Enhanced invite management
  const {
    invites,
    analytics,
    refreshInvites,
    cleanupExpiredInvites,
    trackInviteUsage,
    revokeInvite,
    formatTimeUntilExpiry,
  } = useInviteManagement(spaceId, inviteService);

  // Initialize invite service
  useEffect(() => {
    if (client) {
      const service = createInviteService(client);
      setInviteService(service);
    }
  }, [client]);

  // Validate slug on change
  useEffect(() => {
    if (customSlug && inviteService) {
      const validation = inviteService.validateSlug(customSlug);
      setSlugValid(validation.valid);
      setSlugError(validation.error || "");
    } else {
      setSlugValid(true);
      setSlugError("");
    }
  }, [customSlug, inviteService]);

  const handleCreateInvite = async () => {
    if (!inviteService) return;

    setIsCreating(true);
    
    try {
      const options: CreateInviteOptions = {
        slug: customSlug || undefined,
        createAlias: createAlias && !!customSlug,
      };

      if (expirationEnabled) {
        const expirationMs = parseExpirationPeriod(expirationPeriod);
        options.expirationMs = expirationMs;
      }

      if (maxUsesEnabled) {
        options.maxUses = maxUses;
      }

      const result = await inviteService.createInvite(spaceId, options);
      
      if (result.success && result.invite) {
        // Save the invite
        inviteService.saveInvite(result.invite);
        
        // Refresh the list
        refreshInvites();
        
        // Select the new invite
        setSelectedInvite(result.invite);
        
        // Generate QR code
        await generateQRCode(result.invite);
        
        // Reset form
        setCustomSlug("");
        setCreateAlias(false);
        setExpirationEnabled(false);
        setMaxUsesEnabled(false);
        
        toast.success("Invite link created successfully!");
      } else {
        toast.error(result.error || "Failed to create invite link");
      }
    } catch (error) {
      toast.error("Failed to create invite link");
      console.error("Create invite error:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const generateQRCode = async (invite: InviteLink) => {
    if (!inviteService) return;

    const result = await inviteService.generateQRCode(invite, { size: 256 });
    if (result.success) {
      setQrCodeDataUrl(result.dataUrl || null);
    } else {
      toast.error("Failed to generate QR code");
    }
  };

  const handleSelectInvite = async (invite: InviteLink) => {
    setSelectedInvite(invite);
    await generateQRCode(invite);
  };

  const handleCopyInvite = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Invite link copied to clipboard!");
    } catch {
      toast.error("Failed to copy invite link");
    }
  };

  const handleRevokeInvite = (invite: InviteLink) => {
    onOpen("revokeInvite", {
      inviteToRevoke: invite,
      onInviteRevoked: () => {
        refreshInvites();
        if (selectedInvite?.url === invite.url) {
          setSelectedInvite(null);
          setQrCodeDataUrl(null);
        }
      }
    });
  };

  const handleCleanupExpired = () => {
    const cleanedCount = cleanupExpiredInvites();
    if (cleanedCount > 0) {
      toast.success(`Cleaned up ${cleanedCount} expired invite${cleanedCount === 1 ? '' : 's'}`);
    } else {
      toast.info("No expired invites to clean up");
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeDataUrl || !selectedInvite) return;

    const link = document.createElement('a');
    link.download = `${spaceName}-invite-qr.png`;
    link.href = qrCodeDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseExpirationPeriod = (period: string): number => {
    const value = parseInt(period);
    const unit = period.slice(-1);
    
    switch (unit) {
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      case 'w': return value * 7 * 24 * 60 * 60 * 1000;
      default: return 7 * 24 * 60 * 60 * 1000; // Default 7 days
    }
  };

  const formatExpirationDate = (date: Date): string => {
    return date.toLocaleString();
  };

  const getInviteBadgeVariant = (invite: any) => {
    if (invite.isExpired) return "destructive";
    if (invite.expiryStatus === "expiring-soon") return "secondary";
    return "default";
  };

  if (!client) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Matrix client not available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Manage
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Create Tab */}
        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                Create Invite Link
              </CardTitle>
              <CardDescription>
                Generate a shareable invite link for {spaceName}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="custom-slug">Custom Slug (optional)</Label>
                <Input
                  id="custom-slug"
                  placeholder="awesome-community"
                  value={customSlug}
                  onChange={(e) => setCustomSlug(e.target.value)}
                  className={!slugValid ? "border-red-500" : ""}
                />
                {!slugValid && slugError && (
                  <p className="text-sm text-red-500">{slugError}</p>
                )}
                {customSlug && slugValid && (
                  <p className="text-sm text-muted-foreground">
                    Invite URL: {typeof window !== 'undefined' ? window.location.origin : 'https://haos.app'}/invite/{customSlug}
                  </p>
                )}
              </div>

              {customSlug && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="create-alias"
                    checked={createAlias}
                    onCheckedChange={setCreateAlias}
                  />
                  <Label htmlFor="create-alias" className="text-sm">
                    Create Matrix room alias (recommended)
                  </Label>
                </div>
              )}

              {/* Advanced Options */}
              <div className="space-y-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Advanced Options
                  </span>
                </Button>

                {showAdvanced && (
                  <div className="space-y-4 p-4 border rounded-lg">
                    {/* Expiration */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="expiration"
                          checked={expirationEnabled}
                          onCheckedChange={setExpirationEnabled}
                        />
                        <Label htmlFor="expiration" className="text-sm">
                          Set expiration time
                        </Label>
                      </div>
                      {expirationEnabled && (
                        <Select value={expirationPeriod} onValueChange={setExpirationPeriod}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1h">1 hour</SelectItem>
                            <SelectItem value="6h">6 hours</SelectItem>
                            <SelectItem value="1d">1 day</SelectItem>
                            <SelectItem value="7d">7 days</SelectItem>
                            <SelectItem value="30d">30 days</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {/* Max Uses */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="max-uses"
                          checked={maxUsesEnabled}
                          onCheckedChange={setMaxUsesEnabled}
                        />
                        <Label htmlFor="max-uses" className="text-sm">
                          Limit number of uses
                        </Label>
                      </div>
                      {maxUsesEnabled && (
                        <Input
                          type="number"
                          min="1"
                          max="1000"
                          value={maxUses}
                          onChange={(e) => setMaxUses(parseInt(e.target.value) || 10)}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Button 
                onClick={handleCreateInvite} 
                disabled={isCreating || (customSlug.length > 0 && !slugValid)}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                {isCreating ? "Creating..." : "Create Invite Link"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manage Tab */}
        <TabsContent value="manage" className="space-y-4">
          {/* Bulk Actions */}
          {analytics.expiredInvites > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="font-medium">Expired Invites Found</p>
                      <p className="text-sm text-muted-foreground">
                        {analytics.expiredInvites} invite{analytics.expiredInvites === 1 ? '' : 's'} can be cleaned up
                      </p>
                    </div>
                  </div>
                  <Button onClick={handleCleanupExpired} variant="outline" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clean Up
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Existing Invites */}
          {invites.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Active Invites</CardTitle>
                <CardDescription>
                  Manage your current invite links
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64 w-full">
                  <div className="space-y-2">
                    {invites.map((invite, index) => (
                      <div
                        key={index}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedInvite?.url === invite.url 
                            ? "bg-accent border-accent-foreground" 
                            : "hover:bg-accent/50"
                        }`}
                        onClick={() => handleSelectInvite(invite)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm truncate">
                                {invite.slug || "Standard Link"}
                              </p>
                              <Badge variant={getInviteBadgeVariant(invite)} className="text-xs">
                                {invite.isExpired ? 'Expired' : 
                                 invite.expiryStatus === 'expiring-soon' ? 'Expiring Soon' : 'Active'}
                              </Badge>
                              {invite.alias && <Badge variant="secondary" className="text-xs">Alias</Badge>}
                              {invite.currentUses > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {invite.currentUses} use{invite.currentUses === 1 ? '' : 's'}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Created: {invite.createdAt.toLocaleDateString()}
                            </p>
                            {invite.expiresAt && !invite.isExpired && invite.timeUntilExpiry && (
                              <p className="text-xs text-amber-600 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Expires in {formatTimeUntilExpiry(invite.timeUntilExpiry)}
                              </p>
                            )}
                            {invite.isExpired && (
                              <p className="text-xs text-red-600">
                                Expired: {formatExpirationDate(invite.expiresAt!)}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyInvite(invite.url);
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRevokeInvite(invite);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <LinkIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">No invites created yet</h3>
                <p className="text-sm text-muted-foreground">
                  Switch to the Create tab to generate your first invite link.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Selected Invite Details */}
          {selectedInvite && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Share Invite
                </CardTitle>
                <CardDescription>
                  Share this invite link to let people join {spaceName}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Invite Link</Label>
                  <div className="flex gap-2">
                    <Textarea
                      value={selectedInvite.url}
                      readOnly
                      className="min-h-0 resize-none"
                      rows={2}
                    />
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyInvite(selectedInvite.url)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(selectedInvite.url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {qrCodeDataUrl && (
                  <div className="space-y-2">
                    <Label>QR Code</Label>
                    <div className="flex flex-col items-center space-y-2 p-4 border rounded-lg">
                      <img
                        src={qrCodeDataUrl}
                        alt="Invite QR Code"
                        className="w-64 h-64"
                      />
                      <Button onClick={downloadQRCode} variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download QR Code
                      </Button>
                    </div>
                  </div>
                )}

                <Separator />

                <div className="space-y-2 text-sm text-muted-foreground">
                  <p><strong>Created:</strong> {selectedInvite.createdAt.toLocaleString()}</p>
                  {selectedInvite.expiresAt && (
                    <p><strong>Expires:</strong> {formatExpirationDate(selectedInvite.expiresAt)}</p>
                  )}
                  {selectedInvite.maxUses && selectedInvite.maxUses > 0 && (
                    <p><strong>Uses:</strong> {selectedInvite.currentUses} / {selectedInvite.maxUses}</p>
                  )}
                  {selectedInvite.alias && (
                    <p><strong>Matrix Alias:</strong> {selectedInvite.alias}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <InviteAnalyticsComponent
            analytics={analytics}
            invites={invites}
            formatTimeUntilExpiry={formatTimeUntilExpiry}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}