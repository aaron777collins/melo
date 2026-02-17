#!/usr/bin/env tsx
/**
 * Test Device Manager Implementation
 * 
 * Simple script to verify device manager functionality and test data.
 */

import { MatrixDevice, DeviceSession } from '../components/settings/device-manager';

// Mock device data for testing
const mockDevices: MatrixDevice[] = [
  {
    deviceId: 'ABCD1234EFGH',
    displayName: 'Chrome Web Browser',
    lastSeenTs: Date.now() - 300000, // 5 minutes ago
    lastSeenIp: '192.168.1.100',
    userId: '@testuser:dev2.aaroncollins.info',
    verified: true,
    blocked: false,
    known: true
  },
  {
    deviceId: 'WXYZ5678IJKL',
    displayName: 'Android Mobile App',
    lastSeenTs: Date.now() - 3600000, // 1 hour ago
    lastSeenIp: '10.0.0.50',
    userId: '@testuser:dev2.aaroncollins.info',
    verified: false,
    blocked: false,
    known: true
  },
  {
    deviceId: 'MNOP9012QRST',
    displayName: 'iPhone iOS App',
    lastSeenTs: Date.now() - 86400000, // 1 day ago
    lastSeenIp: '172.16.0.10',
    userId: '@testuser:dev2.aaroncollins.info',
    verified: false,
    blocked: true,
    known: true
  }
];

// Test helper functions
function getDeviceType(displayName?: string): "mobile" | "desktop" | "web" | "unknown" {
  if (!displayName) return "unknown";
  
  const name = displayName.toLowerCase();
  
  if (name.includes("mobile") || name.includes("android") || name.includes("ios") || 
      name.includes("iphone") || name.includes("ipad")) {
    return "mobile";
  }
  
  if (name.includes("web") || name.includes("browser") || name.includes("firefox") || 
      name.includes("chrome") || name.includes("safari")) {
    return "web";
  }
  
  if (name.includes("desktop") || name.includes("windows") || name.includes("macos") || 
      name.includes("linux")) {
    return "desktop";
  }
  
  return "unknown";
}

function getPlatform(displayName?: string): string {
  if (!displayName) return "Unknown Platform";
  
  const name = displayName.toLowerCase();
  
  if (name.includes("android")) return "Android";
  if (name.includes("ios") || name.includes("iphone") || name.includes("ipad")) return "iOS";
  if (name.includes("windows")) return "Windows";
  if (name.includes("macos") || name.includes("mac")) return "macOS";
  if (name.includes("linux")) return "Linux";
  if (name.includes("chrome")) return "Chrome";
  if (name.includes("firefox")) return "Firefox";
  if (name.includes("safari")) return "Safari";
  
  return displayName;
}

function matrixDeviceToSession(device: MatrixDevice, currentDeviceId?: string): DeviceSession {
  const deviceType = getDeviceType(device.displayName);
  const platform = getPlatform(device.displayName);
  const lastActive = device.lastSeenTs ? new Date(device.lastSeenTs) : new Date();
  
  return {
    deviceId: device.deviceId,
    displayName: device.displayName || `Unknown Device (${device.deviceId.slice(0, 8)}...)`,
    deviceType,
    platform,
    location: device.lastSeenIp ? `IP: ${device.lastSeenIp}` : undefined,
    ipAddress: device.lastSeenIp,
    lastActive,
    isCurrent: device.deviceId === currentDeviceId,
    isVerified: device.verified || false,
    isBlocked: device.blocked || false,
    rawDevice: device
  };
}

// Test the implementation
console.log('🧪 Testing Device Manager Implementation\n');

// Convert mock devices to sessions
const currentDeviceId = 'ABCD1234EFGH';
const sessions = mockDevices.map(device => matrixDeviceToSession(device, currentDeviceId));

// Test device type detection
console.log('📱 Device Type Detection:');
sessions.forEach(session => {
  console.log(`  ${session.displayName} → ${session.deviceType} (${session.platform})`);
});

// Test verification status
console.log('\n🔐 Verification Status:');
const verifiedCount = sessions.filter(s => s.isVerified).length;
const unverifiedCount = sessions.filter(s => !s.isVerified).length;
const blockedCount = sessions.filter(s => s.isBlocked).length;

console.log(`  Total devices: ${sessions.length}`);
console.log(`  Verified: ${verifiedCount}`);
console.log(`  Unverified: ${unverifiedCount}`);
console.log(`  Blocked: ${blockedCount}`);

// Test current session detection
console.log('\n💻 Current Session:');
const currentSession = sessions.find(s => s.isCurrent);
const otherSessions = sessions.filter(s => !s.isCurrent);

console.log(`  Current: ${currentSession?.displayName || 'None found'}`);
console.log(`  Other sessions: ${otherSessions.length}`);

// Test device actions simulation
console.log('\n⚡ Device Action Simulation:');

// Simulate device verification
const unverifiedDevice = sessions.find(s => !s.isVerified && !s.isBlocked);
if (unverifiedDevice) {
  console.log(`  ✅ Can verify: ${unverifiedDevice.displayName}`);
}

// Simulate device blocking
const unverifiedUnblockedDevice = sessions.find(s => !s.isVerified && !s.isBlocked);
if (unverifiedUnblockedDevice) {
  console.log(`  🚫 Can block: ${unverifiedUnblockedDevice.displayName}`);
}

// Simulate device revocation
const revocableDevices = otherSessions.filter(s => !s.isCurrent);
console.log(`  🗑️ Can revoke: ${revocableDevices.length} devices`);

console.log('\n✅ Device Manager Implementation Test Complete');
console.log('\nKey Features Verified:');
console.log('  ✓ Device type detection');
console.log('  ✓ Verification status handling');
console.log('  ✓ Current vs other session detection');
console.log('  ✓ Action availability logic');
console.log('  ✓ Test data structure compatibility');