'use client';

import { useEffect } from 'react';
import { useClerk } from '@clerk/nextjs';

export default function SessionGuard() {
  const { signOut, user } = useClerk();

  useEffect(() => {
    // sessionStorage is automatically cleared when the tab/browser is closed
    const isSessionActive = sessionStorage.getItem('sahay_session_active');

    if (!isSessionActive) {
      // If no active session flag exists, it means the browser was just opened
      // We force a sign out to clear any persistent cookies from Clerk
      if (user) {
        console.log('[SessionGuard] New session detected, wiping old login data...');
        signOut();
      }
      // Set the flag for this current session so we don't logout on every refresh
      sessionStorage.setItem('sahay_session_active', 'true');
    }
  }, [user, signOut]);

  return null;
}
