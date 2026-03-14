import Link from 'next/link';

export default function PipelinePage() {
  return (
    <>
      <h1>Event Pipeline</h1>
      <p>
        Every event flows through a defined state machine. Understanding these states is key to using the admin backend.
      </p>

      <h2>States</h2>
      <table className="status-table">
        <thead>
          <tr><th>Status</th><th>What It Means</th></tr>
        </thead>
        <tbody>
          <tr><td><code>candidate</code></td><td>Freshly imported or manually created. Waiting for first review.</td></tr>
          <tr><td><code>approved_1</code> ✓</td><td>First approval given. Needs a second approval before it can be published.</td></tr>
          <tr><td><code>approved_2</code> ✓✓</td><td>Fully approved. Eligible for the next publish batch.</td></tr>
          <tr><td><code>published</code></td><td>Live on the homepage as part of a publish batch.</td></tr>
          <tr><td><code>rejected</code></td><td>Rejected during review. Won&apos;t appear on the site.</td></tr>
          <tr><td><code>deferred</code></td><td>Put on hold — maybe for a future week. Can be re-approved later.</td></tr>
        </tbody>
      </table>

      <h2>Transitions</h2>
      <p>Actions you can take depend on the current status:</p>
      <table className="status-table">
        <thead>
          <tr><th>From</th><th>Action</th><th>Result</th></tr>
        </thead>
        <tbody>
          <tr><td><code>candidate</code></td><td>Approve</td><td><code>approved_1</code></td></tr>
          <tr><td><code>candidate</code></td><td>Reject</td><td><code>rejected</code></td></tr>
          <tr><td><code>candidate</code></td><td>Defer</td><td><code>deferred</code></td></tr>
          <tr><td><code>approved_1</code></td><td>Approve (2nd)</td><td><code>approved_2</code></td></tr>
          <tr><td><code>approved_1</code></td><td>Reject / Defer</td><td>Rejected or deferred</td></tr>
          <tr><td><code>approved_1</code></td><td>Rollback</td><td>Back to <code>candidate</code></td></tr>
          <tr><td><code>approved_2</code></td><td>Publish (via batch)</td><td><code>published</code></td></tr>
          <tr><td><code>approved_2</code></td><td>Rollback</td><td>Back to <code>approved_1</code></td></tr>
          <tr><td><code>published</code></td><td>Rollback</td><td>Back to <code>approved_2</code></td></tr>
          <tr><td><code>rejected</code></td><td>Rollback</td><td>Back to <code>candidate</code></td></tr>
          <tr><td><code>deferred</code></td><td>Approve</td><td><code>approved_1</code></td></tr>
          <tr><td><code>deferred</code></td><td>Rollback</td><td>Back to <code>candidate</code></td></tr>
        </tbody>
      </table>

      <h2>Why Two Approvals?</h2>
      <p>
        The double-approval gate exists so one person can flag an event as &quot;looks good&quot; and a second person
        (or the same person on a second pass) confirms it before it goes live. This prevents accidental publishes
        of events with bad data, wrong dates, or duplicate entries.
      </p>

      <div className="tip">
        <strong>💡 Tip:</strong> You can rollback from any state. If a published event turns out to be wrong,
        roll it back to <code>approved_2</code> and it&apos;ll drop from the next publish batch.
      </div>

      <h2>Event Modes</h2>
      <p>Every event has a <strong>mode</strong> that determines which homepage view it appears under:</p>
      <ul>
        <li><strong>☀️ day / grownup</strong> — daytime activities (wine tours, tastings, pub crawls)</li>
        <li><strong>🌙 night</strong> — evening events (concerts, live music, bar events)</li>
        <li><strong>👨‍👩‍👧 family</strong> — kid-friendly activities (splash pads, story time, mini golf)</li>
      </ul>
      <p>Users toggle between modes on the homepage to see events that match their vibe.</p>

      <Link href="/admin/guide/sources" className="next-link">
        Next: Sources & Scrapers →
      </Link>
    </>
  );
}
