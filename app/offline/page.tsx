import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import Link from "next/link";
import OfflinePageClient from "./offline-page-client";

export const metadata = {
  title: "HAOS - Offline",
  description: "You are currently offline"
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function OfflinePage() {
  return <OfflinePageClient />;
}

// Client-side connection monitoring component
function ConnectionStatus() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            function updateConnectionStatus() {
              const isOnline = navigator.onLine;
              const statusElement = document.querySelector('.connection-status');
              
              if (statusElement) {
                if (isOnline) {
                  statusElement.innerHTML = '<div class="h-2 w-2 bg-green-500 rounded-full"></div><span class="text-gray-400">Connection restored - reloading...</span>';
                  setTimeout(() => window.location.reload(), 1000);
                } else {
                  statusElement.innerHTML = '<div class="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div><span class="text-gray-500">Still offline...</span>';
                }
              }
            }

            window.addEventListener('online', updateConnectionStatus);
            window.addEventListener('offline', updateConnectionStatus);
            
            // Check every 5 seconds
            setInterval(updateConnectionStatus, 5000);
          })();
        `
      }}
    />
  );
}