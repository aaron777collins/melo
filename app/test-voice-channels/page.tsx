"use client";

import React from "react";
import { VoiceChannelList } from "@/components/voice/voice-channel-list";
import { VoiceCallHistory } from "@/components/voice/voice-call-history";
import { useVoiceChannelManager } from "@/hooks/use-voice-channel-manager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TestVoiceChannelsPage() {
  const {
    isConnected,
    currentChannelId,
    participants,
    callHistory,
    joinVoiceChannel,
    leaveVoiceChannel,
    showIncomingCall,
  } = useVoiceChannelManager();

  // Mock data for testing
  const mockChannels = [
    {
      id: "test-voice-1",
      name: "General Voice",
      type: "voice" as const,
      participantCount: 0,
      hasActivity: false,
    },
    {
      id: "test-voice-2", 
      name: "Gaming Voice",
      type: "voice" as const,
      participantCount: 2,
      hasActivity: true,
    },
    {
      id: "test-video-1",
      name: "Video Chat",
      type: "video" as const,
      participantCount: 1,
      hasActivity: true,
    },
  ];

  const handleTestIncomingCall = () => {
    showIncomingCall({
      channelId: "test-voice-1",
      channelName: "General Voice",
      spaceId: "test-space-1",
      spaceName: "Test Server",
      callerId: "user-123",
      callerName: "John Doe",
      callerAvatar: undefined,
      isVideoCall: false,
      participantCount: 3,
      timestamp: Date.now(),
    });
  };

  const handleTestVideoCall = () => {
    showIncomingCall({
      channelId: "test-video-1", 
      channelName: "Video Chat",
      spaceId: "test-space-1",
      spaceName: "Test Server",
      callerId: "user-456",
      callerName: "Jane Smith",
      callerAvatar: undefined,
      isVideoCall: true,
      participantCount: 1,
      timestamp: Date.now(),
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Voice Channel Management Test</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Test the comprehensive voice channel system
          </p>
        </div>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle>Voice Channel Status</CardTitle>
          <CardDescription>Current connection and participant information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-medium">Connection Status</p>
              <p className={`${isConnected ? "text-green-600" : "text-zinc-500"}`}>
                {isConnected ? "Connected" : "Disconnected"}
              </p>
            </div>
            <div>
              <p className="font-medium">Current Channel</p>
              <p className="text-zinc-600 dark:text-zinc-400">
                {currentChannelId || "None"}
              </p>
            </div>
            <div>
              <p className="font-medium">Participants</p>
              <p className="text-zinc-600 dark:text-zinc-400">
                {participants.length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Test Actions</CardTitle>
          <CardDescription>Test various voice channel features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleTestIncomingCall}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm font-medium transition-colors"
            >
              Test Incoming Voice Call
            </button>
            <button
              onClick={handleTestVideoCall}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-md text-sm font-medium transition-colors"
            >
              Test Incoming Video Call
            </button>
            {isConnected && (
              <button
                onClick={() => leaveVoiceChannel()}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm font-medium transition-colors"
              >
                Leave Current Channel
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="channels" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="channels">Voice Channels</TabsTrigger>
          <TabsTrigger value="history">Call History</TabsTrigger>
        </TabsList>

        <TabsContent value="channels" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Voice Channel List</CardTitle>
              <CardDescription>
                Voice and video channels with participant management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VoiceChannelList
                spaceId="test-space-1"
                channels={mockChannels}
                userRole="admin"
                className="max-w-md"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Call History</CardTitle>
              <CardDescription>
                View and manage your call history with search and filtering
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VoiceCallHistory className="max-w-2xl" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Current Participants */}
      {participants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Current Participants ({participants.length})</CardTitle>
            <CardDescription>Users in your current voice channel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className={`p-3 rounded-lg border ${
                    participant.isSpeaking
                      ? "border-green-500 bg-green-500/10"
                      : "border-zinc-200 dark:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{participant.displayName}</p>
                      <p className="text-sm text-zinc-500">
                        {participant.isLocal ? "You" : "Remote"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          participant.isAudioEnabled ? "bg-green-500" : "bg-red-500"
                        }`}
                        title={participant.isAudioEnabled ? "Mic on" : "Mic off"}
                      />
                      <div
                        className={`w-2 h-2 rounded-full ${
                          participant.isVideoEnabled ? "bg-blue-500" : "bg-gray-500"
                        }`}
                        title={participant.isVideoEnabled ? "Video on" : "Video off"}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}