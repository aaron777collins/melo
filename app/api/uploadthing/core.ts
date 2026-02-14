import { createUploadthing, type FileRouter } from "uploadthing/next";
import { getSessionCookie } from "@/lib/matrix/cookies";
import { validateSession } from "@/lib/matrix/auth";

const f = createUploadthing();

/**
 * File upload authentication handler using Matrix session
 */
const handleAuth = async () => {
  const session = await getSessionCookie();
  
  if (!session) {
    throw new Error("Unauthorized: No session found");
  }

  try {
    // Validate the session is still valid
    const user = await validateSession(session.accessToken, {
      homeserverUrl: session.homeserverUrl,
      includeProfile: false
    });

    return { userId: user.userId };
  } catch (error) {
    throw new Error("Unauthorized: Invalid session");
  }
};

export const ourFileRouter = {
  serverImage: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async () => await handleAuth())
    .onUploadComplete(() => {
      console.log("Server Image Upload Completed.");
    }),
  messageFile: f(["image", "pdf"])
    .middleware(async () => await handleAuth())
    .onUploadComplete(() => {
      console.log("Message File Upload Completed.");
    })
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
