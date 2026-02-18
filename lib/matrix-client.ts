import { MatrixClient, createClient, MatrixError } from "matrix-js-sdk";

declare global {
  var matrixClient: MatrixClient | undefined;
}

let clientInstance: MatrixClient | null = null;

export const getMatrixClient = (): MatrixClient | null => {
  if (typeof window === "undefined") {
    // Server-side: create a new client each time if needed
    return null;
  }
  
  if (!clientInstance && typeof window !== "undefined") {
    // Client-side: create singleton instance
    const accessToken = localStorage.getItem("matrix_access_token");
    const homeserver = localStorage.getItem("matrix_homeserver") || "https://matrix.org";
    const userId = localStorage.getItem("matrix_user_id");
    
    if (accessToken && userId) {
      clientInstance = createClient({
        baseUrl: homeserver,
        accessToken: accessToken,
        userId: userId,
        store: new (require("matrix-js-sdk").MemoryStore)(),
        scheduler: new (require("matrix-js-sdk").MatrixScheduler)(),
      });
    }
  }
  
  return clientInstance;
};

export const initializeMatrixClient = async (
  homeserver: string,
  username: string,
  password: string
): Promise<MatrixClient | null> => {
  try {
    const tempClient = createClient({ baseUrl: homeserver });
    
    const loginResponse = await tempClient.loginWithPassword(username, password);
    
    // Store credentials in localStorage
    localStorage.setItem("matrix_access_token", loginResponse.access_token);
    localStorage.setItem("matrix_homeserver", homeserver);
    localStorage.setItem("matrix_user_id", loginResponse.user_id);
    
    // Create the actual client
    clientInstance = createClient({
      baseUrl: homeserver,
      accessToken: loginResponse.access_token,
      userId: loginResponse.user_id,
      store: new (require("matrix-js-sdk").MemoryStore)(),
      scheduler: new (require("matrix-js-sdk").MatrixScheduler)(),
    });
    
    // Start the client
    await clientInstance.startClient({ initialSyncLimit: 10 });
    
    return clientInstance;
  } catch (error) {
    console.error("Failed to initialize Matrix client:", error);
    return null;
  }
};

export const logoutMatrixClient = async (): Promise<void> => {
  if (clientInstance) {
    try {
      await clientInstance.logout();
    } catch (error) {
      console.error("Error logging out:", error);
    }
    
    clientInstance.stopClient();
    clientInstance = null;
  }
  
  // Clear stored credentials
  localStorage.removeItem("matrix_access_token");
  localStorage.removeItem("matrix_homeserver");
  localStorage.removeItem("matrix_user_id");
};

export const matrixClient = getMatrixClient();