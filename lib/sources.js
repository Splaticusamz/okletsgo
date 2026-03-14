import fs from 'fs';
import path from 'path';

const SOURCES_PATH = path.join(process.cwd(), 'data', 'sources.json');

export function loadSourcesData() {
  try {
    return JSON.parse(fs.readFileSync(SOURCES_PATH, 'utf-8'));
  } catch {
    return { updatedAt: null, sources: [] };
  }
}

export function getSources() {
  return loadSourcesData().sources ?? [];
}

export function getActiveSources() {
  return getSources().filter(source => source.active);
}

export function getSourceById(sourceId) {
  return getSources().find(source => source.id === sourceId) ?? null;
}

export default { loadSourcesData, getSources, getActiveSources, getSourceById };
