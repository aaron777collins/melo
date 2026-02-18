"use client";

import React, { useState } from "react";
import { VoiceChannelList } from "@/components/voice/voice-channel-list";
import { VoiceCallHistory } from "@/components/voice/voice-call-history";
import { CameraPreview } from "@/components/voice/camera-preview";
import { EnhancedVideoGrid } from "@/components/video-call/enhanced-video-grid";
import { EnhancedVideoTile } from "@/components/video-call/enhanced-video-tile";
import { useVoiceChannelManager } from "@/hooks/use-voice-channel-manager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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

  // UI State
  const [showCameraPreview, setShowCameraPreview] = useState(false);
  const [showVideoGrid, setShowVideoGrid] = useState(false);
  const [videoGridMode, setVideoGridMode] = useState<"demo" | "real">("demo");

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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="channels">Voice Channels</TabsTrigger>
          <TabsTrigger value="history">Call History</TabsTrigger>
          <TabsTrigger value="camera">Camera Preview</TabsTrigger>
          <TabsTrigger value="video">Video Grid</TabsTrigger>
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

        <TabsContent value="camera" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Camera Preview</CardTitle>
              <CardDescription>
                Pre-call camera and microphone setup with device selection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  The camera preview component allows users to test their camera and microphone before joining a call.
                  It includes device selection, permission handling, and responsive design.
                </p>
                
                <Dialog open={showCameraPreview} onOpenChange={setShowCameraPreview}>
                  <DialogTrigger asChild>
                    <Button className="w-full max-w-sm">
                      Open Camera Preview
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] p-0">
                    <div className="h-[80vh]">
                      <CameraPreview
                        onJoinCall={() => {
                          setShowCameraPreview(false);
                          // In a real app, this would join the call
                          alert("Joining call with selected settings...");
                        }}
                        onCancel={() => setShowCameraPreview(false)}
                        defaultAudioEnabled={true}
                        defaultVideoEnabled={true}
                      />
                    </div>
                  </DialogContent>
                </Dialog>

                <div className="text-xs text-zinc-500 space-y-1">
                  <p>Features demonstrated:</p>
                  <ul className="list-disc list-inside ml-4 space-y-0.5">
                    <li>Camera and microphone preview</li>
                    <li>Device selection (camera, microphone, speakers)</li>
                    <li>Permission handling and error states</li>
                    <li>Audio/video toggle controls</li>
                    <li>Responsive design for mobile and desktop</li>
                    <li>Real-time status indicators</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="video" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Enhanced Video Grid</CardTitle>
              <CardDescription>
                Adaptive video grid with participant tiles, speaking indicators, and responsive layouts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant={videoGridMode === "demo" ? "default" : "outline"}
                    onClick={() => {
                      setVideoGridMode("demo");
                      setShowVideoGrid(true);
                    }}
                  >
                    Demo Mode (Mock Data)
                  </Button>
                  <Button
                    variant={videoGridMode === "real" ? "default" : "outline"}
                    onClick={() => {
                      setVideoGridMode("real");
                      setShowVideoGrid(true);
                    }}
                    disabled={!isConnected}
                  >
                    Real Mode (Current Call)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowVideoGrid(false)}
                  >
                    Hide Grid
                  </Button>
                </div>

                {showVideoGrid && (
                  <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                    <div className="h-96 bg-zinc-900">
                      {videoGridMode === "real" ? (
                        <EnhancedVideoGrid
                          showControls={true}
                          canModerate={true}
                          onParticipantAction={(action, participantId) => {
                            console.log(`Action: ${action} for participant: ${participantId}`);
                          }}
                        />
                      ) : (
                        <div className="h-full p-4 bg-zinc-900 text-white flex items-center justify-center">
                          <div className="text-center">
                            <p className="text-lg font-medium mb-2">Demo Mode</p>
                            <p className="text-sm text-zinc-400 max-w-md">
                              In demo mode, you would see mock participants with video tiles, 
                              speaking indicators, and responsive grid layouts. Connect to a real 
                              call to see live participants.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="text-xs text-zinc-500 space-y-1">
                  <p>Enhanced Video Grid Features:</p>
                  <ul className="list-disc list-inside ml-4 space-y-0.5">
                    <li>Adaptive grid layouts (1x1, 2x2, 3x3, 4x4)</li>
                    <li>Presenter mode with screen sharing</li>
                    <li>Video tiles with speaking indicators</li>
                    <li>Participant controls (pin, mute, kick)</li>
                    <li>Connection quality indicators</li>
                    <li>Responsive design for all screen sizes</li>
                    <li>Fullscreen mode support</li>
                    <li>Audio level visualization</li>
                  </ul>
                </div>
              </div>
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