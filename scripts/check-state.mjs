
import { getSQL } from "../lib/pg.js";
async function main() {
  const sql = getSQL();
  const rows = await sql`SELECT value FROM kv WHERE key = 'db'`;
  const db = rows[0].value;
  
  console.log("Events count:", db.events?.length);
  console.log("Candidates:", db.events?.filter(e => e.status === 'candidate').length);
  console.log("Approved_1:", db.events?.filter(e => e.status === 'approved_1').length);
  console.log("Approved_2:", db.events?.filter(e => e.status === 'approved_2').length);
  console.log("Published:", db.events?.filter(e => e.status === 'published').length);
  console.log("Rejected:", db.events?.filter(e => e.status === 'rejected').length);
  
  console.log("\nPLACED EVENTS:");
  for (const e of db.events) {
    if (e.calendarDay && e.calendarMode) {
      console.log(e.calendarDay + " " + e.calendarMode + " | " + e.title.slice(0,45) + " | " + e.status);
    }
  }
  
  console.log("\nBATCHES:");
  for (const b of db.publishBatches || []) {
    console.log(b.id + " | " + b.status + " | " + (b.eventIds?.length || 0) + " events");
  }
  
  console.log("\nSETTINGS demoMode:", db.settings?.demoMode);
}
main();
