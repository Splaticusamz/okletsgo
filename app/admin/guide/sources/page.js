import Link from 'next/link';

export default function SourcesGuidePage() {
  return (
    <>
      <h1>Sources & Scrapers</h1>
      <p>
        Sources are the entry point for events. Each source is a configured scraper that knows how to pull
        event data from a specific website or API.
      </p>

      <h2>What You See</h2>
      <p>The <Link href="/admin/sources">Sources page</Link> shows:</p>
      <ul>
        <li><strong>Source list</strong> — all configured scrapers with their names and target URLs</li>
        <li><strong>Run results</strong> — the latest scrape output with detailed stats</li>
        <li><strong>Import controls</strong> — buttons to pull scraped events into the candidate queue</li>
      </ul>

      <h2>Running a Scrape</h2>
      <ol>
        <li>Go to <code>/admin/sources</code></li>
        <li>Click <strong>&quot;Run&quot;</strong> next to the source you want to scrape</li>
        <li>The scraper fetches the target URL, normalizes the raw data, and deduplicates results</li>
        <li>Results appear in the panel below with confidence scores for each event</li>
      </ol>

      <h2>Understanding the Stats</h2>
      <p>After a run completes, you&apos;ll see a summary bar with these metrics:</p>
      <table className="status-table">
        <thead>
          <tr><th>Metric</th><th>Meaning</th></tr>
        </thead>
        <tbody>
          <tr><td><code>raw</code></td><td>Total events found in the raw scrape</td></tr>
          <tr><td><code>normalized</code></td><td>Events successfully parsed into standard format</td></tr>
          <tr><td><code>deduped</code></td><td>Unique events after removing duplicates</td></tr>
          <tr><td><code>duplicates</code></td><td>Events that matched existing ones and were skipped</td></tr>
          <tr><td><code>errors</code></td><td>Events that failed to parse</td></tr>
          <tr><td><code>fallbacks</code></td><td>Events where the parser had to guess on some fields</td></tr>
          <tr><td><code>avg confidence</code></td><td>Mean confidence score across all results (0–100)</td></tr>
          <tr><td><code>venues</code></td><td>Unique venue names found</td></tr>
          <tr><td><code>addresses</code></td><td>Events where a street address was successfully parsed</td></tr>
          <tr><td><code>images</code></td><td>Events that have an image candidate attached</td></tr>
        </tbody>
      </table>

      <h2>Importing Results</h2>
      <p>
        After reviewing the scrape results, click <strong>&quot;Import&quot;</strong> to push high-confidence events
        (score ≥ 45) into the candidate queue. Low-confidence results are excluded automatically —
        they usually have missing dates, vague titles, or unparseable venues.
      </p>
      <div className="tip">
        <strong>💡 Tip:</strong> Imported events land as <code>candidate</code> status. They still need to go
        through the approval flow before they appear on the homepage.
      </div>

      <h2>Confidence Scores</h2>
      <p>Each scraped event gets a confidence score from 0–100:</p>
      <ul>
        <li><strong>80+</strong> (green) — high confidence, likely good data</li>
        <li><strong>60–79</strong> (yellow) — mid confidence, worth reviewing closely</li>
        <li><strong>Below 60</strong> (red) — low confidence, probably missing key info</li>
      </ul>

      <Link href="/admin/guide/candidates" className="next-link">
        Next: Reviewing Candidates →
      </Link>
    </>
  );
}
