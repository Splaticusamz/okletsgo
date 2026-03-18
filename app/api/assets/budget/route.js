import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getAdminCookieName, verifyAdminSessionValue } from '../../../../lib/admin-auth.js';
import { getBudgetStatus, getEstimatedCost } from '../../../../lib/fal-budget.js';

export const dynamic = 'force-dynamic';

async function isAuthorized() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAdminCookieName())?.value;
  return await verifyAdminSessionValue(token);
}

export async function GET() {
  try {
    if (!await isAuthorized()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const status = getBudgetStatus();
    const costs = {
      'generate-image': getEstimatedCost('fal-ai/flux/schnell'),
      'upscale': getEstimatedCost('fal-ai/clarity-upscaler'),
      'animate': getEstimatedCost('fal-ai/kling-video/v2/master/image-to-video'),
    };
    return NextResponse.json({ ...status, costs });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
