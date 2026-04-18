import { useEffect, useState, useCallback } from 'react';
import { APP_VERSION } from '../version';

/**
 * Polls /version.json every 5 minutes and compares the `version` field
 * against the APP_VERSION baked in at build time.
 *
 * Deploy step: write a /version.json to your public folder containing:
 *   { "version": "1.0.2" }
 * When the deployed version differs from what the user is running,
 * `updateAvailable` becomes true and `refresh()` hard-reloads the page.
 */
export function useAppUpdate(intervalMs = 5 * 60 * 1000) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);

  const check = useCallback(async () => {
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.version && data.version !== APP_VERSION) {
        setLatestVersion(data.version);
        setUpdateAvailable(true);
      }
    } catch {
      // Network unavailable — silently ignore
    }
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, intervalMs);
    return () => clearInterval(id);
  }, [check, intervalMs]);

  const refresh = useCallback(() => {
    window.location.reload();
  }, []);

  return { updateAvailable, latestVersion, refresh };
}
