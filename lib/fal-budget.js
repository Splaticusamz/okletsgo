/**
 * fal.ai budget tracker — prevents silent credit drain.
 * Tracks estimated spend per session and enforces a hard cap.
 */

// Estimated costs per model (USD)
const MODEL_COSTS = {
  'fal-ai/flux/schnell': 0.025,        // ~$0.025/image
  'fal-ai/flux/dev': 0.025,            // ~$0.025/image  
  'fal-ai/clarity-upscaler': 0.05,     // ~$0.05/upscale
  'fal-ai/kling-video/v2/master/image-to-video': 0.50, // ~$0.50/video
  'fal-ai/wan/v2.2-a14b/image-to-video': 0.40,         // ~$0.40/video
};

// In-memory spend tracker (resets on server restart, but that's fine for Vercel)
let sessionSpend = 0;
let callLog = [];

// Hard budget cap — defaults to $2.00, override with FAL_BUDGET_CAP env var
function getBudgetCap() {
  return parseFloat(process.env.FAL_BUDGET_CAP || '2.00');
}

/**
 * Check if a call is within budget. Returns { allowed, estimatedCost, totalSpent, remaining }.
 */
export function checkBudget(model) {
  const cost = MODEL_COSTS[model] ?? 0.05; // default to $0.05 if unknown
  const cap = getBudgetCap();
  const remaining = cap - sessionSpend;
  return {
    allowed: cost <= remaining,
    estimatedCost: cost,
    totalSpent: sessionSpend,
    remaining,
    cap,
    model,
  };
}

/**
 * Record a completed call.
 */
export function recordSpend(model, actualCost) {
  const cost = actualCost ?? MODEL_COSTS[model] ?? 0.05;
  sessionSpend += cost;
  callLog.push({
    model,
    cost,
    totalAfter: sessionSpend,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Get current budget status.
 */
export function getBudgetStatus() {
  const cap = getBudgetCap();
  return {
    spent: sessionSpend,
    remaining: cap - sessionSpend,
    cap,
    callCount: callLog.length,
    calls: callLog.slice(-20), // last 20
  };
}

/**
 * Get estimated cost for a model.
 */
export function getEstimatedCost(model) {
  return MODEL_COSTS[model] ?? 0.05;
}

export default { checkBudget, recordSpend, getBudgetStatus, getEstimatedCost };
