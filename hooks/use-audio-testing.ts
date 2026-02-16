"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export interface AudioTestState {
  isRecording: boolean;
  isPlaying: boolean;
  isTesting: boolean;
  audioLevel: number;
  error?: string;
}

interface UseAudioTestingOptions {
  audioInputId?: string;
  audioOutputId?: string;
  updateInterval?: number;
}

export function useAudioTesting(options: UseAudioTestingOptions = {}) {
  const { 
    audioInputId, 
    audioOutputId, 
    updateInterval = 100 
  } = options;

  const [state, setState] = useState<AudioTestState>({
    isRecording: false,
    isPlaying: false,
    isTesting: false,
    audioLevel: 0,
  });

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number>();
  const testAudioRef = useRef<HTMLAudioElement | null>(null);

  // Clean up audio resources
  const cleanupAudio = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
      microphoneRef.current = null;
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (analyserRef.current) {
      analyserRef.current = null;
    }

    if (testAudioRef.current) {
      testAudioRef.current.pause();
      testAudioRef.current = null;
    }
  }, []);

  // Start microphone test - monitors audio levels
  const startMicrophoneTest = useCallback(async () => {
    setState(prev => ({ ...prev, error: undefined }));
    
    try {
      // Stop any existing test
      cleanupAudio();
      
      // Get user media with specified audio input
      const constraints: MediaStreamConstraints = {
        audio: audioInputId ? { deviceId: { exact: audioInputId } } : true,
        video: false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;
      
      // Create audio context and analyser
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;
      analyserRef.current = analyser;
      
      const microphone = audioContext.createMediaStreamSource(stream);
      microphoneRef.current = microphone;
      microphone.connect(analyser);
      
      setState(prev => ({ ...prev, isRecording: true, isTesting: true }));
      
      // Start monitoring audio level
      const monitorAudioLevel = () => {
        if (!analyser) return;
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average volume level
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const level = (average / 255) * 100; // Convert to percentage
        
        setState(prev => ({ ...prev, audioLevel: level }));
        
        if (state.isRecording) {
          animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
        }
      };
      
      monitorAudioLevel();
      
    } catch (error) {
      console.error('Failed to start microphone test:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to access microphone',
        isRecording: false,
        isTesting: false,
        audioLevel: 0
      }));
    }
  }, [audioInputId, cleanupAudio, state.isRecording]);

  // Stop microphone test
  const stopMicrophoneTest = useCallback(() => {
    cleanupAudio();
    setState(prev => ({
      ...prev,
      isRecording: false,
      isTesting: false,
      audioLevel: 0
    }));
  }, [cleanupAudio]);

  // Test speakers with a test tone
  const testSpeakers = useCallback(async () => {
    setState(prev => ({ ...prev, error: undefined, isPlaying: true }));
    
    try {
      // Create a simple test tone
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create oscillator for test tone (440Hz A note)
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
      oscillator.type = 'sine';
      
      // Fade in and fade out
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.9);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 1.0);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 1.0);
      
      // Clean up after test
      setTimeout(() => {
        setState(prev => ({ ...prev, isPlaying: false }));
        audioContext.close();
      }, 1100);
      
    } catch (error) {
      console.error('Failed to test speakers:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to test speakers',
        isPlaying: false
      }));
    }
  }, []);

  // Play a test sound file through specific output device (if supported)
  const playTestSound = useCallback(async () => {
    setState(prev => ({ ...prev, error: undefined, isPlaying: true }));
    
    try {
      // Create audio element for test sound
      const audio = new Audio();
      testAudioRef.current = audio;
      
      // Use a simple test tone instead of complex data URL
      const testBeepData = [
        'data:audio/wav;base64,',
        'UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVg',
        'odDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp',
        '66hVFApGn+DyvmwhBT6Z2e/CeScCKILN8t2IOAcZZ7zp5Z1NEQ1Oj+PxtmMcBjiS2O7JdSUELHTG8N6Q',
        'QAoUXbTp66hVFApGodx0'
      ].join('');
      audio.src = testBeepData;
      
      // Set output device if supported
      if (audioOutputId && 'setSinkId' in audio) {
        await (audio as any).setSinkId(audioOutputId);
      }
      
      audio.onended = () => {
        setState(prev => ({ ...prev, isPlaying: false }));
      };
      
      audio.onerror = () => {
        setState(prev => ({
          ...prev,
          error: 'Failed to play test sound',
          isPlaying: false
        }));
      };
      
      await audio.play();
      
    } catch (error) {
      console.error('Failed to play test sound:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to play test sound',
        isPlaying: false
      }));
    }
  }, [audioOutputId]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanupAudio;
  }, [cleanupAudio]);

  return {
    ...state,
    startMicrophoneTest,
    stopMicrophoneTest,
    testSpeakers,
    playTestSound,
  };
}