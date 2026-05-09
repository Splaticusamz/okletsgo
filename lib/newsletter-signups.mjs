const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeNewsletterEmail(email) {
  const normalized = String(email ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(normalized)) {
    throw new Error('Please enter a valid email address.');
  }
  return normalized;
}

function subscriberId(email) {
  return `sub-${email.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}

export function addNewsletterSubscriber(db, input = {}) {
  db.newsletterSubscribers = Array.isArray(db.newsletterSubscribers) ? db.newsletterSubscribers : [];
  const email = normalizeNewsletterEmail(input.email);
  const now = input.now || new Date().toISOString();
  const existingIndex = db.newsletterSubscribers.findIndex((subscriber) => subscriber.email === email);
  const patch = {
    email,
    source: input.source || 'homepage',
    status: 'active',
    userAgent: input.userAgent || null,
    ip: input.ip || null,
    referrer: input.referrer || null,
    formSubmitForwarded: input.formSubmitForwarded ?? null,
    updatedAt: now,
  };

  if (existingIndex !== -1) {
    db.newsletterSubscribers[existingIndex] = {
      ...db.newsletterSubscribers[existingIndex],
      ...patch,
      signupCount: (db.newsletterSubscribers[existingIndex].signupCount || 1) + 1,
    };
    return db.newsletterSubscribers[existingIndex];
  }

  const subscriber = {
    id: subscriberId(email),
    ...patch,
    signupCount: 1,
    createdAt: now,
  };
  db.newsletterSubscribers.unshift(subscriber);
  return subscriber;
}

export function getNewsletterSubscribers(db) {
  return [...(Array.isArray(db.newsletterSubscribers) ? db.newsletterSubscribers : [])]
    .sort((a, b) => String(b.createdAt || b.updatedAt || '').localeCompare(String(a.createdAt || a.updatedAt || '')));
}
