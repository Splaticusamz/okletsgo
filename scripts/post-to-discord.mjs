#!/usr/bin/env node
/**
 * Post scraped events to Discord #candidates channel.
 * Reads from tmp/scraped-events.json, posts each as a message.
 * Run after scrape.mjs --discord
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const eventsPath = path.join(__dirname, '..', 'tmp', 'scraped-events.json');
const data = JSON.parse(fs.readFileSync(eventsPath, 'utf-8'));
const events = data.events;

console.log(`📤 ${events.length} events to post`);

// Format each event
for (let i = 0; i < events.length; i++) {
  const e = events[i];
  const parts = [];
  if (e.date) parts.push(`📅 ${e.date}`);
  if (e.venue) parts.push(`📍 ${e.venue}`);
  parts.push(`🏙️ ${e.city || 'Kelowna'}`);
  const meta = parts.join(' · ');
  
  let desc = (e.description || '').slice(0, 180);
  if ((e.description || '').length > 180) desc += '…';
  
  const urlLine = e.url ? `\n<${e.url}>` : '';
  const emoji = e.emoji || '☀️';
  
  const msg = `${emoji} **${e.title}**\n${meta}\n${desc}\n_via ${e.source}_${urlLine}`;
  
  console.log(`  ${i + 1}/${events.length}: ${e.title.slice(0, 50)}`);
  
  // The actual Discord posting would be done by the OpenClaw message tool
  // This script outputs the messages for manual/tool posting
  events[i]._discordMessage = msg;
}

// Save with messages
fs.writeFileSync(
  path.join(__dirname, '..', 'tmp', 'events-with-messages.json'),
  JSON.stringify(events, null, 2)
);

console.log(`\n✓ Messages prepared in tmp/events-with-messages.json`);
