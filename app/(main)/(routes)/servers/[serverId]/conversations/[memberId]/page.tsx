import { redirect } from "next/navigation";

interface ConversationPageProps {
  params: {
    serverId: string;
    memberId: string;
  };
}

/**
 * Direct Message Conversation Page
 * 
 * TODO: Implement Matrix DM support
 * For now, redirect back to the server
 */
export default async function ConversationPage({
  params
}: ConversationPageProps) {
  // Matrix DMs are just rooms between two users
  // This needs to be implemented with Matrix direct messages API
  
  return redirect(`/servers/${params.serverId}`);
}
