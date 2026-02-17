import { NextResponse } from "next/server";
import { getSessionCookie } from "@/lib/matrix/cookies";
import {  createClient  } from "@/lib/matrix/matrix-sdk-exports";

/**
 * POST /api/reports
 * Submit a message report to server moderators
 * 
 * Body:
 * - eventId: The Matrix event ID of the reported message
 * - roomId: The Matrix room ID where the message was sent
 * - senderId: The Matrix user ID who sent the message
 * - reason: The reason for reporting the message
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { eventId, roomId, senderId, reason } = body;
    
    // Validate required fields
    if (!eventId || !roomId || !senderId || !reason) {
      return NextResponse.json(
        { error: "Missing required fields: eventId, roomId, senderId, reason" },
        { status: 400 }
      );
    }
    
    if (typeof reason !== "string" || reason.trim().length === 0) {
      return NextResponse.json(
        { error: "Reason must be a non-empty string" },
        { status: 400 }
      );
    }
    
    // Get session from cookies
    const session = await getSessionCookie();
    
    if (!session?.accessToken || !session?.homeserverUrl || !session?.userId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }
    
    const { accessToken, homeserverUrl, userId } = session;
    
    // Create Matrix client
    const client = createClient({
      baseUrl: homeserverUrl,
      accessToken: accessToken,
      userId: userId,
    });
    
    // Start the client to access room data
    await client.startClient({ initialSyncLimit: 0 });
    
    // Wait for initial sync to complete
    await new Promise((resolve) => {
      const onSync = (state: string) => {
        if (state === 'PREPARED') {
          client.removeListener('sync' as any, onSync);
          resolve(void 0);
        }
      };
      client.on('sync' as any, onSync);
    });
    
    try {
      // Verify the room exists and user has access
      const room = client.getRoom(roomId);
      if (!room) {
        return NextResponse.json(
          { error: "Room not found or access denied" },
          { status: 404 }
        );
      }
      
      // Verify the reported event exists
      const event = room.findEventById(eventId);
      if (!event) {
        return NextResponse.json(
          { error: "Reported message not found" },
          { status: 404 }
        );
      }
      
      // Create report data
      const reportData = {
        reportId: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        reportedEventId: eventId,
        reportedUserId: senderId,
        reportedBy: userId,
        roomId: roomId,
        reason: reason.trim(),
        timestamp: new Date().toISOString(),
        messageContent: event.getContent()?.body || '[Unable to retrieve message content]',
        messageTimestamp: new Date(event.getTs()).toISOString(),
      };
      
      // 1. Send report to moderators via room state event
      // This creates a persistent audit trail in the room
      await client.sendStateEvent(
        roomId,
        'org.haos.reports.message' as any,
        {
          ...reportData,
          status: 'pending',
          version: '1.0'
        },
        reportData.reportId
      );
      
      // 2. Log in moderation audit trail
      await client.sendStateEvent(
        roomId,
        'org.haos.moderation.log' as any,
        {
          action: 'report_message',
          moderatorId: userId, // The reporter becomes the "moderator" for logging purposes
          targetUserId: senderId,
          eventId: eventId,
          roomId: roomId,
          reason: `Report: ${reason.trim()}`,
          timestamp: reportData.timestamp,
          metadata: {
            reportId: reportData.reportId,
            messageContent: reportData.messageContent,
            messageTimestamp: reportData.messageTimestamp
          },
          version: '1.0'
        },
        `${reportData.timestamp}_report_message_${reportData.reportId}`
      );
      
      // 3. Try to find a dedicated moderation room and send notification
      // This is optional - if it fails, the report still exists in the room state
      try {
        // Look for a moderation room (common naming conventions)
        const rooms = client.getRooms();
        const moderationRoom = rooms.find(r => {
          const name = r.name?.toLowerCase();
          return name?.includes('moderation') || name?.includes('admin') || name?.includes('reports');
        });
        
        if (moderationRoom) {
          // Send a notification message to the moderation room
          const notificationContent = {
            msgtype: 'm.text',
            body: `🚨 New Message Report\n\n` +
                  `Reporter: ${userId}\n` +
                  `Reported User: ${senderId}\n` +
                  `Room: ${room.name || roomId}\n` +
                  `Reason: ${reason.trim()}\n` +
                  `Message: "${reportData.messageContent}"\n\n` +
                  `Report ID: ${reportData.reportId}\n` +
                  `Event ID: ${eventId}`,
            format: 'org.matrix.custom.html',
            formatted_body: `<h3>🚨 New Message Report</h3>` +
                           `<p><strong>Reporter:</strong> ${userId}<br>` +
                           `<strong>Reported User:</strong> ${senderId}<br>` +
                           `<strong>Room:</strong> ${room.name || roomId}<br>` +
                           `<strong>Reason:</strong> ${reason.trim()}<br>` +
                           `<strong>Message:</strong> "<em>${reportData.messageContent}</em>"</p>` +
                           `<p><strong>Report ID:</strong> <code>${reportData.reportId}</code><br>` +
                           `<strong>Event ID:</strong> <code>${eventId}</code></p>`
          };
          
          await client.sendMessage(moderationRoom.roomId, notificationContent as any);
          console.log(`[API/reports] Sent notification to moderation room: ${moderationRoom.roomId}`);
        }
      } catch (notificationError) {
        console.warn("[API/reports] Failed to send moderation notification:", notificationError);
        // Don't fail the whole operation if notification fails
      }
      
      console.log(`[API/reports] Report submitted:`, {
        reportId: reportData.reportId,
        reporter: userId,
        reportedUser: senderId,
        room: roomId,
        eventId: eventId
      });
      
      return NextResponse.json({
        success: true,
        reportId: reportData.reportId,
        message: "Report submitted successfully. Moderators have been notified."
      });
      
    } finally {
      // Clean up client
      client.stopClient();
    }
    
  } catch (error: any) {
    console.error("[API/reports] Error:", error);
    
    // Handle specific Matrix errors
    let errorMessage = "Failed to submit report";
    if (error.errcode === 'M_FORBIDDEN') {
      errorMessage = "You don't have permission to report messages in this room";
    } else if (error.errcode === 'M_NOT_FOUND') {
      errorMessage = "Message or room not found";
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}