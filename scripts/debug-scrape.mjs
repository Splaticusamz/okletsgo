#!/usr/bin/env node
/**
 * Debug scraper — dumps page HTML and takes screenshots for selector development.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'tmp');
fs.mkdirSync(outDir, { recursive: true });

const urls = {
  tourismkelowna: 'https://www.tourismkelowna.com/events/calendar/',
  castanet: 'https://www.castanet.net/events/Kelowna/upcoming',
  eventbrite: 'https://www.eventbrite.ca/d/canada--kelowna/events/',
};

const target = process.argv[2] || 'tourismkelowna';
const url = urls[target];
if (!url) { console.log(`Unknown: ${target}. Options: ${Object.keys(urls).join(', ')}`); process.exit(1); }

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/chromium-browser',
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});

const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
await page.setViewport({ width: 1280, height: 900 });

console.log(`Loading ${url}...`);
await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise(r => setTimeout(r, 5000));

// Screenshot
const ssPath = path.join(outDir, `${target}.png`);
await page.screenshot({ path: ssPath, fullPage: false });
console.log(`Screenshot: ${ssPath}`);

// Dump interesting selectors
const info = await page.evaluate(() => {
  const results = [];
  // Find all elements that might be event cards
  const all = document.querySelectorAll('[class*="event"], [class*="card"], [class*="listing"], [class*="slide"], article, .search-main-content li, .event_row, tr[onclick]');
  for (const el of [...all].slice(0, 30)) {
    results.push({
      tag: el.tagName,
      classes: el.className?.toString?.()?.slice(0, 100),
      text: el.textContent?.trim()?.slice(0, 150),
      childCount: el.children.length,
    });
  }
  return results;
});

console.log(`\nFound ${info.length} potential card elements:`);
for (const el of info) {
  console.log(`  <${el.tag} class="${el.classes}"> (${el.childCount} children) → ${el.text?.slice(0, 80)}`);
}

// Also dump the raw HTML of the main content area
const mainHtml = await page.evaluate(() => {
  const main = document.querySelector('main, #main, .main-content, #content, .content') || document.body;
  return main.innerHTML.slice(0, 10000);
});
const htmlPath = path.join(outDir, `${target}.html`);
fs.writeFileSync(htmlPath, mainHtml);
console.log(`HTML dump: ${htmlPath}`);

await browser.close();
