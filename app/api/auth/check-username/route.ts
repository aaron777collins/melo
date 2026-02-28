/**
 * Username Availability Check API
 * 
 * Checks if a username is available for registration
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Validation schema for the request
const CheckUsernameSchema = z.object({
  username: z.string().min(3).max(50),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username } = CheckUsernameSchema.parse(body);

    // Validate username format
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json({
        available: false,
        reason: 'Username can only contain letters, numbers, and underscores'
      });
    }

    // Reserved usernames list
    const reservedUsernames = [
      'admin', 'administrator', 'root', 'moderator', 'mod',
      'api', 'www', 'mail', 'ftp', 'support', 'help',
      'info', 'contact', 'service', 'system', 'bot',
      'matrix', 'synapse', 'server', 'homeserver'
    ];

    if (reservedUsernames.includes(username.toLowerCase())) {
      return NextResponse.json({
        available: false,
        reason: 'This username is reserved'
      });
    }

    // TODO: Check against actual Matrix server user database
    // For now, simulate some taken usernames for testing
    const mockTakenUsernames = ['testuser', 'john', 'jane', 'user123', 'admin123'];
    
    if (mockTakenUsernames.includes(username.toLowerCase())) {
      return NextResponse.json({
        available: false,
        reason: 'Username already taken'
      });
    }

    // Username is available
    return NextResponse.json({
      available: true
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        available: false,
        reason: 'Invalid username format'
      }, { status: 400 });
    }

    console.error('[CheckUsername] Error checking username availability:', error);
    return NextResponse.json({
      available: false,
      reason: 'Failed to check username availability'
    }, { status: 500 });
  }
}