function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function asAbsoluteUrl(value, baseUrl) {
  const raw = clean(value);
  if (!raw) return null;
  try {
    return new URL(raw, baseUrl).toString();
  } catch {
    return null;
  }
}

function toArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

function extractImageUrls(raw = {}, source = {}) {
  const urls = [
    raw.image,
    raw.imageUrl,
    raw.thumbnail,
    raw.thumbnailUrl,
    raw.poster,
    ...(toArray(raw.images)),
    ...(toArray(raw.media?.images)),
    ...(toArray(raw.gallery)),
    ...(toArray(raw.raw?.images)),
  ].flatMap((item) => {
    if (!item) return [];
    if (typeof item === 'string') return [item];
    if (typeof item === 'object') return [item.url, item.src, item.contentUrl, item.thumbnailUrl].filter(Boolean);
    return [];
  });

  return Array.from(new Set(urls.map((item) => asAbsoluteUrl(item, raw.url || raw.link || source.url)).filter(Boolean)));
}

export function buildImageCandidates(raw = {}, source = {}, meta = {}) {
  const now = meta.capturedAt || new Date().toISOString();
  const sourceUrl = meta.sourceUrl || raw.url || raw.link || source.url || null;
  return extractImageUrls(raw, source).map((url, index) => ({
    id: `${meta.eventId || source.id || 'img'}-img-${index}`,
    url,
    sourceUrl,
    provenance: raw.imageProvenance || source.id || 'unknown',
    extractorId: meta.extractorId || source.id || 'unknown',
    capturedAt: now,
    rank: index + 1,
  }));
}

export default { buildImageCandidates };
