/**
 * API endpoint to test push notifications
 * GET /api/notifications/test-push?userId=123&title=Test&body=Message
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { notificationHandler } from '@/lib/jobs/handlers/notification';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, title, body, tag } = req.query;

  if (!userId || !title || !body) {
    return res.status(400).json({
      error: 'Missing required parameters',
      required: ['userId', 'title', 'body'],
      received: { userId, title, body }
    });
  }

  try {
    const result = await notificationHandler.sendPushNotification({
      userId: userId as string,
      title: title as string,
      body: body as string,
      icon: '/icons/melo-logo-192.png',
      badge: '/icons/melo-badge-72.png',
      tag: tag as string || 'test-notification',
      data: {
        url: '/',
        timestamp: Date.now(),
        source: 'test-api'
      },
      actions: [
        {
          action: 'view',
          title: 'View',
          icon: '/icons/action-view.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icons/action-dismiss.png'
        }
      ]
    });

    return res.status(200).json({
      success: true,
      result,
      message: 'Push notification sent successfully'
    });
  } catch (error) {
    console.error('Test push notification failed:', error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}