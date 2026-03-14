import Link from 'next/link';

export default function ManualGuidePage() {
  return (
    <>
      <h1>Manual Entry</h1>
      <p>
        Not every event comes from a scraper. The <Link href="/admin/manual">Manual Entry page</Link> lets you
        add events by hand — useful for tips from friends, one-off happenings, or events on sites the scrapers
        don&apos;t cover.
      </p>

      <h2>Creating an Event</h2>
      <p>Fill out the form with:</p>
      <table className="status-table">
        <thead>
          <tr><th>Field</th><th>Required</th><th>Notes</th></tr>
        </thead>
        <tbody>
          <tr><td><strong>Title</strong></td><td>Yes</td><td>Event name — keep it clear and short</td></tr>
          <tr><td><strong>Date</strong></td><td>Yes</td><td>Format: <code>YYYY-MM-DD</code></td></tr>
          <tr><td><strong>Start time</strong></td><td>No</td><td>e.g. <code>14:00</code> or <code>2:00 PM</code></td></tr>
          <tr><td><strong>End time</strong></td><td>No</td><td>Optional end time</td></tr>
          <tr><td><strong>Venue</strong></td><td>Yes</td><td>Name of the venue</td></tr>
          <tr><td><strong>City</strong></td><td>Yes</td><td>Defaults to <code>Kelowna</code></td></tr>
          <tr><td><strong>Description</strong></td><td>No</td><td>Short blurb about the event</td></tr>
          <tr><td><strong>Mode</strong></td><td>Yes</td><td><code>day</code> or <code>night</code> — determines which homepage view it appears on</td></tr>
        </tbody>
      </table>

      <h2>What Happens Next</h2>
      <p>
        When you submit, the event is created with status <code>candidate</code> and source <code>manual</code>.
        It enters the same pipeline as scraped events — you still need to approve it twice before it can be published.
      </p>

      <div className="tip">
        <strong>💡 Tip:</strong> Manual events show a <code>manual</code> badge on the Candidates page so
        you can tell them apart from scraped ones.
      </div>

      <h2>When to Use Manual vs. Sources</h2>
      <ul>
        <li><strong>Use Sources</strong> when you want to regularly pull events from a website — set it up once, run it weekly</li>
        <li><strong>Use Manual</strong> for one-off events, tips you got from someone, or events you want to feature that aren&apos;t listed online</li>
      </ul>

      <Link href="/admin/guide/publishing" className="next-link">
        Next: Publishing →
      </Link>
    </>
  );
}
