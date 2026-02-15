/**
 * Conversation utilities
 * 
 * Matrix handles DMs natively - these are deprecated
 */

export async function getOrCreateConversation(
  memberOneId: string,
  memberTwoId: string
) {
  // Matrix DMs are rooms between users
  // Use Matrix SDK directly to create/find DMs
  console.warn("[conversation.ts] Deprecated: Use Matrix DM API");
  return null;
}

export async function findConversation(
  memberOneId: string,
  memberTwoId: string
) {
  console.warn("[conversation.ts] Deprecated: Use Matrix DM API");
  return null;
}

export async function createNewConversation(
  memberOneId: string,
  memberTwoId: string
) {
  console.warn("[conversation.ts] Deprecated: Use Matrix DM API");
  return null;
}
