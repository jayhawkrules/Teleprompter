#!/usr/bin/env node
// generate-asset-manifest.mjs — scans repo for media and outputs asset-manifest.generated.json
// Usage: node generate-asset-manifest.mjs [--dir ./path]
import { readdirSync, statSync, writeFileSync } from 'fs';
import { join, extname, basename, relative } from 'path';
const IMAGE_EXTS = new Set(['.png','.jpg','.jpeg','.webp','.svg','.gif']);
const VIDEO_EXTS = new Set(['.mp4','.mov','.webm']);
const AUDIO_EXTS = new Set(['.mp3','.wav','.m4a','.aac']);
const SKIP = new Set(['node_modules','.git','dist','build','.next']);
const args = process.argv.slice(2);
const rootDir = args[args.indexOf('--dir')+1] ?? '.';
function walk(dir) {
  const out = [];
  try { for (const e of readdirSync(dir)) {
    if (SKIP.has(e)) continue;
    const full = join(dir,e);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else { const ext = extname(e).toLowerCase(); if (IMAGE_EXTS.has(ext)||VIDEO_EXTS.has(ext)||AUDIO_EXTS.has(ext)) out.push({full,ext,name:basename(e,ext)}); }
  }} catch {}
  return out;
}
function cat(p) {
  const l=p.toLowerCase();
  if(l.includes('logo'))return'logo'; if(l.includes('screenshot'))return'screenshot';
  if(l.includes('hero'))return'hero'; if(l.includes('icon'))return'icon';
  if(l.includes('voice'))return'voiceover'; return'asset';
}
const found = walk(rootDir);
const manifest = { app: basename(process.cwd()), version:'1.0.0', lastUpdated: new Date().toISOString().split('T')[0], brand:{name:'// TODO',accentColor:'// TODO',darkBg:'// TODO'}, images:[], voice:[], videos:[] };
for (const f of found) {
  const rel = relative(rootDir,f.full);
  const entry = { id:`${cat(rel)}-${f.name}`.replace(/[^a-zA-Z0-9-]/g,'-'), file:rel, description:'// TODO', approved:false };
  if(IMAGE_EXTS.has(f.ext)) manifest.images.push(entry);
  else if(VIDEO_EXTS.has(f.ext)) manifest.videos.push(entry);
  else manifest.voice.push({...entry, elevenLabsVoiceId:null});
}
writeFileSync(join(rootDir,'asset-manifest.generated.json'), JSON.stringify(manifest,null,2));
console.log(`Wrote asset-manifest.generated.json — set approved:true, fill brand, rename to asset-manifest.json`);
