import { redirect } from "next/navigation";
import { getSessionCookie } from "@/lib/matrix/cookies";

interface ServerIdPageProps {
  params: Promise<{
    serverId: string;
  }>;
}

/**
 * Server (Matrix Space) Page
 * 
 * Redirects to the first channel (usually "general") in the space.
 * The serverId is a URL-encoded Matrix room ID (e.g., !abc123:server.com)
 */
export default async function ServerIdPage({ params }: ServerIdPageProps) {
  // Next.js 15: params is async and must be awaited
  const { serverId } = await params;
  
  // Decode the Matrix room ID (it may be URL-encoded)
  const spaceId = decodeURIComponent(serverId);
  
  // Get session from cookies (properly decoded)
  const session = await getSessionCookie();
  
  if (!session?.accessToken || !session?.homeserverUrl) {
    return redirect("/sign-in");
  }
  
  try {
    const { accessToken, homeserverUrl } = session;
    
    // Fetch space children (channels) from Matrix
    const baseUrl = homeserverUrl.replace(/\/+$/, '');
    const hierarchyUrl = `${baseUrl}/_matrix/client/v1/rooms/${encodeURIComponent(spaceId)}/hierarchy?limit=20`;
    
    const response = await fetch(hierarchyUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      console.error("[ServerPage] Failed to fetch hierarchy:", response.status);
      // If we can't fetch, just show an error or redirect to home
      return redirect("/");
    }
    
    const hierarchy = await response.json();
    
    // Find the first non-space room (channel)
    // The first item is usually the space itself, so skip it
    const channels = hierarchy.rooms?.filter((room: any) => 
      room.room_id !== spaceId && 
      room.room_type !== "m.space"
    ) || [];
    
    if (channels.length > 0) {
      // Redirect to the first channel
      const firstChannel = channels[0];
      return redirect(`/servers/${encodeURIComponent(spaceId)}/channels/${encodeURIComponent(firstChannel.room_id)}`);
    }
    
    // No channels found - maybe show space settings or create channel prompt
    // For now, redirect back to home
    return redirect("/");
    
  } catch (error) {
    console.error("[ServerPage] Error:", error);
    return redirect("/sign-in");
  }
}
