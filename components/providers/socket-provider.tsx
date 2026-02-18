"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState
} from "react";
import { MatrixClient } from "matrix-js-sdk";
import { getMatrixClient } from "@/lib/matrix-client";

type MatrixContextType = {
  client: MatrixClient | null;
  isConnected: boolean;
};

const MatrixContext = createContext<MatrixContextType>({
  client: null,
  isConnected: false
});

export const useMatrix = () => {
  return useContext(MatrixContext);
};

// Backward compatibility - some components might still use useSocket
export const useSocket = () => {
  const { client, isConnected } = useMatrix();
  return { 
    socket: client, 
    isConnected 
  };
};

export function MatrixProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const [client, setClient] = useState<MatrixClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const matrixClient = getMatrixClient();
    
    if (matrixClient) {
      setClient(matrixClient);
      
      // Set up event handlers for connection status
      const handleSync = (state: string) => {
        if (state === "PREPARED" || state === "SYNCING") {
          setIsConnected(true);
        } else if (state === "ERROR" || state === "STOPPED") {
          setIsConnected(false);
        }
      };

      const handleClientError = () => {
        setIsConnected(false);
      };

      matrixClient.on("sync", handleSync);
      matrixClient.on("error", handleClientError);

      // Check if client is already synced
      if (matrixClient.getSyncState() === "SYNCING" || matrixClient.getSyncState() === "PREPARED") {
        setIsConnected(true);
      }

      return () => {
        matrixClient.off("sync", handleSync);
        matrixClient.off("error", handleClientError);
      };
    }
  }, []);

  return (
    <MatrixContext.Provider value={{ client, isConnected }}>
      {children}
    </MatrixContext.Provider>
  );
}

// For backward compatibility, export SocketProvider as MatrixProvider
export const SocketProvider = MatrixProvider;
