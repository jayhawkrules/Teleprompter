import { useEffect, useState, useCallback } from 'react';
import { APP_VERSION } from '../version';

/**
 * Polls /version.json every 5 minutes and compares the `version` field
 * against the APP_VERSION baked in at build time.
 *
 * Deploy step: update public/version.json to the new version string, e.g.:
 *   { "version": "1.0.2" }
 * Any open tab will show the update prompt within 5 minutes.
 */
export function useAppUpdate(intervalMs = 5 * 60 * 1000) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);

  const check = useCallback(async () => {
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const remote = data?.version;

      // Both versions must be real non-empty strings before we compare.
      // This prevents a false positive when APP_VERSION failed to inject.
      if (!remote || !APP_VERSION || APP_VERSION === 'undefined') return;

      if (remote !== APP_VERSION) {
        setLatestVersion(remote);
        setUpdateAvailable(true);
      } else {
        // Versions match — clear any stale update flag (e.g. after reload)
        setUpdateAvailable(false);
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
