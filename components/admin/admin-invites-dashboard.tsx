/**
 * Admin Invites Dashboard
 * 
 * Main dashboard for managing invite codes for external users.
 */

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Plus, Users, Clock, CheckCircle, XCircle } from "lucide-react";
import { InviteStats } from "./invite-stats";
import { InviteList } from "./invite-list";
import { CreateInviteModal } from "./create-invite-modal";

interface AdminInvite {
  id: string;
  invitedUserId: string;
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
  used: boolean;
  usedAt?: string;
  notes?: string;
}

interface InviteData {
  invites: AdminInvite[];
  privateMode: boolean;
  inviteOnly: boolean;
}

interface InviteStats {
  totalInvites: number;
  activeInvites: number;
  usedInvites: number;
  expiredInvites: number;
}

export function AdminInvitesDashboard() {
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [stats, setStats] = useState<InviteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const fetchInvites = async () => {
    try {
      setRefreshing(true);
      
      // Fetch invites list
      const invitesResponse = await fetch("/api/admin/invites?includeUsed=true&includeExpired=true");
      const invitesData = await invitesResponse.json();
      
      // Fetch stats
      const statsResponse = await fetch("/api/admin/invites?status=true");
      const statsData = await statsResponse.json();
      
      if (invitesData.success) {
        setInviteData(invitesData.data);
      }
      
      if (statsData.success) {
        setStats({
          totalInvites: statsData.data.totalInvites,
          activeInvites: statsData.data.activeInvites,
          usedInvites: statsData.data.usedInvites,
          expiredInvites: statsData.data.expiredInvites,
        });
      }
    } catch (error) {
      console.error("Failed to fetch invites:", error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchInvites();
  }, []);
  
  const handleInviteRevoked = () => {
    fetchInvites();
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Invites</h1>
          <p className="text-muted-foreground">
            Manage invite codes for external users
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchInvites}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          
          <CreateInviteModal onInviteCreated={fetchInvites} />
        </div>
      </div>
      
      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalInvites}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.activeInvites}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Used</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.usedInvites}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expired</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.expiredInvites}</div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Server Status Info */}
      {inviteData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Server Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Private Mode:</span>
              <span className={`text-sm font-medium ${inviteData.privateMode ? 'text-orange-600' : 'text-green-600'}`}>
                {inviteData.privateMode ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Invite Only:</span>
              <span className={`text-sm font-medium ${inviteData.inviteOnly ? 'text-orange-600' : 'text-green-600'}`}>
                {inviteData.inviteOnly ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Main Content */}
      <Tabs defaultValue="invites" className="space-y-4">
        <TabsList>
          <TabsTrigger value="invites">Invites</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="invites" className="space-y-4">
          <InviteList 
            invites={inviteData?.invites || []} 
            onInviteRevoked={handleInviteRevoked}
            refreshing={refreshing}
          />
        </TabsContent>
        
        <TabsContent value="stats" className="space-y-4">
          <InviteStats stats={stats} invites={inviteData?.invites || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}