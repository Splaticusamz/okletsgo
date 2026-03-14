/**
 * Serverless-compatible browser instance.
 * Uses @sparticuz/chromium on Vercel, falls back to local Chrome otherwise.
 */
import puppeteer from 'puppeteer-core';

let _browser = null;

export async function getBrowser() {
  if (_browser?.connected) return _browser;

  const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

  if (isVercel) {
    const chromium = await import('@sparticuz/chromium');
    _browser = await puppeteer.launch({
      args: chromium.default.args,
      defaultViewport: chromium.default.defaultViewport,
      executablePath: await chromium.default.executablePath(),
      headless: chromium.default.headless,
    });
  } else {
    // Local development — try common Chrome paths
    const paths = [
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/snap/bin/chromium',
    ];
    const { existsSync } = await import('fs');
    const execPath = paths.find((p) => existsSync(p));
    if (!execPath) throw new Error('No local Chrome found. Install chromium-browser.');

    _browser = await puppeteer.launch({
      executablePath: execPath,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
    });
  }

  return _browser;
}

/**
 * Fetch a page's rendered HTML after JavaScript execution.
 * @param {string} url
 * @param {object} options
 * @param {number} options.waitMs - ms to wait after load (default 3000)
 * @param {string} options.waitForSelector - CSS selector to wait for
 * @param {number} options.timeoutMs - navigation timeout (default 30000)
 * @returns {Promise<string>} rendered HTML
 */
export async function fetchRenderedHtml(url, options = {}) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: options.timeoutMs ?? 30000,
    });

    if (options.waitForSelector) {
      await page.waitForSelector(options.waitForSelector, { timeout: 10000 }).catch(() => {});
    }

    // Extra wait for dynamic content to settle
    if (options.waitMs) {
      await new Promise((r) => setTimeout(r, options.waitMs));
    }

    return await page.content();
  } finally {
    await page.close();
  }
}

/**
 * Extract events from a rendered page using an extraction function.
 * The extractFn runs in the browser context.
 * @param {string} url
 * @param {Function} extractFn - function to run in page context, should return array of event objects
 * @param {object} options - same as fetchRenderedHtml options
 * @returns {Promise<Array>}
 */
export async function scrapeEvents(url, extractFn, options = {}) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: options.timeoutMs ?? 30000,
    });

    if (options.waitForSelector) {
      await page.waitForSelector(options.waitForSelector, { timeout: 10000 }).catch(() => {});
    }

    if (options.waitMs) {
      await new Promise((r) => setTimeout(r, options.waitMs));
    }

    return await page.evaluate(extractFn);
  } finally {
    await page.close();
  }
}

/**
 * Close the browser (call during cleanup).
 */
export async function closeBrowser() {
  if (_browser?.connected) {
    await _browser.close();
    _browser = null;
  }
}
