function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

const SOURCE_TRUST_WEIGHTS = {
  'city-of-kelowna': 20,
  tourismkelowna: 18,
  'eventbrite-kelowna': 14,
  kelownanow: 12,
  'castanet-kelowna': 11,
  'okanagan-life': 11,
  eveningout: 10,
  manual: 18,
  seed: 8,
  unknown: 6,
};

export function getSourceTrustWeight(sourceId) {
  return SOURCE_TRUST_WEIGHTS[sourceId] ?? SOURCE_TRUST_WEIGHTS.unknown;
}

export function scoreCandidateEvent(event = {}, source = null) {
  let score = 0;
  const reasons = [];
  const title = clean(event.title);
  const description = clean(event.description);
  const sourceId = event.sourceId || source?.id || 'unknown';

  if (title.length >= 12) {
    score += 22;
    reasons.push('Clear title');
  } else if (title.length >= 6) {
    score += 14;
    reasons.push('Usable title');
  } else if (title) {
    score += 6;
    reasons.push('Short title');
  } else {
    reasons.push('Missing title detail');
  }

  if (event.date) {
    score += 20;
    reasons.push('Date present');
  } else {
    reasons.push('Missing date');
  }

  if (event.startTime) {
    score += 8;
    reasons.push('Start time present');
  }

  if (clean(event.venue).length >= 3) {
    score += 15;
    reasons.push('Venue present');
  } else {
    reasons.push('Venue unclear');
  }

  if (clean(event.city).length >= 2) {
    score += 5;
    reasons.push('City present');
  }

  if (description.length >= 160) {
    score += 12;
    reasons.push('Rich description');
  } else if (description.length >= 60) {
    score += 8;
    reasons.push('Useful description');
  } else if (description.length >= 20) {
    score += 4;
    reasons.push('Short description');
  } else {
    reasons.push('Thin description');
  }

  if (event.sourceUrl) {
    score += 4;
    reasons.push('Source URL captured');
  }

  if (event.externalId) {
    score += 2;
    reasons.push('External ID captured');
  }

  const trustWeight = getSourceTrustWeight(sourceId);
  score += trustWeight;
  reasons.push(`Source trust +${trustWeight}`);

  return {
    confidenceScore: Math.max(0, Math.min(100, score)),
    confidenceReasons: reasons,
  };
}

export default { scoreCandidateEvent, getSourceTrustWeight };
