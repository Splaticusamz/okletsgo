/**
 * Demo mode — serves the original seed images + videos on the homepage.
 * Toggle via admin panel. State stored in DB settings.
 */
import fs from 'fs';
import path from 'path';
import { getSettings } from './db.js';

/**
 * Check if demo mode is active.
 */
export function isDemoMode() {
  try {
    const settings = getSettings();
    return settings?.demoMode === true;
  } catch {
    return false;
  }
}

/**
 * Get the original seed week data with all images and videos.
 */
export function getSeedWeek() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'current-week.json');
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}
