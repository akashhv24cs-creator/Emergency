'use client';

import { useEffect } from 'react';
import { useClerk } from '@clerk/nextjs';

export default function SessionGuard() {
  const { signOut, user } = useClerk();

  useEffect(() => {
    // sessionStorage is automatically cleared when the tab/browser is closed
    const isSessionActive = sessionStorage.getItem('sahay_session_active');

    if (!isSessionActive) {
      if (user) {
        console.log('[SessionGuard] New session detected, wiping old login data...');
        signOut();
      }
      sessionStorage.setItem('sahay_session_active', 'true');
    }

    const handleUnload = () => {
      // Best-effort logout on close
      navigator.sendBeacon('/api/logout');
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [user, signOut]);

  return null;
}
