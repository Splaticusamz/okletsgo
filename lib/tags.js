function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function moneySignals(raw = {}, text = '') {
  const candidates = [
    raw.price,
    raw.priceText,
    raw.cost,
    raw.costText,
    raw.offers?.price,
    raw.offers?.priceCurrency && raw.offers?.price != null ? `${raw.offers.priceCurrency} ${raw.offers.price}` : '',
    text,
  ].filter(Boolean).map((value) => clean(value).toLowerCase());

  if (candidates.some((value) => /(free|no cover|complimentary|admission free|free admission|free entry)/.test(value))) {
    return 'free';
  }
  if (candidates.some((value) => /(\$|cad|usd|ticket|tickets|admission|cover|paid|price|cost|fee|from \d+)/.test(value))) {
    return 'paid';
  }
  return null;
}

export function inferEventTags(raw = {}, normalized = {}) {
  const text = clean([
    normalized.title,
    normalized.description,
    normalized.venue,
    normalized.address,
    raw.summary,
    raw.category,
    raw.tags,
    raw.audience,
    raw.price,
    raw.priceText,
    raw.cost,
    raw.costText,
  ].flat().filter(Boolean).join(' ')).toLowerCase();

  const tags = new Set();

  const startTime = String(normalized.startTime ?? '');
  const startHour = /^\d{2}:\d{2}$/.test(startTime) ? Number(startTime.slice(0, 2)) : null;
  if (normalized.mode === 'night' || startHour >= 17 || /(night|late|after dark|evening|sunset|party|dj|club|cocktail|comedy|bar|brew|wine|concert)/.test(text)) {
    tags.add('night');
  } else {
    tags.add('day');
  }

  if (normalized.mode === 'family' || /(family|kids|children|child-friendly|all ages|storybook|storytime|play|craft|science centre|library|petting zoo)/.test(text)) {
    tags.add('family');
  }
  if (normalized.mode === 'grownup' || /(19\+|18\+|adults? only|grown-?ups?|cocktail|wine|brew|beer|pub|nightclub|club)/.test(text)) {
    tags.add('grown-up');
  }

  const pricing = moneySignals(raw, text);
  if (pricing) tags.add(pricing);

  if (/(park|outdoor|waterfront|beach|farm|garden|trail|lake|festival|plaza|market|patio|mountain|stargazing|bonfire)/.test(text)) {
    tags.add('outdoor');
  }
  if (/(theatre|theater|arena|museum|gallery|library|centre|center|hall|indoor|studio|bistro|restaurant|pub|brewery|winery)/.test(text)) {
    tags.add('indoor');
  }

  return Array.from(tags);
}

export default { inferEventTags };
