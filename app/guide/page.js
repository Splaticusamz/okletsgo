import Link from 'next/link';

export const metadata = { title: "Guide — OK LET'S GO" };

const sections = [
  {
    icon: '🏠',
    title: 'Homepage',
    path: '/',
    points: [
      'Weekly event cards for the Okanagan — day, night, and family modes',
      'Tap the mode switcher to flip between grownup 🍷, nightlife 🌙, and family ☀️ views',
      'Cards show venue, time, weather, and video previews when available',
      'Auto-updates each week from the admin pipeline',
    ],
  },
  {
    icon: '📋',
    title: 'Task Board',
    path: '/tasks',
    points: [
      'Public dev progress board — see what\'s done, in-progress, and planned',
      'Grouped by section with a changelog at the top',
    ],
  },
  {
    icon: '🔐',
    title: 'Admin Dashboard',
    path: '/admin',
    points: [
      'Password-protected (set via ADMIN_PASSWORD env var)',
      'Overview cards: total events, sources, assets, and publishing status at a glance',
      'Quick-links to every admin section below',
    ],
  },
  {
    icon: '🔍',
    title: 'Sources',
    path: '/admin/sources',
    points: [
      'Configure scraper sources (URLs, selectors, schedules)',
      'Run scrapers on demand and see results with confidence scores',
      'Import high-confidence events directly into candidates',
      'Stats: raw → normalized → deduped → imported',
    ],
  },
  {
    icon: '🎯',
    title: 'Candidates',
    path: '/admin/candidates',
    points: [
      'Review scraped and imported events before they go live',
      'Approve (single or double ✓✓), reject, or defer each candidate',
      'Filter by status, mode (day/night), and source',
      'Approved candidates flow into the publish pipeline',
    ],
  },
  {
    icon: '✍️',
    title: 'Manual Entry',
    path: '/admin/manual',
    points: [
      'Add events by hand — title, date, time, venue, city, mode',
      'Useful for events that scrapers can\'t catch (tips, one-offs)',
      'Creates a candidate ready for review',
    ],
  },
  {
    icon: '🚀',
    title: 'Publish',
    path: '/admin/publish',
    points: [
      'Batch-publish approved events to the live homepage',
      'Full audit trail — who published what, when',
      'Roll back or supersede previous batches',
    ],
  },
  {
    icon: '🖼️',
    title: 'Assets',
    path: '/admin/assets',
    points: [
      'Manage images and video assets tied to events',
      'See generation status: pending, processing, ready, or failed',
      'Assets auto-attach to their event cards on the homepage',
    ],
  },
  {
    icon: '📰',
    title: 'Newsletter',
    path: '/admin/newsletter',
    points: [
      'Generate a weekly newsletter from the current published events',
      'Preview, approve, and send via configured endpoint',
      'Settings for publication ID, template, audience segment',
    ],
  },
  {
    icon: '📦',
    title: 'Archives',
    path: '/admin/archives',
    points: [
      'Browse past weeks\' events after they rotate off the homepage',
      'Reuse archived events for recurring happenings',
    ],
  },
];

export default function GuidePage() {
  return (
    <main className="guide-shell">
      <div className="guide-wrap">
        <div className="guide-header">
          <div className="guide-brand"><span>OK</span><br />LET&apos;S GO<br />/ GUIDE</div>
          <p className="guide-subtitle">Everything you need to know about the platform — from the public homepage to the full admin pipeline.</p>
        </div>

        <nav className="guide-toc">
          <div className="guide-toc-title">Jump to</div>
          <div className="guide-toc-links">
            {sections.map((s) => (
              <a key={s.title} href={`#${s.title.toLowerCase().replace(/\s+/g, '-')}`} className="guide-toc-link">{s.icon} {s.title}</a>
            ))}
          </div>
        </nav>

        <div className="guide-sections">
          {sections.map((s) => (
            <section key={s.title} id={s.title.toLowerCase().replace(/\s+/g, '-')} className="guide-section">
              <div className="guide-section-head">
                <span className="guide-section-icon">{s.icon}</span>
                <div>
                  <h2>{s.title}</h2>
                  <Link href={s.path} className="guide-section-path">{s.path}</Link>
                </div>
              </div>
              <ul>
                {s.points.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </section>
          ))}
        </div>

        <div className="guide-footer">
          <Link href="/">← Back to homepage</Link>
          <Link href="/admin">→ Admin dashboard</Link>
        </div>
      </div>

      <style>{`
        .guide-shell{min-height:100vh;padding:32px 20px 64px;background:linear-gradient(180deg,#080b1a,#11162f);color:#e2e8f0}
        .guide-wrap{max-width:720px;margin:0 auto}
        .guide-header{margin-bottom:32px}
        .guide-brand{font-size:36px;line-height:.88;font-weight:800;letter-spacing:-.05em;margin-bottom:14px}.guide-brand span{color:#818cf8}
        .guide-subtitle{color:#94a3b8;font-size:15px;line-height:1.5;margin:0}
        .guide-toc{background:#1e1e2e;border:1px solid #333;border-radius:14px;padding:18px 20px;margin-bottom:32px}
        .guide-toc-title{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;margin-bottom:10px}
        .guide-toc-links{display:flex;flex-wrap:wrap;gap:8px}
        .guide-toc-link{font-size:13px;color:#818cf8;text-decoration:none;padding:4px 10px;border-radius:8px;background:#262640;transition:background .15s}
        .guide-toc-link:hover{background:#333360}
        .guide-sections{display:flex;flex-direction:column;gap:20px}
        .guide-section{background:#1e1e2e;border:1px solid #333;border-radius:14px;padding:22px 24px}
        .guide-section-head{display:flex;align-items:center;gap:14px;margin-bottom:14px}
        .guide-section-icon{font-size:28px}
        .guide-section h2{font-size:20px;margin:0;font-weight:700;color:#f1f5f9}
        .guide-section-path{font-size:13px;color:#818cf8;text-decoration:none;font-family:monospace}
        .guide-section-path:hover{text-decoration:underline}
        .guide-section ul{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px}
        .guide-section li{font-size:14px;line-height:1.5;color:#cbd5e1}
        .guide-footer{display:flex;justify-content:space-between;margin-top:36px;padding-top:20px;border-top:1px solid #333}
        .guide-footer a{color:#818cf8;text-decoration:none;font-size:14px}.guide-footer a:hover{text-decoration:underline}
        @media(max-width:600px){.guide-section{padding:16px 18px}.guide-brand{font-size:28px}}
      `}</style>
    </main>
  );
}
