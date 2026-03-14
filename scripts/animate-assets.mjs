#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const configPath = path.join(root, 'pipeline', 'event-assets.json');
const dataPaths = [
  path.join(root, 'data', 'current-week.json'),
  path.join(root, 'public', 'data', 'current-week.json'),
];
const generatedDir = path.join(root, 'public', 'images', 'animated');
const manifestPath = path.join(root, 'pipeline', 'last-run.json');
const reviewPath = path.join(root, 'pipeline', 'review-checklist.md');

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const valueOf = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};

const mode = has('--run') ? 'run' : has('--swap') ? 'swap' : has('--review') ? 'review' : 'plan';
const pilotCsv = valueOf('--pilot');
const pilotIds = pilotCsv ? new Set(pilotCsv.split(',').map(s => s.trim()).filter(Boolean)) : null;
const onlyIdsCsv = valueOf('--ids');
const onlyIds = onlyIdsCsv ? new Set(onlyIdsCsv.split(',').map(s => s.trim()).filter(Boolean)) : null;

const cfg = JSON.parse(await fs.readFile(configPath, 'utf8'));
await fs.mkdir(generatedDir, { recursive: true });

function selectAssets(all) {
  return all.filter(asset => {
    if (pilotIds && !pilotIds.has(asset.id)) return false;
    if (onlyIds && !onlyIds.has(asset.id)) return false;
    return true;
  });
}

const assets = selectAssets(cfg.assets);

function buildPrompt(asset) {
  const defaults = cfg.defaults;
  return [
    asset.prompt,
    `Duration ${defaults.durationSeconds}s.`,
    `Loop target ${defaults.loopSeconds}s.`,
    `Camera: ${defaults.camera}.`,
    `Style: ${defaults.style.join(', ')}.`,
    `Avoid: ${defaults.negative.join(', ')}.`
  ].join(' ');
}

async function writeManifest(entries, extra = {}) {
  await fs.writeFile(manifestPath, JSON.stringify({
    createdAt: new Date().toISOString(),
    mode,
    pilot: pilotIds ? [...pilotIds] : null,
    onlyIds: onlyIds ? [...onlyIds] : null,
    ...extra,
    entries
  }, null, 2));
}

function buildProviderConfig() {
  const provider = process.env.ANIMATION_PROVIDER || 'manual';
  return {
    provider,
    apiKey: process.env.ANIMATION_API_KEY || process.env.PIAPI_API_KEY || process.env.FAL_KEY || '',
    callbackUrl: process.env.ANIMATION_CALLBACK_URL || '',
    imageBaseUrl: process.env.ANIMATION_IMAGE_BASE_URL || 'https://okletsgo.vercel.app/'
  };
}

function imageUrlFor(asset, providerCfg) {
  const base = providerCfg.imageBaseUrl.replace(/\/$/, '');
  return `${base}/${asset.src.replace(/^\//, '')}`;
}

function publicPath(assetPath) {
  return path.join(root, 'public', assetPath.replace(/^\//, ''));
}

async function writePlaceholder(asset, entry) {
  const mp4Placeholder = publicPath(asset.target + '.txt');
  const gifPlaceholder = publicPath(asset.gifTarget + '.txt');
  await fs.mkdir(path.dirname(mp4Placeholder), { recursive: true });
  await fs.writeFile(mp4Placeholder, `${asset.id}\n${entry.prompt}\n`);
  await fs.writeFile(gifPlaceholder, `${asset.id}\n${entry.prompt}\n`);
}

async function queuePiApi(asset, providerCfg, prompt) {
  const body = {
    model: process.env.PIAPI_MODEL || 'kling',
    task_type: 'video_generation',
    input: {
      prompt,
      image_url: imageUrlFor(asset, providerCfg),
      duration: cfg.defaults.durationSeconds,
      aspect_ratio: '9:16'
    }
  };

  if (!providerCfg.apiKey) {
    return { status: 'missing-api-key', request: body };
  }

  const res = await fetch('https://api.piapi.ai/api/v1/task', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': providerCfg.apiKey
    },
    body: JSON.stringify(body)
  });

  const text = await res.text();
  return {
    status: res.ok ? 'queued' : 'provider-error',
    httpStatus: res.status,
    responseText: text,
    request: body
  };
}

async function queueFal(asset, providerCfg, prompt) {
  const endpoint = process.env.FAL_IMAGE_TO_VIDEO_URL || 'https://queue.fal.run/fal-ai/wan/v2.2-a14b/image-to-video';
  const body = {
    prompt,
    negative_prompt: cfg.defaults.negative.join(', '),
    image_url: imageUrlFor(asset, providerCfg),
    aspect_ratio: '9:16',
    resolution: '720p',
    video_quality: 'high',
    video_write_mode: 'balanced',
    acceleration: 'regular',
    enable_prompt_expansion: false,
    enable_safety_checker: false,
    enable_output_safety_checker: false,
    frames_per_second: 16,
    num_frames: 81,
    num_interpolated_frames: 1,
    guidance_scale: 3.5,
    guidance_scale_2: 3.5,
    shift: 5,
    interpolator_model: 'film',
    adjust_fps_for_interpolation: true
  };

  if (!providerCfg.apiKey) return { status: 'missing-api-key', request: body };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Key ${providerCfg.apiKey}`
    },
    body: JSON.stringify(body)
  });

  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = null; }
  return {
    status: res.ok ? 'queued' : 'provider-error',
    httpStatus: res.status,
    responseText: text,
    response: parsed,
    request: body,
    endpoint
  };
}

async function queueAsset(asset, providerCfg) {
  const prompt = buildPrompt(asset);
  if (providerCfg.provider === 'manual') {
    const entry = {
      id: asset.id,
      src: asset.src,
      target: asset.target,
      gifTarget: asset.gifTarget,
      prompt,
      provider: providerCfg.provider,
      status: 'pending-provider'
    };
    await writePlaceholder(asset, entry);
    return entry;
  }

  let result;
  if (providerCfg.provider === 'piapi') {
    result = await queuePiApi(asset, providerCfg, prompt);
  } else if (providerCfg.provider === 'fal') {
    result = await queueFal(asset, providerCfg, prompt);
  } else {
    result = { status: 'unknown-provider' };
  }

  return {
    id: asset.id,
    src: asset.src,
    target: asset.target,
    gifTarget: asset.gifTarget,
    prompt,
    provider: providerCfg.provider,
    imageUrl: imageUrlFor(asset, providerCfg),
    ...result
  };
}

async function plan() {
  const entries = assets.map(asset => ({
    id: asset.id,
    src: asset.src,
    target: asset.target,
    gifTarget: asset.gifTarget,
    prompt: buildPrompt(asset)
  }));
  await writeManifest(entries, { totalAssetsSelected: entries.length });
  console.log(`Planned ${entries.length} assets.`);
  console.log(`Manifest: ${path.relative(root, manifestPath)}`);
}

async function run() {
  const providerCfg = buildProviderConfig();
  const entries = [];

  for (const asset of assets) {
    entries.push(await queueAsset(asset, providerCfg));
  }

  await writeManifest(entries, { totalAssetsSelected: entries.length, provider: providerCfg.provider });
  console.log(`Prepared ${entries.length} animation jobs with provider=${providerCfg.provider}.`);
  if (!providerCfg.apiKey && providerCfg.provider !== 'manual') {
    console.log('Provider selected but API key missing. Set ANIMATION_API_KEY (or provider-specific env var).');
  }
}

async function swap() {
  let swaps = 0;

  for (const dataPath of dataPaths) {
    const raw = await fs.readFile(dataPath, 'utf8');
    const data = JSON.parse(raw);

    for (const day of data.days ?? []) {
      for (const entry of Object.values(day.entries ?? {})) {
        const matched = assets.find((asset) => entry.fallbackImage === asset.src);
        if (!matched) continue;
        entry.video = matched.target;
        swaps += 1;
      }
    }

    await fs.writeFile(dataPath, JSON.stringify(data, null, 2) + '\n');
  }

  console.log(`Updated ${swaps} current-week video references across data files.`);
}

async function review() {
  const lines = [
    '# Animation Review Checklist',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    'Review these before swapping live assets:',
    '- static camera preserved',
    '- candid / documentary vibe preserved',
    '- subtle movement only',
    '- no face warping',
    '- no hand corruption',
    '- no text artifacts',
    '- no fake dolly / pan / zoom',
    '- loop feels natural',
    '',
    '## Selected assets',
    ...assets.map(a => `- ${a.id} → ${a.src}`)
  ];
  await fs.writeFile(reviewPath, lines.join('\n'));
  console.log(`Wrote ${path.relative(root, reviewPath)}`);
}

if (mode === 'plan') await plan();
if (mode === 'run') await run();
if (mode === 'swap') await swap();
if (mode === 'review') await review();
