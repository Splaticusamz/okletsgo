import { createFalClient } from '@fal-ai/client';

let _client = null;

function getClient() {
  if (!_client) {
    const key = process.env.FAL_KEY;
    if (!key) throw new Error('FAL_KEY is not configured');
    _client = createFalClient({ credentials: key });
  }
  return _client;
}

/**
 * Generate a short video from an image using fal.ai's image-to-video model.
 *
 * @param {string} imageUrl - Public URL of the source image
 * @param {object} options
 * @param {string} options.prompt - Motion prompt describing the desired animation
 * @param {number} options.duration - Duration in seconds (default: 4)
 * @returns {Promise<{videoUrl: string, provider: string}>}
 */
export async function generateVideoFromImage(imageUrl, options = {}) {
  const fal = getClient();
  const prompt = options.prompt || 'Subtle cinematic camera movement with gentle parallax effect';

  // Use kling for image-to-video (high quality, supports image input)
  const result = await fal.subscribe('fal-ai/kling-video/v2/master/image-to-video', {
    input: {
      prompt,
      image_url: imageUrl,
      duration: String(options.duration ?? 5),
      aspect_ratio: '9:16', // portrait for mobile cards
    },
    logs: false,
  });

  const videoUrl = result?.data?.video?.url;
  if (!videoUrl) throw new Error('fal.ai did not return a video URL');

  return {
    videoUrl,
    provider: 'fal-ai/kling-v2-master',
    requestId: result?.requestId ?? null,
  };
}

/**
 * Generate a still image using fal.ai
 */
export async function generateImage(prompt, options = {}) {
  const fal = getClient();

  const result = await fal.subscribe('fal-ai/flux/schnell', {
    input: {
      prompt,
      image_size: options.size ?? 'portrait_16_9',
      num_images: 1,
    },
    logs: false,
  });

  const imageUrl = result?.data?.images?.[0]?.url;
  if (!imageUrl) throw new Error('fal.ai did not return an image URL');

  return {
    imageUrl,
    provider: 'fal-ai/flux-schnell',
    requestId: result?.requestId ?? null,
  };
}

/**
 * Submit an animation job (async, returns immediately with requestId).
 */
export async function submitAnimation(imageUrl, options = {}) {
  const fal = getClient();
  const prompt = options.prompt || 'Subtle cinematic camera movement with gentle parallax effect';

  const { request_id } = await fal.queue.submit('fal-ai/kling-video/v2/master/image-to-video', {
    input: {
      prompt,
      image_url: imageUrl,
      duration: String(options.duration ?? 5),
      aspect_ratio: '9:16',
    },
  });

  return { requestId: request_id };
}

/**
 * Poll an animation job status.
 */
export async function pollAnimation(requestId) {
  const fal = getClient();

  const status = await fal.queue.status('fal-ai/kling-video/v2/master/image-to-video', {
    requestId,
    logs: false,
  });

  if (status.status === 'COMPLETED') {
    const result = await fal.queue.result('fal-ai/kling-video/v2/master/image-to-video', { requestId });
    const videoUrl = result?.data?.video?.url;
    return { status: 'completed', videoUrl };
  }

  if (status.status === 'FAILED') {
    return { status: 'failed', error: status.error || 'Generation failed' };
  }

  // IN_QUEUE or IN_PROGRESS
  return { status: 'processing', queuePosition: status.queue_position };
}

export function isFalConfigured() {
  return Boolean(process.env.FAL_KEY);
}
