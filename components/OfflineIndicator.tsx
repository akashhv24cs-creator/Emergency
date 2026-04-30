'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-toastify';

export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.error('Service Worker registration failed:', err);
      });
    }

    // Set initial state
    if (typeof navigator !== 'undefined') {
      setIsOffline(!navigator.onLine);
    }

    // Event Listeners
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => {
      setIsOffline(false);
      setShowBackOnline(true);
      toast.success('Back online - syncing...');
      
      // Hide the 'back online' banner after 3 seconds
      setTimeout(() => setShowBackOnline(false), 3000);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!isOffline && !showBackOnline) return null;

  return (
    <div className={`fixed top-0 left-0 w-full z-50 py-2 px-4 flex items-center justify-center gap-2 text-sm font-bold shadow-lg transition-all ${
      isOffline 
        ? 'bg-amber-500 text-amber-950' 
        : 'bg-emerald-500 text-emerald-950'
    }`}>
      {isOffline ? (
        <>
          <AlertTriangle className="w-4 h-4 transition-colors duration-300" />
          ⚠️ Offline Mode — changes will sync later
        </>
      ) : (
        <>
          <CheckCircle2 className="w-4 h-4 transition-colors duration-300" />
          ✅ Back online — syncing...
        </>
      )}
    </div>
  );
}
