#!/usr/bin/env tsx
/**
 * validate-schema.ts — find all JSON-LD blocks on each page, parse, validate
 * required fields per schema type, verify content matches visible page content.
 * Exits 1 on any validation failure.
 *
 * Usage:
 *   npx tsx validate-schema.ts --url https://yourdomain.com
 *   npx tsx validate-schema.ts --html /path/to/rendered.html  # local file
 */

import { existsSync, readFileSync } from 'node:fs';
import { findRepoRoot, parseFlags, fetchUrl, failHard, passSoft } from './_lib.js';

const REQUIRED_FIELDS: Record<string, string[]> = {
  Organization: ['name', 'url'],
  WebSite: ['name', 'url'],
  Article: ['headline', 'datePublished', 'author'],
  NewsArticle: ['headline', 'datePublished', 'author'],
  BlogPosting: ['headline', 'datePublished', 'author'],
  Product: ['name'],
  SoftwareApplication: ['name', 'applicationCategory'],
  Offer: ['price', 'priceCurrency'],
  FAQPage: ['mainEntity'],
  Question: ['name', 'acceptedAnswer'],
  Event: ['name', 'startDate', 'location'],
  Person: ['name'],
  BreadcrumbList: ['itemListElement'],
  HowTo: ['name', 'step'],
  Recipe: ['name', 'recipeIngredient', 'recipeInstructions'],
  LocalBusiness: ['name', 'address'],
};

interface SchemaError { schema: string; field: string; message: string }

function extractJsonLd(html: string): unknown[] {
  const matches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g)];
  const blocks: unknown[] = [];
  for (const m of matches) {
    try {
      const obj = JSON.parse(m[1].trim());
      if (Array.isArray(obj)) blocks.push(...obj);
      else blocks.push(obj);
    } catch (e) {
      blocks.push({ __error: 'Invalid JSON', __raw: m[1].slice(0, 100) });
    }
  }
  return blocks;
}

function validateSchemaObject(obj: any, errors: SchemaError[]) {
  if (obj.__error) {
    errors.push({ schema: 'unknown', field: 'JSON', message: obj.__error });
    return;
  }
  const type = obj['@type'];
  if (!type) {
    errors.push({ schema: 'unknown', field: '@type', message: 'Missing @type' });
    return;
  }
  const types = Array.isArray(type) ? type : [type];
  for (const t of types) {
    const required = REQUIRED_FIELDS[t];
    if (!required) continue; // unknown schema type — don't fail, just skip
    for (const field of required) {
      if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
        errors.push({ schema: t, field, message: `Required field missing or empty` });
      }
    }
    // Recurse into sub-objects with their own @type
    if (t === 'FAQPage' && Array.isArray(obj.mainEntity)) {
      for (const q of obj.mainEntity) {
        validateSchemaObject(q, errors);
        if (q.acceptedAnswer) validateSchemaObject(q.acceptedAnswer, errors);
      }
    }
    if (t === 'BreadcrumbList' && Array.isArray(obj.itemListElement)) {
      for (const item of obj.itemListElement) {
        if (!item.position || !item.name || !item.item) {
          errors.push({ schema: 'ListItem', field: 'position/name/item', message: 'BreadcrumbList ListItem missing required field' });
        }
      }
    }
  }
}

function visibleTextSnippet(html: string, maxChars: number = 5000): string {
  // Strip script/style, then tags
  return html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, maxChars);
}

function checkFaqContentMatch(blocks: unknown[], visibleText: string, errors: SchemaError[]) {
  for (const b of blocks as any[]) {
    if (b['@type'] !== 'FAQPage' || !Array.isArray(b.mainEntity)) continue;
    for (const q of b.mainEntity) {
      const qText = q.name as string | undefined;
      if (qText && !visibleText.toLowerCase().includes(qText.slice(0, 30).toLowerCase())) {
        errors.push({ schema: 'FAQPage', field: 'mainEntity.name', message: `FAQ question "${qText.slice(0, 60)}…" not found in visible page text — possible phantom claim` });
      }
    }
  }
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  let html: string;
  let sourceLabel: string;
  if (flags.html) {
    const path = String(flags.html);
    if (!existsSync(path)) failHard(`HTML file not found: ${path}`);
    html = readFileSync(path, 'utf8');
    sourceLabel = path;
  } else if (flags.url) {
    const { status, body } = await fetchUrl(String(flags.url));
    if (status !== 200) failHard(`URL returned ${status}: ${flags.url}`);
    html = body;
    sourceLabel = String(flags.url);
  } else {
    failHard('Must pass --url or --html');
  }

  const blocks = extractJsonLd(html);
  if (blocks.length === 0) failHard(`No JSON-LD found in ${sourceLabel}`);

  const errors: SchemaError[] = [];
  for (const b of blocks) validateSchemaObject(b, errors);
  checkFaqContentMatch(blocks, visibleTextSnippet(html), errors);

  if (errors.length) failHard(`${errors.length} schema validation errors in ${sourceLabel}`, errors);
  passSoft(`${blocks.length} JSON-LD blocks valid in ${sourceLabel}`);
}

main().catch((err) => failHard('validate-schema failed', err instanceof Error ? err.message : err));
