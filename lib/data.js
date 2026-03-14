import fs from 'fs';
import path from 'path';
import currentWeek from '../data/current-week.json';

export function getCurrentWeek() {
  return currentWeek;
}

export function getTasks() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'tasks.json');
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return { updatedAt: null, sections: [], changelog: [] };
  }
}
