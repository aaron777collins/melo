"use client";

import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function OfflinePageClient() {
  return (
    <div className="min-h-screen bg-[#36393f] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Offline Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <WifiOff className="h-24 w-24 text-red-500" />
            <div className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1">
              <span className="block h-3 w-3 rounded-full bg-white"></span>
            </div>
          </div>
        </div>

        {/* Main Message */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-white">
            You&apos;re Offline
          </h1>
          <p className="text-gray-300 text-lg">
            Melo needs an internet connection to sync with your Matrix homeserver.
          </p>
        </div>

        {/* Status and Actions */}
        <div className="space-y-6">
          <div className="bg-[#2f3136] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-center space-x-2 text-gray-400">
              <WifiOff className="h-4 w-4" />
              <span className="text-sm">Network connection unavailable</span>
            </div>
            
            <div className="text-xs text-gray-500 space-y-1">
              <p>• Check your internet connection</p>
              <p>• Verify your network settings</p>
              <p>• Try refreshing the page</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white font-medium py-3 px-4 rounded-md transition-colors flex items-center justify-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Try Again</span>
            </button>
            
            <Link
              href="/"
              className="block w-full bg-[#2f3136] hover:bg-[#35373c] text-gray-300 font-medium py-3 px-4 rounded-md transition-colors text-center"
            >
              Return to Home
            </Link>
          </div>
        </div>

        {/* Connection Status Indicator */}
        <div className="flex items-center justify-center space-x-2 text-sm">
          <div className="flex space-x-1">
            <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
            <div className="h-2 w-2 bg-gray-600 rounded-full"></div>
            <div className="h-2 w-2 bg-gray-600 rounded-full"></div>
          </div>
          <span className="text-gray-500">Checking connection...</span>
        </div>

        {/* Auto-retry Info */}
        <div className="text-xs text-gray-500 border-t border-gray-700 pt-4">
          <p>Melo will automatically retry connecting when your network is restored.</p>
        </div>
      </div>

      {/* Background Pattern */}
      <div className="fixed inset-0 -z-10 opacity-5">
        <div className="absolute inset-0" 
             style={{
               backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='m0 40 40-40h-20l-20 20zm40 0v-20l-20 20z'/%3E%3C/g%3E%3C/svg%3E")`,
               backgroundSize: '40px 40px'
             }}
        />
      </div>
    </div>
  );
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