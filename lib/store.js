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
  getVenues,
  getAssets,
  getAssetsByEventId,
  getLatestAssetByEventId,
  createOrUpdateAsset,
  upsertVenue,
  createEvent,
  createEvents,
  importCandidateEvents,
  updateEvent,
  addReview,
} from './db.js';
