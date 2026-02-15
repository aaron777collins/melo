import { NextResponse } from "next/server";
import { getSessionCookie } from "@/lib/matrix/cookies";

/**
 * POST /api/messages
 * Send a message to a Matrix room
 * 
 * Query params:
 * - channelId: Matrix room ID to send message to
 * - serverId: Parent space ID (for logging/validation)
 * 
 * Body:
 * - content: Message text
 */
export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const channelId = searchParams.get("channelId");
    const serverId = searchParams.get("serverId");
    
    const body = await req.json();
    const { content } = body;
    
    if (!channelId) {
      return NextResponse.json(
        { error: "Channel ID required" },
        { status: 400 }
      );
    }
    
    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Message content required" },
        { status: 400 }
      );
    }
    
    // Get session from cookies (properly decoded)
    const session = await getSessionCookie();
    
    if (!session?.accessToken || !session?.homeserverUrl) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }
    
    const { accessToken, homeserverUrl } = session;
    
    // Send message to Matrix room
    const baseUrl = homeserverUrl.replace(/\/+$/, '');
    const txnId = `m${Date.now()}`;
    const sendUrl = `${baseUrl}/_matrix/client/v3/rooms/${encodeURIComponent(channelId)}/send/m.room.message/${txnId}`;
    
    const response = await fetch(sendUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        msgtype: 'm.text',
        body: content,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error("[API/messages] Matrix error:", error);
      return NextResponse.json(
        { error: error.error || "Failed to send message" },
        { status: response.status }
      );
    }
    
    const result = await response.json();
    
    console.log("[API/messages] Message sent:", result.event_id);
    
    return NextResponse.json({
      success: true,
      eventId: result.event_id,
    });
    
  } catch (error) {
    console.error("[API/messages] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
