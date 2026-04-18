import { useEffect, useState, useCallback } from 'react';
import { APP_VERSION } from '../version';

export function useAppUpdate(intervalMs = 5 * 60 * 1000) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);

  const check = useCallback(async () => {
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const remote = data?.version;
      if (!remote || !APP_VERSION || APP_VERSION === 'undefined') return;
      if (remote !== APP_VERSION) {
        setLatestVersion(remote);
        setUpdateAvailable(true);
      } else {
        setUpdateAvailable(false);
      }
    } catch {
      // Network unavailable
    }
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, intervalMs);
    return () => clearInterval(id);
  }, [check, intervalMs]);

  // Hide banner immediately, then reload after exit animation completes
  const refresh = useCallback(() => {
    setUpdateAvailable(false);
    setTimeout(() => window.location.reload(), 400);
  }, []);

  const dismiss = useCallback(() => {
    setUpdateAvailable(false);
  }, []);

  return { updateAvailable, latestVersion, refresh, dismiss };
}
