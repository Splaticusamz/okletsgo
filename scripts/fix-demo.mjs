
import { getSQL } from "../lib/pg.js";
async function main() {
  const sql = getSQL();
  const rows = await sql`SELECT value FROM kv WHERE key = 'db'`;
  console.log("Settings:", JSON.stringify(rows[0].value.settings));
  console.log("Demo mode:", rows[0].value.settings?.demoMode);
}
main();
