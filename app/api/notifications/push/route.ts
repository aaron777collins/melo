import { NextRequest, NextResponse } from 'next/server';
import { notificationHandler } from '@/lib/jobs/handlers/notification';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    // Validate required fields
    if (!payload.userId || !payload.title || !payload.body) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, title, body' },
        { status: 400 }
      );
    }

    // Send push notification using the notification handler
    const result = await notificationHandler.sendPushNotification(payload);

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      message: 'Push notification sent successfully'
    });

  } catch (error) {
    console.error('Error sending push notification:', error);
    return NextResponse.json(
      { error: 'Failed to send push notification' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Test endpoint to check if push notifications are working
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'test-user';

    const testPayload = {
      userId,
      title: 'HAOS Test Notification',
      body: 'Push notifications are working! This is a test message.',
      icon: '/icons/haos-logo-192.png',
      badge: '/icons/haos-badge-72.png',
      tag: 'test-notification',
      data: {
        type: 'test',
        timestamp: Date.now(),
        url: '/'
      }
    };

    const result = await notificationHandler.sendPushNotification(testPayload);

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      message: 'Test push notification sent',
      payload: testPayload
    });

  } catch (error) {
    console.error('Error sending test push notification:', error);
    return NextResponse.json(
      { error: 'Failed to send test push notification' },
      { status: 500 }
    );
  }
}