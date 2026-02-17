"use client";

import { useState, useEffect, useCallback } from "react";

export interface MediaDeviceInfo {
  deviceId: string;
  groupId: string;
  kind: MediaDeviceKind;
  label: string;
}

export interface MediaDevicesState {
  audioInputs: MediaDeviceInfo[];
  audioOutputs: MediaDeviceInfo[];
  videoInputs: MediaDeviceInfo[];
  isEnumerating: boolean;
  hasPermissions: boolean;
  error?: string;
}

export interface MediaDeviceSettings {
  audioInput?: string;
  audioOutput?: string;
  videoInput?: string;
}

interface UseMediaDevicesOptions {
  autoEnumerate?: boolean;
}

export function useMediaDevices(options: UseMediaDevicesOptions = {}) {
  const { autoEnumerate = true } = options;
  
  const [state, setState] = useState<MediaDevicesState>({
    audioInputs: [],
    audioOutputs: [],
    videoInputs: [],
    isEnumerating: false,
    hasPermissions: false,
  });

  const [settings, setSettings] = useState<MediaDeviceSettings>({});

  // Check if we have permissions for media devices
  const checkPermissions = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: true 
      });
      
      // Stop all tracks immediately
      stream.getTracks().forEach(track => track.stop());
      
      setState(prev => ({ ...prev, hasPermissions: true }));
      return true;
    } catch (error) {
      console.warn('Media permissions not granted:', error);
      setState(prev => ({ ...prev, hasPermissions: false }));
      return false;
    }
  }, []);

  // Request permissions for media devices
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, error: undefined }));
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: true 
      });
      
      // Stop all tracks immediately
      stream.getTracks().forEach(track => track.stop());
      
      setState(prev => ({ ...prev, hasPermissions: true }));
      return true;
    } catch (error) {
      console.error('Failed to request media permissions:', error);
      setState(prev => ({ 
        ...prev, 
        hasPermissions: false,
        error: error instanceof Error ? error.message : 'Failed to request permissions'
      }));
      return false;
    }
  }, []);

  // Enumerate available media devices
  const enumerateDevices = useCallback(async () => {
    setState(prev => ({ ...prev, isEnumerating: true, error: undefined }));
    
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const audioInputs: MediaDeviceInfo[] = [];
      const audioOutputs: MediaDeviceInfo[] = [];
      const videoInputs: MediaDeviceInfo[] = [];
      
      devices.forEach(device => {
        const deviceInfo: MediaDeviceInfo = {
          deviceId: device.deviceId,
          groupId: device.groupId,
          kind: device.kind,
          label: device.label || `${device.kind} (${device.deviceId.slice(0, 8)}...)`
        };
        
        switch (device.kind) {
          case 'audioinput':
            audioInputs.push(deviceInfo);
            break;
          case 'audiooutput':
            audioOutputs.push(deviceInfo);
            break;
          case 'videoinput':
            videoInputs.push(deviceInfo);
            break;
        }
      });
      
      setState(prev => ({
        ...prev,
        audioInputs,
        audioOutputs,
        videoInputs,
        isEnumerating: false,
      }));
      
      // Set default devices if none selected
      if (!settings.audioInput && audioInputs.length > 0) {
        setSettings(prev => ({ ...prev, audioInput: audioInputs[0].deviceId }));
      }
      if (!settings.audioOutput && audioOutputs.length > 0) {
        setSettings(prev => ({ ...prev, audioOutput: audioOutputs[0].deviceId }));
      }
      if (!settings.videoInput && videoInputs.length > 0) {
        setSettings(prev => ({ ...prev, videoInput: videoInputs[0].deviceId }));
      }
      
    } catch (error) {
      console.error('Failed to enumerate devices:', error);
      setState(prev => ({
        ...prev,
        isEnumerating: false,
        error: error instanceof Error ? error.message : 'Failed to enumerate devices'
      }));
    }
  }, [settings.audioInput, settings.audioOutput, settings.videoInput]);

  // Update device selection
  const selectDevice = useCallback((kind: MediaDeviceKind, deviceId: string) => {
    switch (kind) {
      case 'audioinput':
        setSettings(prev => ({ ...prev, audioInput: deviceId }));
        break;
      case 'audiooutput':
        setSettings(prev => ({ ...prev, audioOutput: deviceId }));
        break;
      case 'videoinput':
        setSettings(prev => ({ ...prev, videoInput: deviceId }));
        break;
    }
  }, []);

  // Get selected device info
  const getSelectedDevice = useCallback((kind: MediaDeviceKind): MediaDeviceInfo | undefined => {
    let deviceId: string | undefined;
    let devices: MediaDeviceInfo[];
    
    switch (kind) {
      case 'audioinput':
        deviceId = settings.audioInput;
        devices = state.audioInputs;
        break;
      case 'audiooutput':
        deviceId = settings.audioOutput;
        devices = state.audioOutputs;
        break;
      case 'videoinput':
        deviceId = settings.videoInput;
        devices = state.videoInputs;
        break;
      default:
        return undefined;
    }
    
    return deviceId ? devices.find(d => d.deviceId === deviceId) : undefined;
  }, [settings, state]);

  // Load settings from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('melo-media-device-settings');
      if (saved) {
        const parsedSettings = JSON.parse(saved);
        setSettings(parsedSettings);
      }
    } catch (error) {
      console.warn('Failed to load media device settings:', error);
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('melo-media-device-settings', JSON.stringify(settings));
    } catch (error) {
      console.warn('Failed to save media device settings:', error);
    }
  }, [settings]);

  // Auto-enumerate devices on mount and permission changes
  useEffect(() => {
    if (autoEnumerate && typeof navigator !== 'undefined' && navigator.mediaDevices) {
      checkPermissions().then(hasPerms => {
        if (hasPerms) {
          enumerateDevices();
        }
      });
    }
  }, [autoEnumerate, checkPermissions, enumerateDevices]);

  // Listen for device changes
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      const handleDeviceChange = () => {
        if (state.hasPermissions) {
          enumerateDevices();
        }
      };
      
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      };
    }
  }, [state.hasPermissions, enumerateDevices]);

  return {
    ...state,
    settings,
    requestPermissions,
    enumerateDevices,
    selectDevice,
    getSelectedDevice,
  };
}