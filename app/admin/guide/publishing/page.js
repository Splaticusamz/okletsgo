import Link from 'next/link';

export default function PublishingGuidePage() {
  return (
    <>
      <h1>Publishing</h1>
      <p>
        The <Link href="/admin/publish">Publish page</Link> is where approved events go live on the homepage.
        Publishing works in batches — you generate a batch, review it, and confirm.
      </p>

      <h2>How Batch Publishing Works</h2>
      <ol>
        <li>
          <strong>Generate a draft batch</strong> — click &quot;Generate Draft&quot; and the system collects
          all events currently at <code>approved_2</code> status into a new batch.
        </li>
        <li>
          <strong>Review the batch</strong> — see exactly which events will go live, with their dates, modes, and cities.
        </li>
        <li>
          <strong>Confirm publish</strong> — click &quot;Publish&quot; to push the batch live. The previous batch
          gets marked as <code>superseded</code> and the new one becomes the active published batch.
        </li>
      </ol>

      <h2>Batch Statuses</h2>
      <table className="status-table">
        <thead>
          <tr><th>Status</th><th>Meaning</th></tr>
        </thead>
        <tbody>
          <tr><td><code>draft</code></td><td>Generated but not yet published. You can still add/remove events.</td></tr>
          <tr><td><code>published</code></td><td>Currently live on the homepage.</td></tr>
          <tr><td><code>superseded</code></td><td>Was live, but a newer batch replaced it.</td></tr>
          <tr><td><code>rolled_back</code></td><td>Was published but manually rolled back.</td></tr>
        </tbody>
      </table>

      <h2>Rolling Back</h2>
      <p>
        Made a mistake? Click <strong>&quot;Rollback&quot;</strong> on a published batch. The batch goes to
        <code>rolled_back</code> status and its events return to <code>approved_2</code> so you can fix and re-publish.
      </p>
      <div className="warn">
        <strong>⚠️ Note:</strong> Rolling back removes the events from the homepage immediately. The previous
        batch does <em>not</em> automatically restore — you&apos;ll need to publish again.
      </div>

      <h2>Audit Trail</h2>
      <p>
        Every action (generate, publish, rollback) is logged with a timestamp, who did it, and what changed.
        The audit trail shows at the bottom of the Publish page — useful for tracking what went live and when.
      </p>

      <h2>Typical Weekly Workflow</h2>
      <ol>
        <li>Monday/Tuesday: Run scrapers, import candidates, review and approve</li>
        <li>Wednesday: Second approval pass, generate a draft batch</li>
        <li>Thursday: Review the draft batch and publish</li>
        <li>Friday: Generate newsletter from the published batch</li>
      </ol>

      <div className="tip">
        <strong>💡 Tip:</strong> You can generate multiple draft batches if the first one doesn&apos;t look right.
        Only the one you click &quot;Publish&quot; on goes live.
      </div>

      <Link href="/admin/guide/assets" className="next-link">
        Next: Assets →
      </Link>
    </>
  );
}
