"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Settings,
  Monitor,
  Video,
  Volume2,
  RotateCcw,
  Loader2
} from "lucide-react";

import { ActionTooltip } from "@/components/action-tooltip";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface CameraPreviewProps {
  onJoinCall?: () => void;
  onCancel?: () => void;
  defaultAudioEnabled?: boolean;
  defaultVideoEnabled?: boolean;
  className?: string;
}

interface MediaDevice {
  deviceId: string;
  label: string;
  kind: "audioinput" | "videoinput" | "audiooutput";
}

export function CameraPreview({
  onJoinCall,
  onCancel,
  defaultAudioEnabled = true,
  defaultVideoEnabled = true,
  className
}: CameraPreviewProps) {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(defaultAudioEnabled);
  const [videoEnabled, setVideoEnabled] = useState(defaultVideoEnabled);
  const [error, setError] = useState<string | null>(null);

  // Device state
  const [audioDevices, setAudioDevices] = useState<MediaDevice[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDevice[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDevice[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>("");
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>("");
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>("");

  // Get available media devices
  const getMediaDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const audio = devices
        .filter(device => device.kind === "audioinput")
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.slice(-4)}`,
          kind: "audioinput" as const
        }));

      const video = devices
        .filter(device => device.kind === "videoinput")
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(-4)}`,
          kind: "videoinput" as const
        }));

      const audioOutput = devices
        .filter(device => device.kind === "audiooutput")
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Speaker ${device.deviceId.slice(-4)}`,
          kind: "audiooutput" as const
        }));

      setAudioDevices(audio);
      setVideoDevices(video);
      setAudioOutputDevices(audioOutput);

      // Set default devices
      if (audio.length > 0 && !selectedAudioDevice) {
        setSelectedAudioDevice(audio[0].deviceId);
      }
      if (video.length > 0 && !selectedVideoDevice) {
        setSelectedVideoDevice(video[0].deviceId);
      }
      if (audioOutput.length > 0 && !selectedAudioOutput) {
        setSelectedAudioOutput(audioOutput[0].deviceId);
      }
    } catch (error) {
      console.error("Failed to get media devices:", error);
    }
  }, [selectedAudioDevice, selectedVideoDevice, selectedAudioOutput]);

  // Initialize media stream
  const initializeMedia = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Request permissions and get stream
      const constraints: MediaStreamConstraints = {
        audio: audioEnabled ? {
          deviceId: selectedAudioDevice ? { exact: selectedAudioDevice } : undefined
        } : false,
        video: videoEnabled ? {
          deviceId: selectedVideoDevice ? { exact: selectedVideoDevice } : undefined,
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 }
        } : false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Attach stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true; // Always mute preview to avoid feedback
      }

      setHasPermissions(true);
      await getMediaDevices(); // Refresh device list with labels
    } catch (error) {
      console.error("Failed to get media stream:", error);
      setError(error instanceof Error ? error.message : "Failed to access camera/microphone");
      setHasPermissions(false);
    } finally {
      setIsLoading(false);
    }
  }, [audioEnabled, videoEnabled, selectedAudioDevice, selectedVideoDevice, getMediaDevices]);

  // Initialize on mount
  useEffect(() => {
    initializeMedia();
    
    // Cleanup on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [initializeMedia]);

  // Toggle audio
  const toggleAudio = useCallback(async () => {
    const newAudioState = !audioEnabled;
    setAudioEnabled(newAudioState);
    
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = newAudioState;
      }
    }
  }, [audioEnabled]);

  // Toggle video
  const toggleVideo = useCallback(async () => {
    const newVideoState = !videoEnabled;
    setVideoEnabled(newVideoState);
    
    if (newVideoState && !streamRef.current?.getVideoTracks().length) {
      // Need to re-initialize if video track doesn't exist
      await initializeMedia();
    } else if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = newVideoState;
      }
    }
  }, [videoEnabled, initializeMedia]);

  // Handle join call
  const handleJoinCall = useCallback(() => {
    if (onJoinCall) {
      onJoinCall();
    }
  }, [onJoinCall]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (onCancel) {
      onCancel();
    }
  }, [onCancel]);

  // Retry media access
  const retryMediaAccess = useCallback(() => {
    initializeMedia();
  }, [initializeMedia]);

  return (
    <div className={`flex flex-col h-full bg-zinc-900 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <h2 className="text-lg font-semibold text-white mb-1">Camera Preview</h2>
        <p className="text-sm text-zinc-400">Set up your camera and microphone before joining</p>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4">
        {/* Video preview */}
        <div className="flex-1 flex flex-col">
          <div className="relative flex-1 min-h-[300px] bg-zinc-800 rounded-lg overflow-hidden">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-3" />
                  <p className="text-zinc-400 text-sm">Setting up camera...</p>
                </div>
              </div>
            )}

            {error && !isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <CameraOff className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <p className="text-red-400 font-medium mb-2">Camera Access Failed</p>
                  <p className="text-zinc-400 text-sm mb-4 max-w-md">{error}</p>
                  <Button
                    onClick={retryMediaAccess}
                    variant="outline"
                    size="sm"
                    className="border-zinc-600"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              </div>
            )}

            {!videoEnabled && !isLoading && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-900">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center mb-4">
                    <Camera className="w-10 h-10 text-white" />
                  </div>
                  <p className="text-white font-medium text-lg">Camera Off</p>
                  <p className="text-zinc-300 text-sm">Click the camera button to turn it on</p>
                </div>
              </div>
            )}

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${
                !videoEnabled || isLoading || error ? 'hidden' : ''
              }`}
            />

            {/* Media status overlay */}
            <div className="absolute bottom-4 left-4 right-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Audio indicator */}
                  <div className={`
                    flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                    ${audioEnabled 
                      ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                      : "bg-red-500/20 text-red-400 border border-red-500/30"
                    }
                  `}>
                    {audioEnabled ? (
                      <Mic className="w-3 h-3" />
                    ) : (
                      <MicOff className="w-3 h-3" />
                    )}
                    <span>{audioEnabled ? "Mic On" : "Mic Off"}</span>
                  </div>

                  {/* Video indicator */}
                  <div className={`
                    flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                    ${videoEnabled 
                      ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                      : "bg-red-500/20 text-red-400 border border-red-500/30"
                    }
                  `}>
                    {videoEnabled ? (
                      <Video className="w-3 h-3" />
                    ) : (
                      <CameraOff className="w-3 h-3" />
                    )}
                    <span>{videoEnabled ? "Camera On" : "Camera Off"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Controls sidebar */}
        <div className="lg:w-80 flex flex-col gap-4">
          {/* Media controls */}
          <div className="bg-zinc-800 rounded-lg p-4">
            <h3 className="text-white font-medium mb-4">Media Controls</h3>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Audio toggle */}
              <ActionTooltip 
                side="top" 
                label={audioEnabled ? "Mute microphone" : "Unmute microphone"}
              >
                <button
                  onClick={toggleAudio}
                  disabled={isLoading}
                  className={`
                    flex flex-col items-center gap-2 p-4 rounded-lg transition-all
                    ${audioEnabled
                      ? "bg-green-500/20 border border-green-500/30 text-green-400"
                      : "bg-red-500/20 border border-red-500/30 text-red-400"
                    }
                    ${isLoading ? "opacity-50 cursor-not-allowed" : "hover:scale-105"}
                  `}
                >
                  {audioEnabled ? (
                    <Mic className="w-6 h-6" />
                  ) : (
                    <MicOff className="w-6 h-6" />
                  )}
                  <span className="text-xs font-medium">
                    {audioEnabled ? "Microphone" : "Muted"}
                  </span>
                </button>
              </ActionTooltip>

              {/* Video toggle */}
              <ActionTooltip 
                side="top" 
                label={videoEnabled ? "Turn off camera" : "Turn on camera"}
              >
                <button
                  onClick={toggleVideo}
                  disabled={isLoading}
                  className={`
                    flex flex-col items-center gap-2 p-4 rounded-lg transition-all
                    ${videoEnabled
                      ? "bg-green-500/20 border border-green-500/30 text-green-400"
                      : "bg-red-500/20 border border-red-500/30 text-red-400"
                    }
                    ${isLoading ? "opacity-50 cursor-not-allowed" : "hover:scale-105"}
                  `}
                >
                  {videoEnabled ? (
                    <Camera className="w-6 h-6" />
                  ) : (
                    <CameraOff className="w-6 h-6" />
                  )}
                  <span className="text-xs font-medium">
                    {videoEnabled ? "Camera" : "Camera Off"}
                  </span>
                </button>
              </ActionTooltip>
            </div>
          </div>

          {/* Device selection */}
          <div className="bg-zinc-800 rounded-lg p-4">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Device Settings
            </h3>

            <div className="space-y-3">
              {/* Camera selection */}
              {videoDevices.length > 0 && (
                <div>
                  <label className="text-sm text-zinc-400 mb-1 block">Camera</label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-start border-zinc-600">
                        <Camera className="w-4 h-4 mr-2" />
                        {videoDevices.find(d => d.deviceId === selectedVideoDevice)?.label || "Select Camera"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-full">
                      {videoDevices.map((device) => (
                        <DropdownMenuItem
                          key={device.deviceId}
                          onClick={() => setSelectedVideoDevice(device.deviceId)}
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          {device.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              {/* Microphone selection */}
              {audioDevices.length > 0 && (
                <div>
                  <label className="text-sm text-zinc-400 mb-1 block">Microphone</label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-start border-zinc-600">
                        <Mic className="w-4 h-4 mr-2" />
                        {audioDevices.find(d => d.deviceId === selectedAudioDevice)?.label || "Select Microphone"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-full">
                      {audioDevices.map((device) => (
                        <DropdownMenuItem
                          key={device.deviceId}
                          onClick={() => setSelectedAudioDevice(device.deviceId)}
                        >
                          <Mic className="w-4 h-4 mr-2" />
                          {device.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              {/* Speaker selection */}
              {audioOutputDevices.length > 0 && (
                <div>
                  <label className="text-sm text-zinc-400 mb-1 block">Speaker</label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-start border-zinc-600">
                        <Volume2 className="w-4 h-4 mr-2" />
                        {audioOutputDevices.find(d => d.deviceId === selectedAudioOutput)?.label || "Select Speaker"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-full">
                      {audioOutputDevices.map((device) => (
                        <DropdownMenuItem
                          key={device.deviceId}
                          onClick={() => setSelectedAudioOutput(device.deviceId)}
                        >
                          <Volume2 className="w-4 h-4 mr-2" />
                          {device.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="p-4 border-t border-zinc-800">
        <div className="flex justify-between items-center">
          <Button
            onClick={handleCancel}
            variant="outline"
            className="border-zinc-600"
          >
            Cancel
          </Button>
          
          <Button
            onClick={handleJoinCall}
            disabled={isLoading || (error !== null && !hasPermissions)}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Setting up...
              </>
            ) : (
              <>
                <Video className="w-4 h-4 mr-2" />
                Join Call
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}