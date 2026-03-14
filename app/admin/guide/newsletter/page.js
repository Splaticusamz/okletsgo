import Link from 'next/link';

export default function NewsletterGuidePage() {
  return (
    <>
      <h1>Newsletter</h1>
      <p>
        The <Link href="/admin/newsletter">Newsletter page</Link> lets you generate a weekly email
        from the currently published events and prepare it for sending via Beehiiv.
      </p>

      <h2>Newsletter Workflow</h2>
      <ol>
        <li>
          <strong>Generate draft</strong> — click &quot;Generate&quot; and the system builds a newsletter
          draft from the current week&apos;s published events. The draft includes formatted event listings
          grouped by day and mode.
        </li>
        <li>
          <strong>Review</strong> — preview the generated content on-screen. Check that events, dates,
          and descriptions look correct.
        </li>
        <li>
          <strong>Approve</strong> — mark the draft as approved. This doesn&apos;t send it yet.
        </li>
        <li>
          <strong>Mark ready to send</strong> — final confirmation that moves the draft to <code>ready_to_send</code> status.
        </li>
      </ol>

      <h2>Draft Statuses</h2>
      <table className="status-table">
        <thead>
          <tr><th>Status</th><th>Meaning</th></tr>
        </thead>
        <tbody>
          <tr><td><code>draft</code></td><td>Generated, not yet reviewed</td></tr>
          <tr><td><code>approved</code></td><td>Reviewed and approved, can be marked ready</td></tr>
          <tr><td><code>ready_to_send</code></td><td>Ready for Beehiiv — payload is finalized</td></tr>
        </tbody>
      </table>

      <h2>Beehiiv Integration</h2>
      <p>
        The newsletter is formatted as a Beehiiv-compatible payload. The system generates the JSON structure
        that Beehiiv&apos;s API expects, including the post title, content HTML, and metadata.
      </p>
      <div className="warn">
        <strong>⚠️ Note:</strong> Actual sending to Beehiiv is not wired up yet — the system generates
        the payload and shows it to you, but you&apos;ll need to copy it or wait for the Beehiiv API
        integration to be completed. The endpoint scaffold is in place.
      </div>

      <h2>Settings</h2>
      <p>Configure newsletter behavior under the settings panel:</p>
      <ul>
        <li><strong>Publication ID</strong> — your Beehiiv publication identifier</li>
        <li><strong>Template ID</strong> — which Beehiiv template to use</li>
        <li><strong>Audience segment</strong> — <code>all</code> or a specific segment</li>
        <li><strong>Endpoint path</strong> — the Beehiiv API path (default: <code>/v2/posts</code>)</li>
      </ul>
      <p>
        Settings are saved when you click &quot;Save settings&quot; and persist across sessions.
      </p>

      <div className="tip">
        <strong>💡 Tip:</strong> Generate the newsletter after you&apos;ve published the week&apos;s events.
        The draft pulls from whatever is currently live, so publish first, newsletter second.
      </div>

      <Link href="/admin/guide/archives" className="next-link">
        Next: Archives →
      </Link>
    </>
  );
}
