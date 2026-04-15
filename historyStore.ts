/**
 * historyStore.ts
 * Lightweight per-user history store — persists to data/history/<open_id>.json
 * No database required; survives server restarts and browser clears.
 */
import fs   from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data', 'history');
const MAX_ITEMS = 20;

export interface HistoryItem {
  id:        string;
  script:    string;
  caption:   string;
  topic?:    string;
  timestamp: number;
}

function userFile(openId: string): string {
  // Sanitise open_id so it can safely be used as a filename
  const safe = openId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(DATA_DIR, `${safe}.json`);
}

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function getHistory(openId: string): HistoryItem[] {
  ensureDir();
  const file = userFile(openId);
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as HistoryItem[];
  } catch {
    return [];
  }
}

export function addHistoryItem(
  openId: string,
  item: Omit<HistoryItem, 'id' | 'timestamp'> & { id?: string; timestamp?: number }
): HistoryItem[] {
  ensureDir();
  const existing = getHistory(openId);
  const newItem: HistoryItem = {
    id:        item.id        ?? Math.random().toString(36).substring(2, 9),
    timestamp: item.timestamp ?? Date.now(),
    script:    item.script,
    caption:   item.caption,
    topic:     item.topic,
  };
  const updated = [newItem, ...existing].slice(0, MAX_ITEMS);
  fs.writeFileSync(userFile(openId), JSON.stringify(updated, null, 2));
  return updated;
}

export function deleteHistoryItem(openId: string, id: string): HistoryItem[] {
  ensureDir();
  const updated = getHistory(openId).filter(item => item.id !== id);
  fs.writeFileSync(userFile(openId), JSON.stringify(updated, null, 2));
  return updated;
}
