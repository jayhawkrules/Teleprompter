/**
 * Shared utilities for seo-aeo-optimizer scripts.
 * Detects package manager, stack class, repo root, and provides typed helpers.
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';

export type PackageManager = 'pnpm' | 'yarn' | 'npm';
export type StackClass = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface RepoContext {
  root: string;
  packageManager: PackageManager;
  stack: StackClass;
  hasNextAppRouter: boolean;
  hasNextPagesRouter: boolean;
  hasFirebase: boolean;
  hasCapacitor: boolean;
  hasViteReact: boolean;
  publicDir: string | null;
  siteUrl: string | null;
}

export function findRepoRoot(start: string = process.cwd()): string {
  let dir = resolve(start);
  while (dir !== '/') {
    if (existsSync(join(dir, '.git'))) return dir;
    dir = resolve(dir, '..');
  }
  // Fallback: cwd
  return resolve(start);
}

export function detectPackageManager(root: string): PackageManager {
  if (existsSync(join(root, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(root, 'yarn.lock'))) return 'yarn';
  return 'npm';
}

export function detectStack(root: string): StackClass {
  const hasPkg = existsSync(join(root, 'package.json'));
  const hasIndexHtml = existsSync(join(root, 'index.html'));
  const hasFirebase = existsSync(join(root, 'firebase.json'));
  const hasComposer = existsSync(join(root, 'composer.json'));
  const hasWp = existsSync(join(root, 'wp-config.php'));

  if (!hasPkg && !hasIndexHtml && !hasComposer && !hasWp) return 'F';
  if (hasComposer || hasWp) return 'D';

  if (hasPkg) {
    let pkg: Record<string, unknown> = {};
    try { pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')); } catch {}
    const deps = { ...(pkg.dependencies as Record<string, string> || {}), ...(pkg.devDependencies as Record<string, string> || {}) };
    const hasReact = 'react' in deps;
    const hasNext = 'next' in deps;
    const hasVite = 'vite' in deps;

    // Stack E: cron-driven JS, no React/UI
    if (!hasReact && !hasNext && !hasVite && existsSync(join(root, '.github/workflows'))) return 'E';

    // Stack A: Vite + React + Firebase
    if (hasVite && hasReact && hasFirebase) return 'A';
    // Stack A (Firebase even without Vite — App Hosting variant)
    if (hasReact && hasFirebase) return 'A';
    // Stack B: Next.js or other TS-with-backend
    if (hasNext) return 'B';
    if (hasReact || 'typescript' in deps) return 'B';
  }

  if (hasIndexHtml && !hasPkg) return 'C';
  return 'F';
}

export function detectFrameworkSpecifics(root: string) {
  const appDir = join(root, 'app');
  const pagesDir = join(root, 'pages');
  const hasNextAppRouter =
    existsSync(appDir) && statSync(appDir).isDirectory() &&
    safeReaddir(appDir).some((f) => f === 'page.tsx' || f === 'page.jsx' || f === 'layout.tsx');
  const hasNextPagesRouter =
    existsSync(pagesDir) && statSync(pagesDir).isDirectory() &&
    (existsSync(join(pagesDir, '_app.tsx')) || existsSync(join(pagesDir, '_app.js')));
  const hasFirebase = existsSync(join(root, 'firebase.json'));
  const hasCapacitor = existsSync(join(root, 'capacitor.config.ts')) || existsSync(join(root, 'capacitor.config.json'));
  const publicDir = existsSync(join(root, 'public')) ? join(root, 'public') : null;

  let pkg: Record<string, unknown> = {};
  try { pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')); } catch {}
  const deps = { ...(pkg.dependencies as Record<string, string> || {}), ...(pkg.devDependencies as Record<string, string> || {}) };
  const hasViteReact = 'vite' in deps && 'react' in deps;

  return { hasNextAppRouter, hasNextPagesRouter, hasFirebase, hasCapacitor, hasViteReact, publicDir };
}

function safeReaddir(dir: string): string[] {
  try { return require('node:fs').readdirSync(dir); } catch { return []; }
}

export function detectSiteUrl(root: string): string | null {
  // Try .env.example
  const envExample = join(root, '.env.example');
  if (existsSync(envExample)) {
    const content = readFileSync(envExample, 'utf8');
    const match = content.match(/^(NEXT_PUBLIC_SITE_URL|VITE_PUBLIC_SITE_URL|PUBLIC_SITE_URL|APP_URL)=(\S+)/m);
    if (match) return match[2].replace(/^["']|["']$/g, '');
  }
  return null;
}

export function getRepoContext(root?: string): RepoContext {
  const r = root || findRepoRoot();
  const fw = detectFrameworkSpecifics(r);
  return {
    root: r,
    packageManager: detectPackageManager(r),
    stack: detectStack(r),
    ...fw,
    siteUrl: detectSiteUrl(r),
  };
}

/**
 * Fetch a URL and return { status, contentType, body } or throw on network failure.
 * For local-only audits, the URL may be 'http://localhost:PORT/path' with the server already running.
 */
export async function fetchUrl(url: string): Promise<{ status: number; contentType: string; body: string }> {
  const res = await fetch(url, { redirect: 'manual' });
  const body = await res.text();
  return {
    status: res.status,
    contentType: res.headers.get('content-type') || '',
    body,
  };
}

/** Print error and exit with code 1. Validators must fail loudly. */
export function failHard(message: string, details?: unknown): never {
  console.error(`❌ ${message}`);
  if (details) console.error(JSON.stringify(details, null, 2));
  process.exit(1);
}

/** Print success and exit 0. */
export function passSoft(message: string, details?: unknown): never {
  console.log(`✅ ${message}`);
  if (details) console.log(JSON.stringify(details, null, 2));
  process.exit(0);
}

/** Read a JSON file or return null. */
export function readJsonFile<T = unknown>(path: string): T | null {
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, 'utf8')) as T; } catch { return null; }
}

/** Append a JSONL line to a file. */
export function appendJsonLine(path: string, line: Record<string, unknown>): void {
  const fs = require('node:fs');
  const dir = require('node:path').dirname(path);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(path, JSON.stringify(line) + '\n', 'utf8');
}

/** CLI flag parser — `--key value` or `--key=value` or `--bool`. */
export function parseFlags(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const eq = a.indexOf('=');
    if (eq > 0) { out[a.slice(2, eq)] = a.slice(eq + 1); continue; }
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) { out[a.slice(2)] = next; i++; continue; }
    out[a.slice(2)] = true;
  }
  return out;
}
