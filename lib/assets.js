import { createOrUpdateAsset, getEvent, getLatestAssetByEventId } from './db.js';

const ASSET_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  READY: 'ready',
  PARTIAL: 'partial',
  FAILED: 'failed',
};

function slug(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'asset';
}



function candidateForEvent(event) {
  const selected = event.selectedImageCandidate ?? event.imageCandidates?.find((item) => item.selected) ?? event.imageCandidates?.[0] ?? null;
  if (selected?.url) {
    return {
      id: selected.id,
      url: selected.url,
      path: null,
    };
  }

  if (event.fallbackImage) {
    return {
      id: null,
      url: null,
      path: path.join(process.cwd(), 'public', String(event.fallbackImage).replace(/^\//, '')),
    };
  }

  return null;
}

export function canGenerateAssetsForEvent(event) {
  return ['approved_1', 'approved_2', 'published'].includes(event?.status);
}

export function ensurePendingAssetRecord(eventId, options = {}) {
  const event = getEvent(eventId);
  if (!event) throw new Error(`Event not found: ${eventId}`);
  if (!canGenerateAssetsForEvent(event)) throw new Error(`Event ${eventId} is not asset-eligible from status ${event.status}`);

  const latest = getLatestAssetByEventId(eventId);
  if (latest && !options.forceNewVersion) return latest;

  return createOrUpdateAsset(eventId, {
    status: ASSET_STATUS.PENDING,
    stillStatus: 'pending',
    animationStatus: options.stillOnly ? 'skipped' : 'pending',
    stillOnly: options.stillOnly ?? false,
    notes: options.forceNewVersion ? 'Regenerated asset version requested' : 'Eligible after approval_1',
    forceNewVersion: options.forceNewVersion ?? false,
  });
}


export async function generateAssetsForEvent(eventId, options = {}) {
  const event = getEvent(eventId);
  if (!event) throw new Error(`Event not found: ${eventId}`);
  if (!canGenerateAssetsForEvent(event)) throw new Error(`Event ${eventId} is not asset-eligible from status ${event.status}`);

  const source = candidateForEvent(event);
  if (!source) throw new Error(`No source image selected. Use the gallery to select or upload an image first.`);

  // Cloud-first: use the selected image URL directly as the asset (no filesystem writes)
  if (source.url && !options.forceLocal) {
    const asset = createOrUpdateAsset(eventId, {
      status: ASSET_STATUS.READY,
      stillStatus: 'ready',
      animationStatus: options.stillOnly ? 'skipped' : 'pending',
      stillOnly: options.stillOnly ?? false,
      error: null,
      notes: 'Using source image directly (cloud mode)',
      forceNewVersion: options.regenerate ?? false,
      sourceImageUrl: source.url,
      sourceImageCandidateId: source.id,
      portraitUrl: source.url,
      squareUrl: source.url,
    });
    return asset;
  }

  // No local fallback — animation is handled separately via /api/assets/animate
  // Just mark still as ready using the source URL
  return createOrUpdateAsset(eventId, {
    status: ASSET_STATUS.READY,
    stillStatus: 'ready',
    animationStatus: 'pending',
    stillOnly: options.stillOnly ?? false,
    error: null,
    notes: 'Source image set. Use Animate button for fal.ai video.',
    forceNewVersion: options.regenerate ?? false,
    sourceImageUrl: source.url ?? null,
    sourceImagePath: source.path ?? null,
    sourceImageCandidateId: source.id,
    portraitUrl: source.url ?? source.path ?? null,
    squareUrl: source.url ?? source.path ?? null,
  });
}

export default {
  ASSET_STATUS,
  canGenerateAssetsForEvent,
  ensurePendingAssetRecord,
  generateAssetsForEvent,
};
