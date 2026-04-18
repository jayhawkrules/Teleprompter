// Single source of truth for app version.
// __APP_VERSION__ and __APP_BUILD_DATE__ are injected by vite.config.ts at build time.
// In dev mode they fall back to the values below.
declare const __APP_VERSION__: string;
declare const __APP_BUILD_DATE__: string;

export const APP_VERSION: string =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.1';

export const APP_BUILD_DATE: string =
  typeof __APP_BUILD_DATE__ !== 'undefined' ? __APP_BUILD_DATE__ : new Date().toISOString();

/** Formatted for display: "v1.0.1 · 18 Apr 2026, 13:22" */
export function formatVersion(): string {
  const d = new Date(APP_BUILD_DATE);
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `v${APP_VERSION} · ${date}, ${time}`;
}
