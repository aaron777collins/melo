"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Video, 
  VideoOff,
  Play,
  Square,
  Settings,
  TestTube,
  AlertCircle,
  CheckCircle,
  Loader2,
  Eye
} from "lucide-react";

import { useMediaDevices } from "@/hooks/use-media-devices";
import { useAudioTesting } from "@/hooks/use-audio-testing";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

// Video quality presets
const VIDEO_QUALITY_PRESETS = [
  { label: "Low (480p)", value: "480p", width: 640, height: 480, frameRate: 15, bitrate: 500 },
  { label: "Medium (720p)", value: "720p", width: 1280, height: 720, frameRate: 30, bitrate: 1500 },
  { label: "High (1080p)", value: "1080p", width: 1920, height: 1080, frameRate: 30, bitrate: 3000 },
  { label: "Ultra (1440p)", value: "1440p", width: 2560, height: 1440, frameRate: 60, bitrate: 6000 },
] as const;

interface VoiceVideoSettings {
  // Voice activation settings
  voiceActivationEnabled: boolean;
  voiceActivationThreshold: number;
  pushToTalkKey: string;
  
  // Audio processing
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  
  // Video settings
  videoQuality: string;
  frameRate: number;
  bitrate: number;
  
  // Volume levels
  inputVolume: number;
  outputVolume: number;
}

export function VoiceVideoForm() {
  // Media devices hook
  const {
    audioInputs,
    audioOutputs,
    videoInputs,
    isEnumerating,
    hasPermissions,
    error: deviceError,
    settings: deviceSettings,
    requestPermissions,
    enumerateDevices,
    selectDevice,
    getSelectedDevice,
  } = useMediaDevices();

  // Audio testing hook
  const {
    isRecording,
    isPlaying,
    isTesting,
    audioLevel,
    error: testError,
    startMicrophoneTest,
    stopMicrophoneTest,
    testSpeakers,
    playTestSound,
  } = useAudioTesting({
    audioInputId: deviceSettings.audioInput,
    audioOutputId: deviceSettings.audioOutput,
  });

  // Video preview state
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);

  // Settings state
  const [settings, setSettings] = useState<VoiceVideoSettings>({
    voiceActivationEnabled: true,
    voiceActivationThreshold: 50,
    pushToTalkKey: "Space",
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    videoQuality: "720p",
    frameRate: 30,
    bitrate: 1500,
    inputVolume: 100,
    outputVolume: 100,
  });

  // Load settings from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('haos-voice-video-settings');
      if (saved) {
        const parsedSettings = JSON.parse(saved);
        setSettings(prev => ({ ...prev, ...parsedSettings }));
      }
    } catch (error) {
      console.warn('Failed to load voice-video settings:', error);
    }
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('haos-voice-video-settings', JSON.stringify(settings));
    } catch (error) {
      console.warn('Failed to save voice-video settings:', error);
    }
  }, [settings]);

  // Start video preview
  const startVideoPreview = async () => {
    if (!deviceSettings.videoInput) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: deviceSettings.videoInput },
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: settings.frameRate }
        }
      });
      
      previewStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsPreviewActive(true);
    } catch (error) {
      console.error('Failed to start video preview:', error);
    }
  };

  // Stop video preview
  const stopVideoPreview = () => {
    if (previewStreamRef.current) {
      previewStreamRef.current.getTracks().forEach(track => track.stop());
      previewStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsPreviewActive(false);
  };

  // Update settings helper
  const updateSetting = <K extends keyof VoiceVideoSettings>(
    key: K,
    value: VoiceVideoSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Get current video quality preset
  const currentVideoQuality = VIDEO_QUALITY_PRESETS.find(
    preset => preset.value === settings.videoQuality
  ) || VIDEO_QUALITY_PRESETS[1];

  return (
    <div className="space-y-6">
      {/* Permissions Warning */}
      {!hasPermissions && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Media device permissions are required to configure audio and video settings.
            <Button 
              variant="link" 
              className="ml-2 h-auto p-0" 
              onClick={requestPermissions}
            >
              Grant Permissions
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Device Errors */}
      {(deviceError || testError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {deviceError || testError}
          </AlertDescription>
        </Alert>
      )}

      {/* Audio Devices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Audio Devices
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Microphone Selection */}
          <div className="space-y-2">
            <Label htmlFor="microphone">Microphone</Label>
            <div className="flex gap-2">
              <Select
                value={deviceSettings.audioInput || ""}
                onValueChange={(value) => selectDevice('audioinput', value)}
                disabled={!hasPermissions || isEnumerating}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={isEnumerating ? "Loading..." : "Select microphone"} />
                </SelectTrigger>
                <SelectContent>
                  {audioInputs.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={isRecording ? stopMicrophoneTest : startMicrophoneTest}
                disabled={!deviceSettings.audioInput || !hasPermissions}
              >
                {isRecording ? (
                  <>
                    <Square className="h-4 w-4 mr-2" />
                    Stop Test
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    Test Mic
                  </>
                )}
              </Button>
            </div>
            
            {/* Audio Level Indicator */}
            {isRecording && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Microphone Level</Label>
                  <Badge variant={audioLevel > 10 ? "default" : "secondary"}>
                    {Math.round(audioLevel)}%
                  </Badge>
                </div>
                <Progress value={audioLevel} className="h-2" />
              </div>
            )}
          </div>

          {/* Speaker Selection */}
          <div className="space-y-2">
            <Label htmlFor="speakers">Speakers</Label>
            <div className="flex gap-2">
              <Select
                value={deviceSettings.audioOutput || ""}
                onValueChange={(value) => selectDevice('audiooutput', value)}
                disabled={!hasPermissions || isEnumerating}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={isEnumerating ? "Loading..." : "Select speakers"} />
                </SelectTrigger>
                <SelectContent>
                  {audioOutputs.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={playTestSound}
                disabled={!deviceSettings.audioOutput || !hasPermissions || isPlaying}
              >
                {isPlaying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Playing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Test Sound
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Volume Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Input Volume: {settings.inputVolume}%</Label>
              <Slider
                value={[settings.inputVolume]}
                onValueChange={([value]) => updateSetting('inputVolume', value)}
                max={100}
                step={1}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label>Output Volume: {settings.outputVolume}%</Label>
              <Slider
                value={[settings.outputVolume]}
                onValueChange={([value]) => updateSetting('outputVolume', value)}
                max={100}
                step={1}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Voice Activation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Voice Activation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Voice Activation</Label>
              <p className="text-sm text-muted-foreground">
                Automatically transmit when speaking
              </p>
            </div>
            <Switch
              checked={settings.voiceActivationEnabled}
              onCheckedChange={(checked) => updateSetting('voiceActivationEnabled', checked)}
            />
          </div>

          {settings.voiceActivationEnabled && (
            <div className="space-y-2">
              <Label>Activation Threshold: {settings.voiceActivationThreshold}%</Label>
              <Slider
                value={[settings.voiceActivationThreshold]}
                onValueChange={([value]) => updateSetting('voiceActivationThreshold', value)}
                max={100}
                step={1}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">
                Lower values make the microphone more sensitive
              </p>
            </div>
          )}

          {!settings.voiceActivationEnabled && (
            <div className="space-y-2">
              <Label>Push-to-Talk Key</Label>
              <Select
                value={settings.pushToTalkKey}
                onValueChange={(value) => updateSetting('pushToTalkKey', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Space">Space</SelectItem>
                  <SelectItem value="CtrlLeft">Left Ctrl</SelectItem>
                  <SelectItem value="AltLeft">Left Alt</SelectItem>
                  <SelectItem value="ShiftLeft">Left Shift</SelectItem>
                  <SelectItem value="CapsLock">Caps Lock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audio Processing */}
      <Card>
        <CardHeader>
          <CardTitle>Audio Processing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Echo Cancellation</Label>
              <p className="text-sm text-muted-foreground">
                Reduce echo and feedback
              </p>
            </div>
            <Switch
              checked={settings.echoCancellation}
              onCheckedChange={(checked) => updateSetting('echoCancellation', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Noise Suppression</Label>
              <p className="text-sm text-muted-foreground">
                Filter background noise
              </p>
            </div>
            <Switch
              checked={settings.noiseSuppression}
              onCheckedChange={(checked) => updateSetting('noiseSuppression', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Automatic Gain Control</Label>
              <p className="text-sm text-muted-foreground">
                Automatically adjust microphone sensitivity
              </p>
            </div>
            <Switch
              checked={settings.autoGainControl}
              onCheckedChange={(checked) => updateSetting('autoGainControl', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Video Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Video Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Camera Selection */}
          <div className="space-y-2">
            <Label>Camera</Label>
            <div className="flex gap-2">
              <Select
                value={deviceSettings.videoInput || ""}
                onValueChange={(value) => selectDevice('videoinput', value)}
                disabled={!hasPermissions || isEnumerating}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={isEnumerating ? "Loading..." : "Select camera"} />
                </SelectTrigger>
                <SelectContent>
                  {videoInputs.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={isPreviewActive ? stopVideoPreview : startVideoPreview}
                disabled={!deviceSettings.videoInput || !hasPermissions}
              >
                {isPreviewActive ? (
                  <>
                    <VideoOff className="h-4 w-4 mr-2" />
                    Stop Preview
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Video Preview */}
          {isPreviewActive && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary">
                    {currentVideoQuality.label}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Quality Settings */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Video Quality</Label>
              <Select
                value={settings.videoQuality}
                onValueChange={(value) => updateSetting('videoQuality', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VIDEO_QUALITY_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {currentVideoQuality.width}×{currentVideoQuality.height} @ {currentVideoQuality.frameRate}fps, {currentVideoQuality.bitrate}kbps
              </p>
            </div>

            {/* Custom Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frame Rate: {settings.frameRate}fps</Label>
                <Slider
                  value={[settings.frameRate]}
                  onValueChange={([value]) => updateSetting('frameRate', value)}
                  min={15}
                  max={60}
                  step={15}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label>Bitrate: {settings.bitrate}kbps</Label>
                <Slider
                  value={[settings.bitrate]}
                  onValueChange={([value]) => updateSetting('bitrate', value)}
                  min={500}
                  max={8000}
                  step={250}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Status */}
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle className="h-4 w-4 text-green-500" />
          Settings are automatically saved
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            enumerateDevices();
            if (isPreviewActive) {
              stopVideoPreview();
              setTimeout(startVideoPreview, 100);
            }
          }}
          disabled={isEnumerating}
        >
          {isEnumerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Refreshing...
            </>
          ) : (
            "Refresh Devices"
          )}
        </Button>
      </div>
    </div>
  );
}