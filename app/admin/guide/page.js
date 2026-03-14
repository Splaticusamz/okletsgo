import Link from 'next/link';

export default function GuideOverview() {
  return (
    <>
      <h1>Admin Guide</h1>
      <p>
        OK LET&apos;S GO is a weekly events platform for the Okanagan. The admin backend handles the full lifecycle
        of an event: discovering it, reviewing it, publishing it to the homepage, and optionally sending it out
        as a newsletter.
      </p>

      <h2>How It Works (30-Second Version)</h2>
      <div className="flow">
        <span className="flow-step">🔍 Sources</span>
        <span className="flow-arrow">→</span>
        <span className="flow-step">🎯 Candidates</span>
        <span className="flow-arrow">→</span>
        <span className="flow-step">✅ Approve</span>
        <span className="flow-arrow">→</span>
        <span className="flow-step">🚀 Publish</span>
        <span className="flow-arrow">→</span>
        <span className="flow-step">📰 Newsletter</span>
      </div>
      <ol>
        <li><strong>Sources</strong> scrape event listings from configured websites and return raw candidates.</li>
        <li><strong>Candidates</strong> land in a review queue where you approve, reject, or defer each one.</li>
        <li>Events need <strong>two approvals</strong> (approved ✓ then approved ✓✓) before they&apos;re eligible to publish.</li>
        <li><strong>Publishing</strong> creates a batch and pushes approved events to the live homepage.</li>
        <li><strong>Newsletter</strong> generates a Beehiiv-formatted draft from the published week for email distribution.</li>
      </ol>
      <p>You can also add events by hand (Manual Entry) and manage images/videos (Assets) along the way.</p>

      <h2>Admin Sections</h2>
      <ul>
        <li><Link href="/admin/guide/pipeline">Event Pipeline</Link> — the full flow from raw data to live page</li>
        <li><Link href="/admin/guide/sources">Sources & Scrapers</Link> — configuring and running scrapers</li>
        <li><Link href="/admin/guide/candidates">Reviewing Candidates</Link> — the approval workflow</li>
        <li><Link href="/admin/guide/manual">Manual Entry</Link> — adding events by hand</li>
        <li><Link href="/admin/guide/publishing">Publishing</Link> — batching and going live</li>
        <li><Link href="/admin/guide/assets">Assets</Link> — images and video management</li>
        <li><Link href="/admin/guide/newsletter">Newsletter</Link> — generating and sending the weekly email</li>
        <li><Link href="/admin/guide/archives">Archives</Link> — browsing and reusing past weeks</li>
      </ul>

      <h2>Authentication</h2>
      <p>
        All admin routes are protected by a password set via the <code>ADMIN_PASSWORD</code> environment variable.
        When you log in at <code>/admin/login</code>, a signed cookie is set that lasts 7 days. No user accounts —
        just one shared password for the admin team.
      </p>
      <div className="tip">
        <strong>💡 Tip:</strong> If you see &quot;ADMIN_PASSWORD not configured&quot; on the login page, the env var
        hasn&apos;t been set in Vercel yet. Add it under Project Settings → Environment Variables.
      </div>

      <Link href="/admin/guide/pipeline" className="next-link">
        Next: Event Pipeline →
      </Link>
    </>
  );
}
