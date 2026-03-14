#!/usr/bin/env node
import fs from 'fs';
import puppeteer from 'puppeteer-core';

const urls = {
  tourismkelowna: 'https://www.tourismkelowna.com/events/calendar/',
  castanet: 'https://www.castanet.net/events/Kelowna/upcoming',
  eventbrite: 'https://www.eventbrite.ca/d/canada--kelowna/events/',
};

const target = process.argv[2] || 'tourismkelowna';
const url = urls[target];
if (!url) process.exit(1);

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/chromium-browser',
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});

const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise(r => setTimeout(r, 5000));

// Dump all text content with structure
const dump = await page.evaluate(() => {
  // Check for iframes
  const iframes = [...document.querySelectorAll('iframe')].map(f => ({ src: f.src, id: f.id, class: f.className }));
  
  // Get all links that look event-related
  const links = [...document.querySelectorAll('a')].filter(a => {
    const href = a.href || '';
    const text = a.textContent?.trim() || '';
    return (href.includes('event') || text.length > 10) && text.length < 200;
  }).slice(0, 40).map(a => ({
    text: a.textContent?.trim()?.slice(0, 100),
    href: a.href,
    parent: a.parentElement?.className?.slice(0, 80),
  }));

  // Get slide elements (Simpleview pattern)
  const slides = [...document.querySelectorAll('.slide, .collection-item, .item')].slice(0, 20).map(s => ({
    class: s.className?.slice(0, 100),
    html: s.innerHTML?.slice(0, 500),
  }));

  return { iframes, linkCount: links.length, links: links.slice(0, 20), slideCount: slides.length, slides: slides.slice(0, 5) };
});

console.log(JSON.stringify(dump, null, 2));
await browser.close();
