
const { getSQL } = require("./lib/pg.js");
async function main() {
  const sql = getSQL();
  const rows = await sql`SELECT value FROM kv WHERE key = 'db'`;
  const db = rows[0].value;
  
  console.log("=== PUBLISH BATCHES ===");
  for (const b of db.publishBatches || []) {
    console.log("Batch: " + b.name + " | status: " + b.status + " | events: " + (b.eventIds?.length || 0) + " | created: " + b.createdAt);
  }
  
  console.log("\n=== LATEST BATCH EVENTS ===");
  const latest = db.publishBatches?.[db.publishBatches.length - 1];
  if (latest) {
    for (const eid of latest.eventIds || []) {
      const ev = db.events.find(e => e.id === eid);
      if (ev) console.log("  " + ev.calendarDay + " " + ev.calendarMode + ": " + ev.title + " (" + ev.status + ")");
    }
  }
  
  console.log("\n=== EVENTS BY STATUS ===");
  const statusCounts = {};
  for (const e of db.events) {
    statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
  }
  for (const [k, v] of Object.entries(statusCounts)) {
    console.log("  " + k + ": " + v);
  }
  
  console.log("\n=== CALENDAR PLACEMENT ===");
  let placed = 0, unplaced = 0;
  for (const e of db.events) {
    if (e.calendarDay && e.calendarMode) placed++;
    else unplaced++;
  }
  console.log("Placed: " + placed + ", Unplaced: " + unplaced);
  
  console.log("\n=== NEWSLETTER DRAFTS ===");
  console.log("Drafts: " + (db.newsletterDrafts?.length || 0));
}
main();
