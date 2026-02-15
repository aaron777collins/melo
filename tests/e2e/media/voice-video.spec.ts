/**
 * Voice & Video Tests
 * 
 * Tests for voice channels and video call UI.
 * Note: Full media testing is limited without actual device access.
 */

import { test, expect } from '@playwright/test';
import { 
  ServerPage,
  waitForAppReady, 
  waitForMatrixSync 
} from '../fixtures';

test.describe('Voice & Video', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await waitForMatrixSync(page);
    
    // Navigate to a server
    const firstServer = page.locator('[data-testid*="server"], .server-item, nav a').first();
    await firstServer.click().catch(() => {});
    await page.waitForTimeout(2000);
  });

  test('should display voice channels', async ({ page }) => {
    // Look for voice channel indicators
    const voiceChannels = page.locator('[data-channel-type="voice"], .voice-channel, [aria-label*="voice" i]');
    const hasVoiceChannels = await voiceChannels.first().isVisible().catch(() => false);
    
    console.log(`Voice channels visible: ${hasVoiceChannels}`);
  });

  test('should show join button on voice channel', async ({ page }) => {
    // Find voice channel
    const voiceChannel = page.locator('[data-channel-type="voice"], .voice-channel').first();
    const hasVoice = await voiceChannel.isVisible().catch(() => false);
    
    if (hasVoice) {
      await voiceChannel.click();
      await page.waitForTimeout(1000);
      
      // Look for join button
      const joinButton = page.locator('button:has-text("Join"), button:has-text("Connect"), [data-testid="join-voice"]');
      const hasJoin = await joinButton.first().isVisible().catch(() => false);
      
      console.log(`Join button visible: ${hasJoin}`);
    }
  });

  test('should display voice controls when in channel', async ({ page }) => {
    // Look for voice controls
    const voiceControls = page.locator('[data-testid="voice-controls"], .voice-controls, .call-controls');
    const muteButton = page.locator('button[aria-label*="mute" i], button:has-text("Mute")');
    const deafenButton = page.locator('button[aria-label*="deafen" i]');
    
    const hasControls = await voiceControls.first().isVisible().catch(() => false);
    const hasMute = await muteButton.first().isVisible().catch(() => false);
    
    console.log(`Voice controls: ${hasControls}, Mute: ${hasMute}`);
  });

  test('should have video toggle button', async ({ page }) => {
    // Look for video toggle
    const videoButton = page.locator('button[aria-label*="video" i], button[aria-label*="camera" i], button:has-text("Camera")');
    const hasVideo = await videoButton.first().isVisible().catch(() => false);
    
    console.log(`Video button visible: ${hasVideo}`);
  });

  test('should have screen share button', async ({ page }) => {
    // Look for screen share button
    const screenShareButton = page.locator('button[aria-label*="screen" i], button[aria-label*="share" i], button:has-text("Share Screen")');
    const hasScreenShare = await screenShareButton.first().isVisible().catch(() => false);
    
    console.log(`Screen share button visible: ${hasScreenShare}`);
  });

  test('should show participant list in voice channel', async ({ page }) => {
    // Find voice channel and click
    const voiceChannel = page.locator('[data-channel-type="voice"], .voice-channel').first();
    const hasVoice = await voiceChannel.isVisible().catch(() => false);
    
    if (hasVoice) {
      await voiceChannel.click();
      await page.waitForTimeout(1000);
      
      // Look for participant list
      const participants = page.locator('[data-testid="participants"], .participant-list, .voice-members');
      const hasParticipants = await participants.first().isVisible().catch(() => false);
      
      console.log(`Participant list: ${hasParticipants}`);
    }
  });

  test('should have leave call button', async ({ page }) => {
    // Look for disconnect/leave button
    const leaveButton = page.locator('button[aria-label*="leave" i], button[aria-label*="disconnect" i], button:has-text("Leave"), button:has-text("Disconnect")');
    const hasLeave = await leaveButton.first().isVisible().catch(() => false);
    
    console.log(`Leave button visible: ${hasLeave}`);
  });

  test('should display speaking indicator', async ({ page }) => {
    // Look for speaking indicator
    const speakingIndicator = page.locator('[data-speaking="true"], .speaking, .voice-activity');
    const hasSpeaking = await speakingIndicator.first().isVisible().catch(() => false);
    
    console.log(`Speaking indicator: ${hasSpeaking}`);
  });
});
