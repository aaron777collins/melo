import { useContext } from 'react';
import MatrixPresenceService from '../services/matrix-presence';
import { MatrixClientContext } from '../context/MatrixClientContext'; // Assumed context

export default function useMatrixPresence(): MatrixPresenceService | null {
  const matrixClient = useContext(MatrixClientContext);
  
  if (!matrixClient) {
    console.warn('No Matrix client found');
    return null;
  }

  // Lazily create and attach presence service to the client
  if (!matrixClient.presenceService) {
    matrixClient.presenceService = new MatrixPresenceService(matrixClient);
  }

  return matrixClient.presenceService;
}