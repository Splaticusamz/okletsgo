/**
 * Back-compat shim.
 * App code should import from lib/db.js.
 */
export {
  db,
  createDb,
  FileDbAdapter,
  seedFromCurrentWeek,
  getEvents,
  getEvent,
  createEvent,
  createEvents,
  updateEvent,
  addReview,
} from './db.js';
