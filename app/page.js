import { getCurrentWeek } from '../lib/data';
import { initDb } from '../lib/db';
import HomepageClient from '../components/HomepageClient';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  await initDb();
  const currentWeek = getCurrentWeek();
  return <HomepageClient currentWeek={currentWeek} />;
}
