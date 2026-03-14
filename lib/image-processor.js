import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

export const CARD_FRAMES = {
  portrait: {
    width: 1080,
    height: 1920,
    safe: { top: 120, right: 76, bottom: 220, left: 76 },
  },
  square: {
    width: 1080,
    height: 1080,
    safe: { top: 84, right: 76, bottom: 152, left: 76 },
  },
};

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function loadImageBuffer(input) {
  if (Buffer.isBuffer(input)) return input;
  if (!input) throw new Error('No image input provided');

  if (/^https?:\/\//i.test(input)) {
    const res = await fetch(input);
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`);
    return Buffer.from(await res.arrayBuffer());
  }

  return fs.readFile(path.isAbsolute(input) ? input : path.join(process.cwd(), input));
}

function linesForText(text, limit = 26) {
  const words = String(text ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= limit) current = next;
    else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

function buildOverlaySvg(frame, event) {
  const { width, height, safe } = frame;
  const titleLines = linesForText(event.title, frame === CARD_FRAMES.square ? 24 : 20);
  const metaLine = [event.date, event.startTime].filter(Boolean).join(' · ');
  const venueLine = [event.venue, event.city].filter(Boolean).join(' · ');
  const titleFontSize = frame === CARD_FRAMES.square ? 64 : 74;
  const titleStartY = height - safe.bottom - (titleLines.length * (titleFontSize + 8)) - 110;
  const subtitleY = height - safe.bottom - 42;
  const badgeY = safe.top + 54;
  const mode = String(event.mode ?? '').toUpperCase();

  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(3,7,18,0.08)"/>
          <stop offset="42%" stop-color="rgba(3,7,18,0.14)"/>
          <stop offset="100%" stop-color="rgba(3,7,18,0.88)"/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${width}" height="${height}" fill="url(#fade)" />
      <rect x="${safe.left}" y="${badgeY - 34}" rx="24" ry="24" width="210" height="56" fill="rgba(12,18,34,0.75)" stroke="rgba(255,255,255,0.18)" />
      <text x="${safe.left + 24}" y="${badgeY}" fill="#4ecdc4" font-size="28" font-family="Arial, Helvetica, sans-serif" font-weight="700">OK LET'S GO</text>
      <text x="${width - safe.right}" y="${badgeY}" fill="rgba(255,255,255,0.9)" font-size="26" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-weight="700">${escapeXml(mode)}</text>
      ${titleLines.map((line, index) => `<text x="${safe.left}" y="${titleStartY + index * (titleFontSize + 8)}" fill="#ffffff" font-size="${titleFontSize}" font-family="Arial, Helvetica, sans-serif" font-weight="800">${escapeXml(line)}</text>`).join('')}
      ${metaLine ? `<text x="${safe.left}" y="${subtitleY - 48}" fill="rgba(255,255,255,0.92)" font-size="34" font-family="Arial, Helvetica, sans-serif" font-weight="600">${escapeXml(metaLine)}</text>` : ''}
      ${venueLine ? `<text x="${safe.left}" y="${subtitleY}" fill="rgba(255,255,255,0.82)" font-size="30" font-family="Arial, Helvetica, sans-serif" font-weight="500">${escapeXml(venueLine)}</text>` : ''}
    </svg>
  `);
}

async function renderCard(input, frame, event, outputBasePath) {
  const sourceBuffer = await loadImageBuffer(input);
  const overlay = buildOverlaySvg(frame, event);
  const pipeline = sharp(sourceBuffer)
    .resize(frame.width, frame.height, { fit: 'cover', position: 'centre' })
    .composite([{ input: overlay }]);

  const webpPath = `${outputBasePath}.webp`;
  const avifPath = `${outputBasePath}.avif`;

  await fs.mkdir(path.dirname(webpPath), { recursive: true });
  await pipeline.clone().webp({ quality: 82 }).toFile(webpPath);
  await pipeline.clone().avif({ quality: 60 }).toFile(avifPath);

  return {
    webpPath,
    avifPath,
    width: frame.width,
    height: frame.height,
    safe: frame.safe,
  };
}

export async function generateCardRenders({ input, event, outputDir, baseName }) {
  const portraitBase = path.join(outputDir, `${baseName}-portrait`);
  const squareBase = path.join(outputDir, `${baseName}-square`);

  const portrait = await renderCard(input, CARD_FRAMES.portrait, event, portraitBase);
  const square = await renderCard(input, CARD_FRAMES.square, event, squareBase);

  return {
    portrait,
    square,
    frame: {
      portrait: CARD_FRAMES.portrait,
      square: CARD_FRAMES.square,
    },
  };
}
