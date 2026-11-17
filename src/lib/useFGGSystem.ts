// src/lib/useFGGSystem.ts
'use client';

import { useState, useEffect } from 'react';
import { loadSystemState, FGGSystemState } from './fgg-engine';

export function useFGGSystem() {
  const [state, setState] = useState<FGGSystemState>(() => loadSystemState());
  const [timeUntilReset, setTimeUntilReset] = useState<string>('');

  useEffect(() => {
    const sync = () => setState(loadSystemState());
    sync();

    // Listen for live updates across tabs/components
    window.addEventListener('fgg-system-update', sync);
    window.addEventListener('storage', sync);

    // Live 1-second heartbeat for countdown + automatic midnight rollover check
    const timer = setInterval(() => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();

      const hrs = String(Math.floor((diff / (1000 * 60 * 60)) % 24)).padStart(2, '0');
      const mins = String(Math.floor((diff / 1000 / 60) % 60)).padStart(2, '0');
      const secs = String(Math.floor((diff / 1000) % 60)).padStart(2, '0');
      setTimeUntilReset(`${hrs}:${mins}:${secs}`);

      // Re-check state in case midnight just passed
      sync();
    }, 1000);

    return () => {
      window.removeEventListener('fgg-system-update', sync);
      window.removeEventListener('storage', sync);
      clearInterval(timer);
    };
  }, []);

  return { state, setState, timeUntilReset };
}