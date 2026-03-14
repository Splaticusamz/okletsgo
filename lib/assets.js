import fs from 'fs/promises';
import path from 'path';
import { spawnSync } from 'child_process';
import { createOrUpdateAsset, getEvent, getLatestAssetByEventId } from './db.js';
import { generateCardRenders } from './image-processor.js';

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

function toPublicUrl(filePath) {
  const publicDir = path.join(process.cwd(), 'public');
  return filePath.startsWith(publicDir)
    ? `/${path.relative(publicDir, filePath).replace(/\\/g, '/')}`
    : filePath;
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

function generateAnimation(stillPath, outputPath) {
  const result = spawnSync('ffmpeg', [
    '-y',
    '-loop', '1',
    '-i', stillPath,
    '-vf', "zoompan=z='min(zoom+0.0008\\,1.08)':d=96:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920,fps=24,format=yuv420p",
    '-t', '4',
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '26',
    '-movflags', '+faststart',
    outputPath,
  ], { encoding: 'utf8' });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'ffmpeg failed');
  }
}

export async function generateAssetsForEvent(eventId, options = {}) {
  const event = getEvent(eventId);
  if (!event) throw new Error(`Event not found: ${eventId}`);
  if (!canGenerateAssetsForEvent(event)) throw new Error(`Event ${eventId} is not asset-eligible from status ${event.status}`);

  const source = candidateForEvent(event);
  if (!source) throw new Error(`Event ${eventId} has no selected image candidate or fallback image`);

  const asset = createOrUpdateAsset(eventId, {
    status: ASSET_STATUS.PROCESSING,
    stillStatus: 'processing',
    animationStatus: options.stillOnly ? 'skipped' : 'processing',
    stillOnly: options.stillOnly ?? false,
    error: null,
    notes: options.regenerate ? 'Manual regenerate requested' : 'Generation started',
    forceNewVersion: options.regenerate ?? false,
    sourceImageUrl: source.url,
    sourceImagePath: source.path,
    sourceImageCandidateId: source.id,
  });

  const baseSlug = slug(event.title || event.id);
  const assetDir = path.join(process.cwd(), 'public', 'assets', event.id);
  await fs.mkdir(assetDir, { recursive: true });

  try {
    const renders = await generateCardRenders({
      input: source.path ?? source.url,
      event,
      outputDir: assetDir,
      baseName: `${baseSlug}-v${asset.version}`,
    });

    const animationOutput = path.join(assetDir, `${baseSlug}-v${asset.version}.mp4`);
    let animationStatus = options.stillOnly ? 'skipped' : 'ready';
    let animationUrl = null;
    let status = ASSET_STATUS.READY;
    let error = null;

    if (!options.stillOnly) {
      try {
        generateAnimation(renders.portrait.webpPath, animationOutput);
        animationUrl = toPublicUrl(animationOutput);
      } catch (animationError) {
        animationStatus = 'failed';
        status = ASSET_STATUS.PARTIAL;
        error = animationError.message;
      }
    }

    return createOrUpdateAsset(eventId, {
      id: asset.id,
      version: asset.version,
      status,
      stillStatus: 'ready',
      animationStatus,
      stillOnly: options.stillOnly ?? false,
      sourceImageUrl: source.url,
      sourceImagePath: source.path,
      sourceImageCandidateId: source.id,
      portraitUrl: toPublicUrl(renders.portrait.webpPath),
      squareUrl: toPublicUrl(renders.square.webpPath),
      portraitAvifUrl: toPublicUrl(renders.portrait.avifPath),
      squareAvifUrl: toPublicUrl(renders.square.avifPath),
      animationUrl,
      animationPosterUrl: toPublicUrl(renders.portrait.webpPath),
      animationProvider: 'ffmpeg-local',
      frame: renders.frame,
      error,
      notes: status === ASSET_STATUS.PARTIAL ? 'Still assets ready; animation failed, still-only fallback available' : 'Still + animation assets generated locally',
    });
  } catch (error) {
    return createOrUpdateAsset(eventId, {
      id: asset.id,
      version: asset.version,
      status: ASSET_STATUS.FAILED,
      stillStatus: 'failed',
      animationStatus: options.stillOnly ? 'skipped' : 'failed',
      error: error.message,
      notes: 'Asset generation failed',
    });
  }
}

export default {
  ASSET_STATUS,
  canGenerateAssetsForEvent,
  ensurePendingAssetRecord,
  generateAssetsForEvent,
};
