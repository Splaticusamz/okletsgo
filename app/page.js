import { getCurrentWeek } from '../lib/data';
import HomepageClient from '../components/HomepageClient';

export default function HomePage() {
  const currentWeek = getCurrentWeek();
  return <HomepageClient currentWeek={currentWeek} />;
}
