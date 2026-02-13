import { debounce } from 'ts-debounce';
import { MatrixClient } from 'matrix-js-sdk';

export type PresenceState = 'online' | 'offline' | 'away' | 'do-not-disturb';

export class MatrixPresenceService {
  private client: MatrixClient;
  private typingTimeout: NodeJS.Timeout | null = null;

  constructor(client: MatrixClient) {
    this.client = client;
    this.setupPresenceListeners();
  }

  private setupPresenceListeners() {
    this.client.on('Event.presence', (event) => {
      const userId = event.getSender();
      const presenceState = this.convertMatrixPresenceToState(event.getContent().presence);
      
      // Emit a custom event for presence changes
      const presenceEvent = new CustomEvent('matrix-presence-change', {
        detail: { userId, presenceState }
      });
      window.dispatchEvent(presenceEvent);
    });
  }

  private convertMatrixPresenceToState(matrixPresence: string): PresenceState {
    switch (matrixPresence) {
      case 'online':
        return 'online';
      case 'unavailable':
        return 'away';
      case 'offline':
        return 'offline';
      default:
        return 'offline';
    }
  }

  public sendTypingNotification(roomId: string) {
    // Use debounce to prevent excessive typing events
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    this.client.sendTyping(roomId, true, 3000);

    this.typingTimeout = setTimeout(() => {
      this.client.sendTyping(roomId, false);
    }, 3000);
  }

  public getUserPresence(userId: string): PresenceState {
    const presence = this.client.getUser(userId)?.presence;
    return this.convertMatrixPresenceToState(presence || 'offline');
  }

  public subscribeToUserPresence(userId: string, callback: (state: PresenceState) => void) {
    const handlePresenceChange = (event: CustomEvent) => {
      if (event.detail.userId === userId) {
        callback(event.detail.presenceState);
      }
    };

    window.addEventListener('matrix-presence-change', handlePresenceChange);

    return () => {
      window.removeEventListener('matrix-presence-change', handlePresenceChange);
    };
  }
}

export default MatrixPresenceService;