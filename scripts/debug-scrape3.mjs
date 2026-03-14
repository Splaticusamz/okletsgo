#!/usr/bin/env node
/**
 * Intercept XHR/fetch requests to find event API endpoints.
 */
import puppeteer from 'puppeteer-core';

const urls = {
  tourismkelowna: 'https://www.tourismkelowna.com/events/calendar/',
  castanet: 'https://www.castanet.net/events/Kelowna/upcoming',
  eventbrite: 'https://www.eventbrite.ca/d/canada--kelowna/events/',
};

const target = process.argv[2] || 'tourismkelowna';
const url = urls[target];

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/chromium-browser',
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});

const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

// Intercept ALL network requests
const apiCalls = [];
await page.setRequestInterception(true);
page.on('request', req => {
  const u = req.url();
  // Log XHR/fetch that might be event APIs
  if (req.resourceType() === 'xhr' || req.resourceType() === 'fetch') {
    apiCalls.push({ url: u, method: req.method(), type: req.resourceType() });
  }
  req.continue();
});

page.on('response', async res => {
  const u = res.url();
  const ct = res.headers()['content-type'] || '';
  if ((ct.includes('json') || u.includes('event') || u.includes('calendar')) && !u.includes('google') && !u.includes('doubleclick') && !u.includes('facebook') && !u.includes('analytics')) {
    try {
      const body = await res.text();
      if (body.length > 100 && body.length < 100000) {
        console.log(`\n📡 ${res.status()} ${u.slice(0, 120)}`);
        console.log(`   Content-Type: ${ct}`);
        console.log(`   Body (first 500): ${body.slice(0, 500)}`);
      }
    } catch {}
  }
});

console.log(`Loading ${url}...`);
await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise(r => setTimeout(r, 5000));

console.log(`\n\n=== All XHR/Fetch calls (${apiCalls.length}) ===`);
for (const c of apiCalls) {
  if (!c.url.includes('google') && !c.url.includes('doubleclick') && !c.url.includes('facebook') && !c.url.includes('analytics') && !c.url.includes('sentry') && !c.url.includes('livechat')) {
    console.log(`${c.method} ${c.url.slice(0, 150)}`);
  }
}

await browser.close();
