import Link from 'next/link';

export default function CandidatesGuidePage() {
  return (
    <>
      <h1>Reviewing Candidates</h1>
      <p>
        The <Link href="/admin/candidates">Candidates page</Link> is where you decide which events make it to the
        homepage. Every imported or manually created event starts as a candidate here.
      </p>

      <h2>The Review Queue</h2>
      <p>Each candidate card shows:</p>
      <ul>
        <li><strong>Title</strong> — the event name</li>
        <li><strong>Date & time</strong> — when it happens</li>
        <li><strong>Venue & city</strong> — where it is</li>
        <li><strong>Mode</strong> — day ☀️ or night 🌙</li>
        <li><strong>Source badge</strong> — where it came from (scraper name, <code>manual</code>, or <code>seed</code>)</li>
        <li><strong>Status badge</strong> — current state in the pipeline</li>
      </ul>

      <h2>Actions</h2>
      <table className="status-table">
        <thead>
          <tr><th>Button</th><th>What It Does</th></tr>
        </thead>
        <tbody>
          <tr><td><strong>Approve</strong></td><td>Moves the event forward one approval stage. First click → <code>approved_1</code>. Second click → <code>approved_2</code>.</td></tr>
          <tr><td><strong>Reject</strong></td><td>Marks the event as rejected. It won&apos;t show up in publish batches.</td></tr>
          <tr><td><strong>Defer</strong></td><td>Puts the event on hold. You can come back to it later — maybe for next week.</td></tr>
          <tr><td><strong>Rollback</strong></td><td>Sends the event back one stage (e.g. <code>approved_1</code> → <code>candidate</code>).</td></tr>
        </tbody>
      </table>

      <h2>Filtering</h2>
      <p>Use the filter controls at the top to narrow the list:</p>
      <ul>
        <li><strong>By status</strong> — show only candidates, approved, rejected, etc.</li>
        <li><strong>By mode</strong> — day vs. night events</li>
        <li><strong>By source</strong> — see events from a specific scraper or manual entry</li>
      </ul>

      <h2>Typical Workflow</h2>
      <ol>
        <li>Run a scrape on the <Link href="/admin/guide/sources">Sources</Link> page and import results</li>
        <li>Come to Candidates and scan the new entries</li>
        <li><strong>First pass:</strong> approve events that look correct, reject obvious junk</li>
        <li><strong>Second pass:</strong> approve the <code>approved_1</code> events to move them to <code>approved_2</code></li>
        <li>Head to <Link href="/admin/guide/publishing">Publishing</Link> to push them live</li>
      </ol>

      <div className="tip">
        <strong>💡 Tip:</strong> The two-pass approval is intentional. It gives you a chance to catch errors
        before events go live. You can do both passes yourself or split them between team members.
      </div>

      <div className="warn">
        <strong>⚠️ Note:</strong> Approving an event to <code>approved_1</code> automatically creates a pending
        asset record for it, so the Assets page will show it as needing image/video generation.
      </div>

      <Link href="/admin/guide/manual" className="next-link">
        Next: Manual Entry →
      </Link>
    </>
  );
}
