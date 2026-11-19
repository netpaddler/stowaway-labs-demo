// Static QA for the built site: node scripts/check.mjs
// Checks: no em/en dashes in copy, every <img> has alt, internal links and
// assets resolve, unique titles and descriptions, JSON-LD parses.
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const pages = fs.readdirSync(root).filter((f) => f.endsWith('.html'));
let problems = 0;
const fail = (f, m) => { problems++; console.log(`✗ ${f}: ${m}`); };
const titles = {}, descs = {};
for (const f of pages) {
  const html = fs.readFileSync(path.join(root, f), 'utf8');
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>/g, '');
  if (/[–—]|&mdash;|&ndash;/.test(text)) fail(f, 'contains an em or en dash');
  for (const m of html.matchAll(/<img\b[^>]*>/g)) if (!/\balt="/.test(m[0])) fail(f, `img without alt: ${m[0].slice(0, 80)}`);
  for (const m of html.matchAll(/\b(?:href|src|srcset)="([^"]+)"/g)) {
    for (const part of m[1].split(',')) {
      const u = part.trim().split(/\s+/)[0];
      if (!u || /^(https?:|mailto:|tel:|data:|#)/.test(u)) continue;
      const file = u.split('#')[0].split('?')[0];
      if (file && !fs.existsSync(path.join(root, file))) fail(f, `missing ${file}`);
    }
  }
  const t = (html.match(/<title>([^<]*)<\/title>/) || [])[1];
  const d = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1];
  if (!t) fail(f, 'no title'); else if (titles[t]) fail(f, `duplicate title with ${titles[t]}`); else titles[t] = f;
  if (!d) fail(f, 'no meta description'); else if (descs[d]) fail(f, `duplicate description with ${descs[d]}`); else descs[d] = f;
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); } catch { fail(f, 'invalid JSON-LD'); }
  }
  if ((html.match(/<h1\b/g) || []).length !== 1) fail(f, 'should have exactly one h1');
}
const jsCss = ['assets/js/book.js', 'assets/js/site.js', 'assets/js/smart.js', 'assets/css/site.css'].map((f) => fs.readFileSync(path.join(root, f), 'utf8')).join('');
if (/[–—]/.test(jsCss)) fail('assets/js', 'contains an em or en dash');
console.log(problems ? `\n${problems} problem(s) in ${pages.length} pages` : `✓ ${pages.length} pages passed static checks`);
process.exit(problems ? 1 : 0);
