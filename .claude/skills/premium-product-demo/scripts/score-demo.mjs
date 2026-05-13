#!/usr/bin/env node
// score-demo.mjs — 100-point quality rubric for generated demo components.
// Usage: node score-demo.mjs <path-to-component.tsx>
import { readFileSync } from 'fs';
import { resolve } from 'path';
const args = process.argv.slice(2);
if (!args[0]) { console.error('Usage: node score-demo.mjs <component.tsx>'); process.exit(1); }
const code = readFileSync(resolve(args[0]), 'utf-8');
const checks = [];
function check(name, pts, pass, warn) { checks.push({ name, pts, score: pass ? pts : 0, pass, warn }); }
check('CTA present', 15, /button|cta|onClick|submit|waitlist|sign.?up/i.test(code));
check('Motion framework', 15, /framer-motion|motion\.|gsap|animate/i.test(code));
check('Reduced motion', 10, /prefers-reduced-motion|prefersReduced/i.test(code));
check('App prefix', 5, /nl-|ch-|tp-|rs-|aw-|ph-|ps-|prefix/i.test(code));
check('Responsive layout', 10, /clamp\(|min-width|@media|grid|flex/i.test(code));
check('No layout animation', 10, !/animate.*?("width"|"height"|"top"|"left")/i.test(code));
check('Image alt text', 5, !/<img/i.test(code) || /alt=/i.test(code));
const hasH1 = /h1|headline|title/i.test(code);
const hasSub = /subhead|subtitle|description/i.test(code);
checks.push({ name: '3-second clarity', pts: 20, score: hasH1 && hasSub ? 20 : hasH1 ? 12 : 0, pass: hasH1, warn: !hasH1 ? 'No headline found' : null });
check('No placeholders', 10, !/lorem ipsum|example\.png|TODO.*replace/i.test(code));
const total = checks.reduce((s,c)=>s+c.score,0);
console.log(`\nDEMO SCORE: ${total}/100`);
for (const c of checks) console.log(`${c.pass?'✅':'❌'} ${c.name}: ${c.score}/${c.pts}${c.warn?' — '+c.warn:''}`);
console.log(`\n${total>=80?'🟢 Ship it':total>=60?'🟡 Needs polish':'🔴 Not ready'}`);
