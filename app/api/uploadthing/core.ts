import { createUploadthing, type FileRouter } from "uploadthing/next";
import { headers } from "next/headers";

const f = createUploadthing();

const handleAuth = () => {
  // Get Matrix user ID from request headers (set by client)
  const headersList = headers();
  const userId = headersList.get("x-matrix-user-id");
  const accessToken = headersList.get("x-matrix-access-token");
  
  if (!userId || !accessToken) {
    throw new Error("Unauthorized! No Matrix credentials provided.");
  }
  
  // In a production setup, you would validate the access token with the homeserver
  // For now, we'll trust the client-provided credentials
  return { userId };
};

export const ourFileRouter = {
  serverImage: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(() => handleAuth())
    .onUploadComplete(() => {
      console.log("Server Image Upload Completed.");
    }),
  messageFile: f(["image", "pdf"])
    .middleware(() => handleAuth())
    .onUploadComplete(() => {
      console.log("Message File Upload Completed.");
    })
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
