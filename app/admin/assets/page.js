import fs from 'fs';
import path from 'path';
import Link from 'next/link';

function loadWeekData() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'current-week.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Flatten days/entries into an asset list
function extractAssets(weekData) {
  if (!weekData?.days) return [];
  const assets = [];
  for (const day of weekData.days) {
    if (!day.entries) continue;
    for (const [mode, entry] of Object.entries(day.entries)) {
      // All assets are "pending" since no real assets generated yet
      assets.push({
        id: `${day.day.toLowerCase()}-${mode}`,
        title: entry.venue,
        city: entry.city,
        day: day.day,
        mode,
        animationStatus: 'pending', // pending | ready | failed
        dimensions: '1080 × 1920',
      });
    }
  }
  return assets;
}

function StatusBadge({ status }) {
  const map = {
    pending: { label: 'pending',  cls: 'asset-badge--pending' },
    ready:   { label: 'ready',    cls: 'asset-badge--ready'   },
    failed:  { label: 'failed',   cls: 'asset-badge--failed'  },
  };
  const cfg = map[status] ?? map.pending;
  return <span className={`asset-badge ${cfg.cls}`}>{cfg.label}</span>;
}

function ModeTag({ mode }) {
  const isDayMode = mode === 'family' || mode === 'grownup';
  return (
    <span className={`asset-mode-tag ${isDayMode ? 'asset-mode-tag--day' : 'asset-mode-tag--night'}`}>
      {isDayMode ? '☀️' : '🌙'} {mode}
    </span>
  );
}

export default function AssetsPage() {
  const weekData = loadWeekData();
  const assets = extractAssets(weekData);

  const weekLabel = weekData?.weekKey
    ? new Date(weekData.weekKey + 'T12:00:00Z').toLocaleDateString('en-CA', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';

  const readyCount   = assets.filter(a => a.animationStatus === 'ready').length;
  const pendingCount = assets.filter(a => a.animationStatus === 'pending').length;
  const failedCount  = assets.filter(a => a.animationStatus === 'failed').length;

  return (
    <main className="admin-shell">
      <div className="admin-wrap">

        {/* ── Header ── */}
        <header className="adash-header">
          <div className="adash-brand">
            <span className="adash-brand-ok">OK</span>
            <br />LET&apos;S GO
            <br />/ ADMIN
          </div>
          <div className="adash-header-right">
            <span className="admin-pill">asset review</span>
          </div>
        </header>

        {/* ── Nav ── */}
        <nav className="adash-nav">
          <Link href="/admin"            className="adash-nav-link">Dashboard</Link>
          <Link href="/admin/candidates" className="adash-nav-link adash-nav-link--dim">Candidates</Link>
          <Link href="/admin/assets"     className="adash-nav-link adash-nav-link--active">Assets</Link>
          <Link href="/admin/publish"    className="adash-nav-link adash-nav-link--dim">Publish</Link>
          <Link href="/tasks"            className="adash-nav-link">Tasks</Link>
        </nav>

        {/* ── Page title row ── */}
        <div className="asset-title-row">
          <div>
            <h1 className="asset-page-title">Asset Review</h1>
            <div className="asset-page-sub">
              Week of {weekLabel} · {assets.length} asset{assets.length !== 1 ? 's' : ''}
            </div>
          </div>
          <div className="asset-summary-chips">
            {readyCount   > 0 && <span className="asset-chip asset-chip--ready">{readyCount} ready</span>}
            {pendingCount > 0 && <span className="asset-chip asset-chip--pending">{pendingCount} pending</span>}
            {failedCount  > 0 && <span className="asset-chip asset-chip--failed">{failedCount} failed</span>}
          </div>
        </div>

        {/* ── Asset list or empty state ── */}
        {assets.length === 0 ? (
          <div className="asset-empty">
            <div className="asset-empty-icon">🖼️</div>
            <div className="asset-empty-title">No assets yet</div>
            <div className="asset-empty-sub">
              Assets will appear here once the animation pipeline runs on approved candidates.
            </div>
          </div>
        ) : (
          <div className="asset-grid">
            {assets.map((asset) => (
              <div key={asset.id} className="asset-card">

                {/* Placeholder image area */}
                <div className="asset-thumb">
                  <span className="asset-thumb-label">{asset.dimensions}</span>
                </div>

                {/* Card info */}
                <div className="asset-card-body">
                  <div className="asset-card-top">
                    <span className="asset-card-day">{asset.day}</span>
                    <ModeTag mode={asset.mode} />
                    <StatusBadge status={asset.animationStatus} />
                  </div>
                  <div className="asset-card-title">{asset.title}</div>
                  <div className="asset-card-city">{asset.city}</div>

                  {/* Action buttons */}
                  <div className="asset-card-actions">
                    <button className="asset-action asset-action--approve">✓ Approve</button>
                    <button className="asset-action asset-action--regen">↺ Regenerate</button>
                    <button className="asset-action asset-action--reject">✗ Reject</button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>

      <style>{`
        /* ── Shared admin shell styles ── */
        .adash-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }
        .adash-brand {
          font-size: 36px;
          line-height: .9;
          font-weight: 800;
          letter-spacing: -.05em;
          color: #fff;
        }
        .adash-brand-ok { color: var(--accent); }
        .adash-header-right {
          display: flex;
          align-items: flex-start;
          padding-top: 4px;
        }
        .adash-nav {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-bottom: 24px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 16px;
        }
        .adash-nav-link {
          padding: 7px 14px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text);
          text-decoration: none;
          border: 1px solid var(--border);
          transition: background .15s, border-color .15s;
        }
        .adash-nav-link:hover {
          background: rgba(255,255,255,.06);
          border-color: rgba(255,255,255,.15);
        }
        .adash-nav-link--active {
          background: rgba(78,205,196,.12);
          border-color: rgba(78,205,196,.35);
          color: var(--accent);
        }
        .adash-nav-link--dim { color: var(--muted); }

        /* ── Page title ── */
        .asset-title-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .asset-page-title {
          font-size: 22px;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 4px;
        }
        .asset-page-sub {
          font-size: 13px;
          color: var(--muted);
        }
        .asset-summary-chips {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        .asset-chip {
          font-size: 12px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid;
        }
        .asset-chip--ready {
          color: var(--accent);
          border-color: rgba(78,205,196,.3);
          background: rgba(78,205,196,.08);
        }
        .asset-chip--pending {
          color: #f59e0b;
          border-color: rgba(245,158,11,.3);
          background: rgba(245,158,11,.08);
        }
        .asset-chip--failed {
          color: #f87171;
          border-color: rgba(248,113,113,.3);
          background: rgba(248,113,113,.08);
        }

        /* ── Empty state ── */
        .asset-empty {
          text-align: center;
          padding: 60px 24px;
          border: 1px dashed rgba(255,255,255,.12);
          border-radius: 16px;
          background: rgba(255,255,255,.01);
        }
        .asset-empty-icon { font-size: 40px; margin-bottom: 12px; }
        .asset-empty-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 8px;
        }
        .asset-empty-sub {
          font-size: 14px;
          color: var(--muted);
          max-width: 360px;
          margin: 0 auto;
        }

        /* ── Asset grid ── */
        .asset-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }
        .asset-card {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
          transition: border-color .15s;
        }
        .asset-card:hover {
          border-color: rgba(255,255,255,.15);
        }

        /* Placeholder image */
        .asset-thumb {
          width: 100%;
          aspect-ratio: 9 / 16;
          max-height: 200px;
          background: #1a1f38;
          display: flex;
          align-items: center;
          justify-content: center;
          border-bottom: 1px solid var(--border);
        }
        .asset-thumb-label {
          font-size: 12px;
          color: rgba(255,255,255,.25);
          font-weight: 600;
          letter-spacing: .06em;
        }

        /* Card body */
        .asset-card-body {
          padding: 14px 16px 16px;
        }
        .asset-card-top {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          margin-bottom: 8px;
        }
        .asset-card-day {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .08em;
          color: var(--muted);
        }
        .asset-card-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 3px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .asset-card-city {
          font-size: 12px;
          color: var(--muted);
          margin-bottom: 12px;
        }

        /* Mode tag */
        .asset-mode-tag {
          font-size: 10px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 999px;
          border: 1px solid;
          text-transform: lowercase;
        }
        .asset-mode-tag--day {
          color: #f59e0b;
          border-color: rgba(245,158,11,.35);
          background: rgba(245,158,11,.08);
        }
        .asset-mode-tag--night {
          color: #a78bfa;
          border-color: rgba(167,139,250,.35);
          background: rgba(167,139,250,.08);
        }

        /* Status badge */
        .asset-badge {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .07em;
          padding: 2px 7px;
          border-radius: 999px;
          border: 1px solid;
        }
        .asset-badge--pending {
          color: #f59e0b;
          border-color: rgba(245,158,11,.3);
          background: rgba(245,158,11,.08);
        }
        .asset-badge--ready {
          color: var(--accent);
          border-color: rgba(78,205,196,.3);
          background: rgba(78,205,196,.08);
        }
        .asset-badge--failed {
          color: #f87171;
          border-color: rgba(248,113,113,.3);
          background: rgba(248,113,113,.08);
        }

        /* Action buttons */
        .asset-card-actions {
          display: flex;
          gap: 6px;
        }
        .asset-action {
          flex: 1;
          padding: 7px 6px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid;
          background: transparent;
          transition: background .15s, opacity .15s;
          white-space: nowrap;
          text-align: center;
        }
        .asset-action--approve {
          color: var(--accent);
          border-color: rgba(78,205,196,.35);
        }
        .asset-action--approve:hover {
          background: rgba(78,205,196,.12);
        }
        .asset-action--regen {
          color: #f59e0b;
          border-color: rgba(245,158,11,.35);
        }
        .asset-action--regen:hover {
          background: rgba(245,158,11,.1);
        }
        .asset-action--reject {
          color: #f87171;
          border-color: rgba(248,113,113,.35);
        }
        .asset-action--reject:hover {
          background: rgba(248,113,113,.1);
        }

        /* Mobile */
        @media (max-width: 640px) {
          .adash-brand { font-size: 28px; }
          .asset-grid {
            grid-template-columns: 1fr;
          }
          .asset-thumb {
            max-height: 160px;
          }
        }
      `}</style>
    </main>
  );
}
