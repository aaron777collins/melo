import { redirect } from "next/navigation";

interface InviteCodePageProps {
  params: {
    inviteCode: string;
  };
}

/**
 * Invite Code Page
 * 
 * TODO: Implement Matrix-based invite system
 * For now, redirect to home
 */
export default async function InviteCodePage({
  params
}: InviteCodePageProps) {
  // Matrix invite codes work differently
  // They use room aliases like #room:server.com
  // or room IDs directly
  // This needs to be implemented with Matrix invite API
  
  console.log("[InviteCodePage] Invite code:", params.inviteCode);
  
  // For now, redirect to home
  return redirect("/");
}
