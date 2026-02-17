import { NextRequest, NextResponse } from 'next/server';
import { getServerPushService, PushSubscriptionData } from '@/lib/notifications/push-service-server';
import { getClient } from '@/lib/matrix/client';

// Helper function to get user push subscriptions
async function getUserPushSubscriptions(userId: string): Promise<PushSubscriptionData[]> {
  const client = getClient();
  
  if (!client) {
    console.warn('Matrix client not available, no push subscriptions found');
    return [];
  }

  try {
    const data = await (client as any).getAccountData('com.melo.push_subscriptions');
    const content = data?.getContent();
    const allSubscriptions = content?.subscriptions || [];
    
    // Filter subscriptions for this user
    return allSubscriptions.filter((sub: any) => sub.userId === userId);
  } catch (error) {
    console.error('Failed to get push subscriptions:', error);
    return [];
  }
}

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

    // Get subscriptions for the user
    const subscriptions = await getUserPushSubscriptions(payload.userId);
    
    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No push subscriptions found for user',
        sent: 0
      });
    }

    // Send push notification using server push service
    const serverPushService = getServerPushService();
    
    if (!serverPushService.isEnabled()) {
      return NextResponse.json(
        { error: 'Push notifications are not configured' },
        { status: 503 }
      );
    }

    const notificationData = {
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/melo-logo-192.png',
      badge: payload.badge || '/icons/melo-badge-72.png',
      tag: payload.tag,
      data: payload.data || {},
      actions: payload.actions,
      requireInteraction: payload.requireInteraction,
      silent: payload.silent
    };

    const results = await serverPushService.sendCustomNotification(notificationData, subscriptions);
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: failed === 0,
      message: `Push notification sent to ${successful}/${results.length} subscribers`,
      sent: successful,
      failed: failed
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
      title: 'Melo Test Notification',
      body: 'Push notifications are working! This is a test message.',
      icon: '/icons/melo-logo-192.png',
      badge: '/icons/melo-badge-72.png',
      tag: 'test-notification',
      data: {
        type: 'test',
        timestamp: Date.now(),
        url: '/'
      }
    };

    // Get subscriptions for the user
    const subscriptions = await getUserPushSubscriptions(userId);
    
    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No push subscriptions found for user',
        sent: 0,
        payload: testPayload
      });
    }

    // Send push notification using server push service
    const serverPushService = getServerPushService();
    
    if (!serverPushService.isEnabled()) {
      return NextResponse.json(
        { error: 'Push notifications are not configured' },
        { status: 503 }
      );
    }

    const results = await serverPushService.sendCustomNotification(testPayload, subscriptions);
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: failed === 0,
      message: `Test push notification sent to ${successful}/${results.length} subscribers`,
      sent: successful,
      failed: failed,
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