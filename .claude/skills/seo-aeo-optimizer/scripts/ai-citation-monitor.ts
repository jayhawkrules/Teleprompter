#!/usr/bin/env tsx
/**
 * ai-citation-monitor.ts — track whether the brand appears in AI search engine
 * answers to priority queries. Most engines don't have a public API for this;
 * the script supports manual entry mode with a structured prompt and a coverage
 * report mode.
 *
 * Usage:
 *   npx tsx ai-citation-monitor.ts --report                    # show current coverage
 *   npx tsx ai-citation-monitor.ts --log --engine perplexity --query "X" --mentioned --cited
 *   npx tsx ai-citation-monitor.ts --queries-from docs/seo/keyword-map.json
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { findRepoRoot, parseFlags, failHard } from './_lib.js';

interface CitationLogEntry {
  date: string;
  engine: 'chatgpt' | 'perplexity' | 'gemini' | 'google_ai_overviews';
  query: string;
  mentioned: boolean;
  cited: boolean;
  competitors: string[];
  notes: string;
}

interface KeywordMap {
  brand?: string;
  priorityQueries?: string[];
  competitors?: string[];
}

function readLog(path: string): CitationLogEntry[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

function appendLog(path: string, entry: CitationLogEntry) {
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, JSON.stringify(entry) + '\n', 'utf8');
}

function reportCoverage(entries: CitationLogEntry[], queries: string[]) {
  console.log('AI Citation Coverage Report');
  console.log('='.repeat(60));
  if (entries.length === 0) {
    console.log('No log entries yet. Use --log to record results.');
    return;
  }
  // Group by query × engine
  const engines: CitationLogEntry['engine'][] = ['chatgpt', 'perplexity', 'gemini', 'google_ai_overviews'];
  const headerRow = ['Query', ...engines].join(' | ');
  console.log(headerRow);
  console.log('-'.repeat(headerRow.length));
  const allQueries = queries.length ? queries : [...new Set(entries.map((e) => e.query))];
  for (const q of allQueries) {
    const cells = engines.map((eng) => {
      const matching = entries.filter((e) => e.query === q && e.engine === eng);
      const latest = matching.sort((a, b) => b.date.localeCompare(a.date))[0];
      if (!latest) return '—';
      if (latest.cited) return '🟢 cited';
      if (latest.mentioned) return '🟡 mentioned';
      return '🔴 absent';
    });
    console.log([q.slice(0, 50), ...cells].join(' | '));
  }
  console.log('');
  console.log(`Total log entries: ${entries.length}`);
  const cited = entries.filter((e) => e.cited).length;
  const mentioned = entries.filter((e) => e.mentioned).length;
  console.log(`Cited:     ${cited}/${entries.length} (${Math.round((cited / entries.length) * 100)}%)`);
  console.log(`Mentioned: ${mentioned}/${entries.length} (${Math.round((mentioned / entries.length) * 100)}%)`);
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  const root = findRepoRoot();
  const logPath = join(root, 'docs', 'seo', 'ai-citation-log.jsonl');

  // Read keyword map for queries
  const kwMapPath = (flags['queries-from'] as string) || join(root, 'docs', 'seo', 'keyword-map.json');
  let kwMap: KeywordMap = {};
  if (existsSync(kwMapPath)) {
    try { kwMap = JSON.parse(readFileSync(kwMapPath, 'utf8')) as KeywordMap; } catch {}
  }

  if (flags.log) {
    const engine = String(flags.engine || '').toLowerCase() as CitationLogEntry['engine'];
    if (!['chatgpt', 'perplexity', 'gemini', 'google_ai_overviews'].includes(engine)) {
      failHard('--engine must be one of: chatgpt | perplexity | gemini | google_ai_overviews');
    }
    if (!flags.query) failHard('--query required');
    const entry: CitationLogEntry = {
      date: new Date().toISOString().split('T')[0],
      engine,
      query: String(flags.query),
      mentioned: Boolean(flags.mentioned),
      cited: Boolean(flags.cited),
      competitors: typeof flags.competitors === 'string' ? String(flags.competitors).split(',') : (kwMap.competitors || []),
      notes: typeof flags.notes === 'string' ? String(flags.notes) : '',
    };
    appendLog(logPath, entry);
    console.log(`✅ Logged: ${entry.engine} × "${entry.query.slice(0, 50)}…" — mentioned=${entry.mentioned}, cited=${entry.cited}`);
    return;
  }

  if (flags.report || (!flags.log && !flags['queries-from'])) {
    const entries = readLog(logPath);
    reportCoverage(entries, kwMap.priorityQueries || []);
    return;
  }

  if (flags['queries-from']) {
    if (!kwMap.priorityQueries?.length) failHard(`No priorityQueries in ${kwMapPath}`);
    console.log('Manual citation check needed. For each query × engine, run:');
    console.log('');
    for (const q of kwMap.priorityQueries) {
      for (const eng of ['chatgpt', 'perplexity', 'gemini', 'google_ai_overviews']) {
        console.log(`npx tsx ai-citation-monitor.ts --log --engine ${eng} --query "${q}" [--mentioned] [--cited] [--notes "..."]`);
      }
      console.log('');
    }
  }
}

main().catch((err) => failHard('ai-citation-monitor failed', err instanceof Error ? err.message : err));
