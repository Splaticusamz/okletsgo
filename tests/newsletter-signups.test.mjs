import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addNewsletterSubscriber, normalizeNewsletterEmail } from '../lib/newsletter-signups.mjs';

function dbWith(subscribers = []) {
  return { newsletterSubscribers: subscribers };
}

test('normalizeNewsletterEmail trims and lowercases valid emails', () => {
  assert.equal(normalizeNewsletterEmail('  Sam@Example.COM  '), 'sam@example.com');
});

test('normalizeNewsletterEmail rejects invalid emails', () => {
  assert.throws(() => normalizeNewsletterEmail('not an email'), /valid email/i);
});

test('addNewsletterSubscriber stores a new subscriber with source metadata', () => {
  const db = dbWith();
  const subscriber = addNewsletterSubscriber(db, {
    email: '  Person@Example.com ',
    source: 'homepage-footer',
    userAgent: 'test-agent',
    ip: '127.0.0.1',
  });

  assert.equal(subscriber.email, 'person@example.com');
  assert.equal(subscriber.source, 'homepage-footer');
  assert.equal(subscriber.status, 'active');
  assert.equal(db.newsletterSubscribers.length, 1);
});

test('addNewsletterSubscriber dedupes existing subscribers by email and updates metadata', () => {
  const db = dbWith([{ id: 'old', email: 'person@example.com', createdAt: '2026-01-01T00:00:00.000Z', status: 'active' }]);
  const subscriber = addNewsletterSubscriber(db, {
    email: 'PERSON@example.com',
    source: 'newsletter-tile',
  });

  assert.equal(db.newsletterSubscribers.length, 1);
  assert.equal(subscriber.id, 'old');
  assert.equal(subscriber.email, 'person@example.com');
  assert.equal(subscriber.source, 'newsletter-tile');
  assert.ok(subscriber.updatedAt);
});
