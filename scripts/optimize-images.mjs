// One-time image pipeline: resizes the photos downloaded from stowawaylabs.com
// into AVIF + WebP + JPEG at a few widths. Usage:
//   node scripts/optimize-images.mjs /path/to/downloaded/originals
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const SRC = process.argv[2];
if (!SRC) { console.error('Pass the folder of original downloads.'); process.exit(1); }
const OUT = path.resolve('assets/img');
fs.mkdirSync(OUT, { recursive: true });

// original file (suffix match) -> friendly name
const MAP = {
  'jahnilynnphoto.com-83.jpg': 'deck-work',
  'jahnilynnphoto.com-95.jpg': 'harbor-dusk',
  'jahnilynnphoto.com-84.jpg': 'marina-day',
  'jahnilynnphoto.com-64.jpg': 'lounge-view',
  'jahnilynnphoto.com-45.jpg': 'monitor-desks',
  'jahnilynnphoto.com-8.jpg': 'founders',
  'Beyond-Habor-Waves-1-2.jpg': 'build-nick',
  'Beyond-Habor-Waves-7.jpg': 'build-view',
  'Beyond-Habor-Waves-8.jpg': 'build-window',
  'jahnilynnphoto.com-25.jpg': 'lounge-laptop',
  'jahnilynnphoto.com-28.jpg': 'booth-focus',
  'jahnilynnphoto.com-33.jpg': 'glass-room',
  'jahnilynnphoto.com-40.jpg': 'oar-wall-desks',
  'jahnilynnphoto.com-47.jpg': 'booth-row',
  'jahnilynnphoto.com-56.jpg': 'chart-lounge',
  'jahnilynnphoto.com-57.jpg': 'wheel-tables',
  'jahnilynnphoto.com-61.jpg': 'window-bar',
  'jahnilynnphoto.com-66.jpg': 'boat-shelf',
  'jahnilynnphoto.com-69.jpg': 'lamp-detail',
  'jahnilynnphoto.com-74.jpg': 'driftwood-detail',
  'jahnilynnphoto.com-76.jpg': 'front-door',
  'jahnilynnphoto.com-80.jpg': 'deck-table',
  'jahnilynnphoto.com-86.jpg': 'dusk-boats',
  'jahnilynnphoto.com-89.jpg': 'dock-pilings',
};

const files = fs.readdirSync(SRC);
const manifest = {};
for (const [suffix, name] of Object.entries(MAP)) {
  const f = files.find((x) => x.endsWith(suffix));
  if (!f) { console.warn('missing', suffix); continue; }
  const input = path.join(SRC, f);
  const meta = await sharp(input).metadata();
  const widths = [640, 1024, 1600].filter((w) => w <= meta.width);
  if (!widths.length || widths.at(-1) < meta.width && meta.width < 1600) widths.push(meta.width);
  const uniq = [...new Set(widths)];
  for (const w of uniq) {
    const base = sharp(input).rotate().resize({ width: w, withoutEnlargement: true });
    await base.clone().avif({ quality: 52, effort: 6 }).toFile(path.join(OUT, `${name}-${w}.avif`));
    await base.clone().webp({ quality: 72 }).toFile(path.join(OUT, `${name}-${w}.webp`));
    await base.clone().jpeg({ quality: 74, mozjpeg: true, progressive: true }).toFile(path.join(OUT, `${name}-${w}.jpg`));
  }
  manifest[name] = { widths: uniq, ratio: +(meta.height / meta.width).toFixed(4) };
  console.log(name, uniq.join(','));
}

// Open Graph image (1200x630) from the deck photo
const og = files.find((x) => x.endsWith('jahnilynnphoto.com-83.jpg'));
if (og) await sharp(path.join(SRC, og)).resize(1200, 630, { fit: 'cover', position: 'attention' }).jpeg({ quality: 80, mozjpeg: true }).toFile(path.join(OUT, 'og-stowaway-labs.jpg'));

// Logos: ink + cream versions of the lockup, trimmed
const logo = files.find((x) => x.includes('lockup-ink'));
if (logo) {
  const trimmed = await sharp(path.join(SRC, logo)).trim().png().toBuffer();
  await sharp(trimmed).resize({ width: 520 }).png({ compressionLevel: 9 }).toFile(path.join(OUT, 'logo-ink.png'));
  const { width, height } = await sharp(trimmed).resize({ width: 520 }).metadata().then(async () => sharp(await sharp(trimmed).resize({ width: 520 }).toBuffer()).metadata());
  const alpha = await sharp(trimmed).resize({ width: 520 }).extractChannel('alpha').toBuffer();
  await sharp({ create: { width, height, channels: 3, background: '#f4ede1' } }).joinChannel(alpha).png({ compressionLevel: 9 }).toFile(path.join(OUT, 'logo-cream.png'));
  manifest.logo = { width, height };
}
fs.writeFileSync(path.resolve('src/images.json'), JSON.stringify(manifest, null, 2));
console.log('done');
