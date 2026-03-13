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

// Flatten days/entries into a publish-staged list
function extractStagedItems(weekData) {
  if (!weekData?.days) return [];
  const items = [];
  for (const day of weekData.days) {
    if (!day.entries) continue;
    for (const [mode, entry] of Object.entries(day.entries)) {
      items.push({
        id: `${day.day.toLowerCase()}-${mode}`,
        title: entry.venue,
        city: entry.city,
        day: day.day,
        mode,
        assetStatus: 'pending',   // pending | ready | failed
        approveStatus: 'staged',  // staged | approved | rejected
      });
    }
  }
  return items;
}

function AssetChip({ status }) {
  const map = {
    pending: { label: 'asset pending', cls: 'pub-chip--warn'    },
    ready:   { label: 'asset ready',   cls: 'pub-chip--ok'      },
    failed:  { label: 'asset failed',  cls: 'pub-chip--danger'  },
  };
  const cfg = map[status] ?? map.pending;
  return <span className={`pub-chip ${cfg.cls}`}>{cfg.label}</span>;
}

function ApproveChip({ status }) {
  const map = {
    staged:   { label: 'staged',   cls: 'pub-chip--staged'   },
    approved: { label: 'approved', cls: 'pub-chip--ok'       },
    rejected: { label: 'rejected', cls: 'pub-chip--danger'   },
  };
  const cfg = map[status] ?? map.staged;
  return <span className={`pub-chip ${cfg.cls}`}>{cfg.label}</span>;
}

export default function PublishPage() {
  const weekData = loadWeekData();
  const items = extractStagedItems(weekData);

  const weekLabel = weekData?.weekKey
    ? new Date(weekData.weekKey + 'T12:00:00Z').toLocaleDateString('en-CA', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';

  const approvedCount = items.filter(i => i.approveStatus === 'approved').length;
  const assetsReady   = items.filter(i => i.assetStatus === 'ready').length;
  const isPublished   = weekData?.status === 'published';

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
            <span className="admin-pill">publish</span>
          </div>
        </header>

        {/* ── Nav ── */}
        <nav className="adash-nav">
          <Link href="/admin"            className="adash-nav-link">Dashboard</Link>
          <Link href="/admin/candidates" className="adash-nav-link adash-nav-link--dim">Candidates</Link>
          <Link href="/admin/assets"     className="adash-nav-link adash-nav-link--dim">Assets</Link>
          <Link href="/admin/publish"    className="adash-nav-link adash-nav-link--active">Publish</Link>
          <Link href="/tasks"            className="adash-nav-link">Tasks</Link>
        </nav>

        {/* ── Ready to publish section ── */}
        <section className="pub-ready-card">
          <div className="pub-ready-top">
            <div>
              <div className="pub-ready-label">Ready to publish</div>
              <div className="pub-ready-title">Week of {weekLabel}</div>
            </div>
            <span className={`adash-status-badge ${isPublished ? 'adash-status-badge--live' : 'adash-status-badge--seed'}`}>
              {isPublished ? 'published' : 'No published batch yet'}
            </span>
          </div>

          <div className="pub-ready-stats">
            <div className="pub-ready-stat">
              <span className="pub-ready-val">{items.length}</span>
              <span className="pub-ready-lbl">total events</span>
            </div>
            <div className="pub-ready-stat">
              <span className="pub-ready-val">{approvedCount}</span>
              <span className="pub-ready-lbl">approved</span>
            </div>
            <div className="pub-ready-stat">
              <span className="pub-ready-val">{assetsReady}</span>
              <span className="pub-ready-lbl">assets ready</span>
            </div>
          </div>

          <button className="pub-publish-btn" disabled>
            Publish batch →
          </button>
          <div className="pub-publish-hint">
            Publish is disabled — wire up after approval workflow is complete.
          </div>
        </section>

        {/* ── Staged items list ── */}
        <section className="pub-staged-section">
          <h2 className="pub-staged-title">
            Staged for publish
            <span className="pub-staged-count">{items.length}</span>
          </h2>

          {items.length === 0 ? (
            <div className="pub-empty">
              <div className="pub-empty-icon">📭</div>
              <div className="pub-empty-text">No items staged yet.</div>
            </div>
          ) : (
            <div className="pub-table">
              <div className="pub-table-header">
                <span>Event</span>
                <span>Day</span>
                <span>Asset</span>
                <span>Status</span>
              </div>
              {items.map((item) => (
                <div key={item.id} className="pub-row">
                  <span className="pub-row-title">{item.title}</span>
                  <span className="pub-row-day">{item.day}</span>
                  <AssetChip status={item.assetStatus} />
                  <ApproveChip status={item.approveStatus} />
                </div>
              ))}
            </div>
          )}
        </section>

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
        .adash-status-badge {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: .06em;
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid;
          white-space: nowrap;
        }
        .adash-status-badge--seed {
          color: #f59e0b;
          border-color: rgba(245,158,11,.3);
          background: rgba(245,158,11,.08);
        }
        .adash-status-badge--live {
          color: var(--accent);
          border-color: rgba(78,205,196,.3);
          background: rgba(78,205,196,.08);
        }

        /* ── Ready to publish card ── */
        .pub-ready-card {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 20px 24px;
          margin-bottom: 20px;
        }
        .pub-ready-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .pub-ready-label {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: .08em;
          color: var(--muted);
          margin-bottom: 4px;
        }
        .pub-ready-title {
          font-size: 20px;
          font-weight: 700;
          color: var(--text);
        }
        .pub-ready-stats {
          display: flex;
          gap: 32px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }
        .pub-ready-stat {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .pub-ready-val {
          font-size: 28px;
          font-weight: 800;
          color: var(--accent);
          line-height: 1;
        }
        .pub-ready-lbl {
          font-size: 12px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: .06em;
        }
        .pub-publish-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 12px 24px;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 700;
          cursor: not-allowed;
          border: 1px solid rgba(78,205,196,.2);
          background: rgba(78,205,196,.06);
          color: rgba(78,205,196,.35);
          opacity: .6;
          margin-bottom: 8px;
        }
        .pub-publish-hint {
          font-size: 12px;
          color: var(--muted);
        }

        /* ── Staged section ── */
        .pub-staged-section {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 20px 24px;
        }
        .pub-staged-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--text);
          margin: 0 0 16px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .pub-staged-count {
          font-size: 13px;
          font-weight: 700;
          color: var(--muted);
          background: rgba(255,255,255,.06);
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 2px 10px;
        }

        /* Empty state */
        .pub-empty {
          text-align: center;
          padding: 40px 24px;
        }
        .pub-empty-icon { font-size: 32px; margin-bottom: 8px; }
        .pub-empty-text { font-size: 14px; color: var(--muted); }

        /* Table */
        .pub-table {
          display: flex;
          flex-direction: column;
          gap: 0;
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
        }
        .pub-table-header {
          display: grid;
          grid-template-columns: 1fr 120px 130px 110px;
          gap: 12px;
          padding: 10px 16px;
          background: rgba(255,255,255,.03);
          border-bottom: 1px solid var(--border);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .07em;
          color: var(--muted);
        }
        .pub-row {
          display: grid;
          grid-template-columns: 1fr 120px 130px 110px;
          gap: 12px;
          padding: 12px 16px;
          align-items: center;
          border-bottom: 1px solid var(--border);
          transition: background .1s;
        }
        .pub-row:last-child { border-bottom: none; }
        .pub-row:hover { background: rgba(255,255,255,.02); }
        .pub-row-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pub-row-day {
          font-size: 12px;
          font-weight: 600;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: .06em;
        }

        /* Chips */
        .pub-chip {
          display: inline-block;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 9px;
          border-radius: 999px;
          border: 1px solid;
          white-space: nowrap;
        }
        .pub-chip--ok {
          color: var(--accent);
          border-color: rgba(78,205,196,.3);
          background: rgba(78,205,196,.08);
        }
        .pub-chip--warn {
          color: #f59e0b;
          border-color: rgba(245,158,11,.3);
          background: rgba(245,158,11,.08);
        }
        .pub-chip--danger {
          color: #f87171;
          border-color: rgba(248,113,113,.3);
          background: rgba(248,113,113,.08);
        }
        .pub-chip--staged {
          color: #94a3b8;
          border-color: rgba(148,163,184,.25);
          background: rgba(148,163,184,.06);
        }

        /* Mobile */
        @media (max-width: 640px) {
          .adash-brand { font-size: 28px; }
          .pub-table-header {
            grid-template-columns: 1fr 80px;
          }
          .pub-table-header span:nth-child(3),
          .pub-table-header span:nth-child(4) { display: none; }
          .pub-row {
            grid-template-columns: 1fr 80px;
          }
          .pub-row > *:nth-child(3),
          .pub-row > *:nth-child(4) { display: none; }
          .pub-ready-stats { gap: 20px; }
        }
      `}</style>
    </main>
  );
}
