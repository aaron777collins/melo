import { toast } from "sonner";

// Note: Using a different name to avoid collision with global ServiceWorkerRegistration
export interface ServiceWorkerManagerAPI {
  register: () => Promise<globalThis.ServiceWorkerRegistration | undefined>;
  unregister: () => Promise<void>;
  checkForUpdates: () => Promise<void>;
  skipWaiting: () => void;
  onUpdate: (callback: (registration: globalThis.ServiceWorkerRegistration) => void) => void;
  onOffline: (callback: () => void) => void;
  onOnline: (callback: () => void) => void;
}

class ServiceWorkerRegistrationManager {
  private registration: globalThis.ServiceWorkerRegistration | null = null;
  private isOnline: boolean = true;
  private updateCallbacks: Array<(registration: globalThis.ServiceWorkerRegistration) => void> = [];
  private offlineCallbacks: Array<() => void> = [];
  private onlineCallbacks: Array<() => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;
      this.setupEventListeners();
    }
  }

  async register(): Promise<globalThis.ServiceWorkerRegistration | undefined> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.warn('[SW] Service workers are not supported');
      return undefined;
    }

    try {
      console.log('[SW] Registering service worker...');
      
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('[SW] Registration successful:', this.registration);

      // Handle updates
      this.registration.addEventListener('updatefound', this.handleUpdateFound.bind(this));

      // Check for existing updates
      if (this.registration.waiting) {
        this.showUpdateAvailable();
      }

      // Listen for messages from the service worker
      navigator.serviceWorker.addEventListener('message', this.handleMessage.bind(this));

      // Handle controller changes (when SW takes control)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[SW] Controller changed, reloading page');
        window.location.reload();
      });

      return this.registration;
    } catch (error) {
      console.error('[SW] Registration failed:', error);
      throw error;
    }
  }

  async unregister(): Promise<void> {
    if (!this.registration) {
      console.warn('[SW] No registration found');
      return;
    }

    try {
      const result = await this.registration.unregister();
      console.log('[SW] Unregistered:', result);
      this.registration = null;
    } catch (error) {
      console.error('[SW] Unregistration failed:', error);
      throw error;
    }
  }

  async checkForUpdates(): Promise<void> {
    if (!this.registration) {
      console.warn('[SW] No registration found');
      return;
    }

    try {
      console.log('[SW] Checking for updates...');
      await this.registration.update();
    } catch (error) {
      console.error('[SW] Update check failed:', error);
      throw error;
    }
  }

  skipWaiting(): void {
    if (this.registration?.waiting) {
      console.log('[SW] Skipping waiting...');
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }

  onUpdate(callback: (registration: globalThis.ServiceWorkerRegistration) => void): void {
    this.updateCallbacks.push(callback);
  }

  onOffline(callback: () => void): void {
    this.offlineCallbacks.push(callback);
  }

  onOnline(callback: () => void): void {
    this.onlineCallbacks.push(callback);
  }

  private handleUpdateFound(): void {
    if (!this.registration) return;

    const installingWorker = this.registration.installing;
    if (!installingWorker) return;

    installingWorker.addEventListener('statechange', () => {
      if (installingWorker.state === 'installed') {
        if (navigator.serviceWorker.controller) {
          // New service worker available
          this.showUpdateAvailable();
        } else {
          // Content is cached for offline use
          console.log('[SW] Content is cached for offline use');
          toast.success('App is ready for offline use', {
            duration: 3000,
          });
        }
      }
    });
  }

  private showUpdateAvailable(): void {
    console.log('[SW] New content available');
    
    // Notify callbacks
    this.updateCallbacks.forEach(callback => {
      if (this.registration) {
        callback(this.registration);
      }
    });

    // Show update toast
    toast('App update available', {
      description: 'Click to refresh and get the latest version',
      action: {
        label: 'Refresh',
        onClick: () => {
          this.skipWaiting();
        },
      },
      duration: 10000,
    });
  }

  private handleMessage(event: MessageEvent): void {
    const { data } = event;
    
    if (data && data.type) {
      switch (data.type) {
        case 'SW_UPDATE_AVAILABLE':
          this.showUpdateAvailable();
          break;
        case 'SW_OFFLINE_READY':
          console.log('[SW] App ready for offline use');
          toast.success('App is ready for offline use');
          break;
        case 'SW_BACKGROUND_SYNC_SUCCESS':
          console.log('[SW] Background sync completed');
          toast.success('Messages synced');
          break;
        case 'SW_BACKGROUND_SYNC_FAILED':
          console.log('[SW] Background sync failed');
          toast.error('Failed to sync messages');
          break;
        default:
          console.log('[SW] Unknown message:', data);
      }
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  private handleOnline(): void {
    if (!this.isOnline) {
      this.isOnline = true;
      console.log('[SW] Back online');
      toast.success('Connection restored', {
        duration: 3000,
      });
      
      this.onlineCallbacks.forEach(callback => callback());

      // Check for updates when back online
      if (this.registration) {
        this.checkForUpdates();
      }
    }
  }

  private handleOffline(): void {
    if (this.isOnline) {
      this.isOnline = false;
      console.log('[SW] Gone offline');
      toast.warning('You are now offline', {
        description: 'Some features may be limited',
        duration: 5000,
      });
      
      this.offlineCallbacks.forEach(callback => callback());
    }
  }

  isServiceWorkerSupported(): boolean {
    return typeof window !== 'undefined' && 'serviceWorker' in navigator;
  }

  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  getRegistration(): globalThis.ServiceWorkerRegistration | null {
    return this.registration;
  }
}

// Singleton instance
export const serviceWorkerManager = new ServiceWorkerRegistrationManager();

// Utility functions for easier usage
export async function registerServiceWorker(): Promise<globalThis.ServiceWorkerRegistration | undefined> {
  return serviceWorkerManager.register();
}

export async function unregisterServiceWorker(): Promise<void> {
  return serviceWorkerManager.unregister();
}

export async function checkForServiceWorkerUpdates(): Promise<void> {
  return serviceWorkerManager.checkForUpdates();
}

export function skipServiceWorkerWaiting(): void {
  return serviceWorkerManager.skipWaiting();
}

export function isServiceWorkerSupported(): boolean {
  return serviceWorkerManager.isServiceWorkerSupported();
}

export function getOnlineStatus(): boolean {
  return serviceWorkerManager.getOnlineStatus();
}