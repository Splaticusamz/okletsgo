# OK LET'S GO Animation Pipeline

This is the durable process for turning event stills into animated assets and safely rolling them out.

## Goal

Take each event image and convert it into a short looping motion asset with shared creative rules:
- static camera
- candid / documentary feel
- subtle ambient movement only
- no cuts
- loop-friendly timing
- consistent style across all days and modes

## Safety / rollback

Before pipeline work started, a checkpoint was created here:
- branch: `checkpoint/pre-animation-pipeline-2026-03-13`
- tag: `checkpoint-pre-animation-pipeline-2026-03-13`

Rollback command:
```bash
npm run pipeline:rollback
```

## Canonical config

All assets are tracked in:
- `pipeline/event-assets.json`

That file defines:
- source file
- target animated mp4 path
- target gif path
- per-asset prompt
- global defaults for style and negative prompts

## Files

- `pipeline/event-assets.json` — asset manifest + prompts
- `scripts/animate-assets.mjs` — pipeline entrypoint
- `scripts/rollback-checkpoint.sh` — one-command revert
- `images/animated/` — generated animation outputs
- `pipeline/last-run.json` — latest planned/generated manifest

## Commands

Plan jobs and write manifest:
```bash
npm run pipeline:plan
```

Prepare generation batch:
```bash
npm run pipeline:run
```

Swap site references from stills to animated gif targets:
```bash
npm run pipeline:swap
```

Rollback to the safe checkpoint:
```bash
npm run pipeline:rollback
```

## Recommended production workflow

### Phase 1 — Generate
1. Add/replace source images in `images/`
2. Update prompts or paths in `pipeline/event-assets.json`
3. Run:
   ```bash
   npm run pipeline:plan
   npm run pipeline:run
   ```
4. Generate animated outputs for every asset:
   - preferred web output: `.mp4` / `.webm`
   - optional shareable output: `.gif`

### Phase 2 — Review checkpoint
Review a sample set before mass swap:
- Monday day / night / family
- Friday day / night / family
- one family-friendly scene with people
- one nightlife scene with low light

Quality rules:
- static camera preserved
- no weird face morphing
- no hand corruption
- no text artifacts
- no fake zooms or pans
- no heavy cinematic motion
- loop feels natural

### Phase 3 — Swap live assets
After review passes:
```bash
npm run pipeline:swap
npx vercel --prod --yes
```

## Preferred site format

For web performance, prefer:
- primary: MP4/WebM loops on site
- secondary: GIF only when specifically needed for portability

Right now the scaffold swaps to GIF targets because that is the easiest safe first step.
A later upgrade should switch the site rendering layer to video backgrounds for better quality and smaller payloads.

## Provider notes

The current script is scaffolded to be provider-agnostic.
Environment variables to standardize around:
- `ANIMATION_PROVIDER`
- `ANIMATION_API_KEY`

Recommended provider behavior:
- image-to-video from still input
- 3–4 second clips
- stable framing
- prompt + negative prompt support
- deterministic output paths

## Reusable prompt template

Base animation rule set:
```text
Static camera. Candid documentary feel. Natural lighting. Subtle ambient motion only. No cuts. No dramatic zoom. No pan. Preserve original composition. Loop-friendly action. Avoid text artifacts, warped hands, warped faces, or surreal motion.
```

Asset-specific prompts should only describe:
- day / night / family context
- city / venue feel
- human behavior and ambient motion

## Operational rule

Do not replace all live assets blindly.
Always:
1. generate
2. review
3. swap
4. deploy

If results are bad:
```bash
npm run pipeline:rollback
npx vercel --prod --yes
```
