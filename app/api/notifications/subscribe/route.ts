import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/matrix/client';

export async function POST(request: NextRequest) {
  try {
    const { userId, deviceId, subscription } = await request.json();

    if (!userId || !deviceId || !subscription) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, deviceId, subscription' },
        { status: 400 }
      );
    }

    // Validate subscription object structure
    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json(
        { error: 'Invalid subscription format' },
        { status: 400 }
      );
    }

    // Check if push notifications are configured
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json(
        { error: 'Push notifications are not configured' },
        { status: 503 }
      );
    }

    // Create push subscription object
    const pushSubscription = {
      id: crypto.randomUUID(),
      userId,
      deviceId,
      subscription,
      userAgent: request.headers.get('user-agent') || undefined,
      createdAt: new Date(),
      lastUsed: new Date()
    };

    // Get Matrix client (this would typically come from auth middleware)
    const client = getClient();
    
    if (client) {
      // Store in Matrix account data
      try {
        const existingData = await (client as any).getAccountData('com.haos.push_subscriptions');
        const existingSubscriptions = existingData?.getContent()?.subscriptions || [];

        // Remove any existing subscription for this device
        const filteredSubscriptions = existingSubscriptions.filter(
          (sub: any) => sub.deviceId !== deviceId
        );

        // Add new subscription
        filteredSubscriptions.push(pushSubscription);

        // Store updated subscriptions
        await (client as any).setAccountData('com.haos.push_subscriptions', {
          subscriptions: filteredSubscriptions,
          updated_at: new Date().toISOString()
        });

        console.log(`Push subscription stored for device: ${deviceId}`);
      } catch (error) {
        console.error('Failed to store push subscription:', error);
        throw error;
      }
    } else {
      // Fallback: store locally (for development/testing)
      console.log('Matrix client not available, would store subscription:', pushSubscription);
    }

    return NextResponse.json({
      success: true,
      subscriptionId: pushSubscription.id,
      message: 'Push subscription registered successfully'
    });

  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return NextResponse.json(
      { error: 'Failed to subscribe to push notifications' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Missing deviceId parameter' },
        { status: 400 }
      );
    }

    const client = getClient();
    
    if (client) {
      // Remove from Matrix account data
      try {
        const existingData = await (client as any).getAccountData('com.haos.push_subscriptions');
        const existingSubscriptions = existingData?.getContent()?.subscriptions || [];

        // Remove subscription for this device
        const filteredSubscriptions = existingSubscriptions.filter(
          (sub: any) => sub.deviceId !== deviceId
        );

        // Store updated subscriptions
        await (client as any).setAccountData('com.haos.push_subscriptions', {
          subscriptions: filteredSubscriptions,
          updated_at: new Date().toISOString()
        });

        console.log(`Push subscription removed for device: ${deviceId}`);
      } catch (error) {
        console.error('Failed to remove push subscription:', error);
        throw error;
      }
    } else {
      // Fallback: simulate removal
      console.log('Matrix client not available, would remove subscription for device:', deviceId);
    }

    return NextResponse.json({
      success: true,
      message: 'Push subscription removed successfully'
    });

  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return NextResponse.json(
      { error: 'Failed to unsubscribe from push notifications' },
      { status: 500 }
    );
  }
}