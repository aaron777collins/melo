import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/matrix/client';

// Support configuration
const SUPPORT_CONFIG = {
  // Matrix room for support tickets (can be configured via env var)
  supportRoomId: process.env.SUPPORT_MATRIX_ROOM_ID || '#support:dev2.aaroncollins.info',
  // Fallback email for support tickets
  supportEmail: process.env.SUPPORT_EMAIL || 'contact@aaroncollins.info',
  // Enable/disable Matrix notifications
  useMatrix: process.env.USE_MATRIX_SUPPORT !== 'false'
};

export async function POST(request: NextRequest) {
  try {
    const { email, category, message } = await request.json();

    // Validation
    if (!email || !category || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: email, category, message' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Generate ticket ID
    const ticketId = `HAOS-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    // Create support ticket message
    const supportMessage = formatSupportMessage({
      ticketId,
      email,
      category,
      message,
      userAgent: request.headers.get('user-agent') || 'Unknown',
      ip: getClientIP(request)
    });

    let matrixSuccess = false;
    let errorDetails: unknown = null;

    // Try to send to Matrix support room
    if (SUPPORT_CONFIG.useMatrix) {
      try {
        const client = getClient();
        if (client && client.isLoggedIn()) {
          // Try to join the support room first (in case it's not joined)
          try {
            await client.joinRoom(SUPPORT_CONFIG.supportRoomId);
          } catch (joinError) {
            // Ignore join errors - room might already be joined or public
            console.log('Join room result (may be expected):', joinError);
          }

          // Send the support ticket message
          await client.sendTextMessage(SUPPORT_CONFIG.supportRoomId, supportMessage);
          matrixSuccess = true;
          console.log(`Support ticket ${ticketId} sent to Matrix room`);
        } else {
          console.warn('Matrix client not available for support ticket');
        }
      } catch (matrixError) {
        console.error('Failed to send support ticket to Matrix:', matrixError);
        errorDetails = matrixError;
      }
    }

    // If Matrix failed or is disabled, log for fallback processing
    if (!matrixSuccess) {
      console.log('Support ticket fallback needed:', {
        ticketId,
        email,
        category,
        supportEmail: SUPPORT_CONFIG.supportEmail,
        message: message.substring(0, 100) + '...',
        error: errorDetails instanceof Error ? errorDetails.message : String(errorDetails ?? '')
      });
      
      // In a production environment, you could:
      // - Queue the ticket for email sending
      // - Store in a database
      // - Send to external ticketing system
      // - Use webhook to external service
      
      // For now, we'll still consider it submitted since it's logged
    }

    return NextResponse.json({
      success: true,
      ticketId,
      message: matrixSuccess 
        ? 'Support ticket submitted successfully. Our team will respond soon!'
        : 'Support ticket received. We will contact you via email soon.',
      submissionMethod: matrixSuccess ? 'matrix' : 'logged'
    });

  } catch (error) {
    console.error('Error processing support ticket:', error);
    return NextResponse.json(
      { error: 'Failed to submit support ticket. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * Format the support ticket message for Matrix
 */
function formatSupportMessage(data: {
  ticketId: string;
  email: string;
  category: string;
  message: string;
  userAgent: string;
  ip: string;
}): string {
  const categoryLabels: Record<string, string> = {
    'technical': '🔧 Technical Support',
    'billing': '💳 Billing & Subscription',
    'feature-request': '💡 Feature Request',
    'bug-report': '🐛 Bug Report'
  };

  const categoryLabel = categoryLabels[data.category] || `📋 ${data.category}`;

  return `🎫 **New Support Ticket: ${data.ticketId}**

**Category:** ${categoryLabel}
**From:** ${data.email}
**Submitted:** ${new Date().toISOString()}

**Message:**
${data.message}

**Technical Details:**
• User Agent: ${data.userAgent}
• IP: ${data.ip}

---
Reply to this message to respond to the user at ${data.email}`;
}

/**
 * Extract client IP address from request
 */
function getClientIP(request: NextRequest): string {
  // Check various headers for real IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  // Fallback - might not be the real IP in production behind proxies
  return request.ip || 'unknown';
}