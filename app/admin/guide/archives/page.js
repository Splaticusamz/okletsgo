import Link from 'next/link';

export default function ArchivesGuidePage() {
  return (
    <>
      <h1>Archives</h1>
      <p>
        The <Link href="/admin/archives">Archives page</Link> stores past weeks&apos; events after they rotate
        off the homepage. It&apos;s useful for looking back at what was published and for reusing recurring events.
      </p>

      <h2>Browsing Archives</h2>
      <p>
        Archives are organized by week. Select a week to see all the events that were published during that period,
        including their titles, dates, venues, modes, and any tags.
      </p>

      <h2>Reusing Events</h2>
      <p>
        Many Okanagan events are recurring — weekly trivia nights, monthly wine tastings, etc. Instead of
        re-entering them from scratch:
      </p>
      <ol>
        <li>Find the event in a past week&apos;s archive</li>
        <li>Click <strong>&quot;Reuse&quot;</strong> on the event card</li>
        <li>The event is cloned as a new <code>candidate</code> — update the date and details as needed</li>
        <li>Approve and publish as normal</li>
      </ol>

      <div className="tip">
        <strong>💡 Tip:</strong> Reusing is faster than manual entry for recurring events. The clone keeps
        the title, venue, city, mode, and description — you just need to update the date.
      </div>

      <h2>Comparing Weeks</h2>
      <p>
        The archives support week-to-week comparison. Select two weeks to see them side by side —
        useful for spotting events that happened last week but are missing from the current one.
      </p>

      <h2>Data Retention</h2>
      <p>
        Archived weeks are stored indefinitely. They don&apos;t count against any limits and can be
        browsed at any time. The archive is a read-only view of past published batches.
      </p>

      <div style={{ marginTop: 40, padding: '20px 24px', background: '#1e1e2e', border: '1px solid #333', borderRadius: 12 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>🎉 That&apos;s the full guide!</h3>
        <p style={{ margin: '0 0 12px', fontSize: 14, color: '#94a3b8' }}>
          You now know how the entire pipeline works — from scraping sources to publishing events and sending newsletters.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/admin" className="next-link" style={{ margin: 0 }}>← Back to Admin Dashboard</Link>
          <Link href="/admin/guide" className="next-link" style={{ margin: 0 }}>↑ Guide Overview</Link>
        </div>
      </div>
    </>
  );
}
