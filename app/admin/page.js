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

function countEvents(weekData) {
  if (!weekData?.days) return 0;
  let count = 0;
  for (const day of weekData.days) {
    if (day.entries) count += Object.keys(day.entries).length;
  }
  return count;
}

function countAssets(weekData) {
  if (!weekData?.days) return 0;
  let count = 0;
  for (const day of weekData.days) {
    if (day.entries) {
      for (const entry of Object.values(day.entries)) {
        if (entry.video) count++;
      }
    }
  }
  return count;
}

export default function AdminPage() {
  const weekData = loadWeekData();
  const isPublished = weekData?.status === 'published';
  const totalEvents = countEvents(weekData);
  const totalAssets = countAssets(weekData);
  const pendingReview = isPublished ? 0 : totalEvents;
  const publishedEvents = isPublished ? totalEvents : 0;

  const weekLabel = weekData?.weekKey
    ? new Date(weekData.weekKey + 'T12:00:00Z').toLocaleDateString('en-CA', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';

  const updatedAt = weekData?.updatedAt
    ? new Date(weekData.updatedAt).toLocaleString('en-CA', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
        hour12: false,
      }) + ' UTC'
    : null;

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
            <span className="admin-pill">ops dashboard</span>
          </div>
        </header>

        {/* ── Nav ── */}
        <nav className="adash-nav">
          <Link href="/admin" className="adash-nav-link adash-nav-link--active">Dashboard</Link>
          <Link href="/admin/candidates" className="adash-nav-link adash-nav-link--dim">Candidates</Link>
          <Link href="/admin/assets" className="adash-nav-link adash-nav-link--dim">Assets</Link>
          <Link href="/admin/publish" className="adash-nav-link adash-nav-link--dim">Publish</Link>
          <Link href="/tasks" className="adash-nav-link">Tasks</Link>
        </nav>

        {/* ── Current week status ── */}
        <section className="adash-week-card">
          <div className="adash-week-top">
            <div>
              <div className="adash-week-label">Current week</div>
              <div className="adash-week-title">{weekLabel}</div>
              {updatedAt && <div className="adash-week-updated">Updated {updatedAt}</div>}
            </div>
            <span className={`adash-status-badge ${isPublished ? 'adash-status-badge--live' : 'adash-status-badge--seed'}`}>
              {weekData?.status ?? 'unknown'}
            </span>
          </div>
          <div className="adash-week-stats">
            <div className="adash-week-stat">
              <span className="adash-week-stat-val">{totalEvents}</span>
              <span className="adash-week-stat-label">events</span>
            </div>
            <div className="adash-week-stat">
              <span className="adash-week-stat-val">{publishedEvents}</span>
              <span className="adash-week-stat-label">published</span>
            </div>
            <div className="adash-week-stat">
              <span className="adash-week-stat-val">{weekData?.days?.length ?? 0}</span>
              <span className="adash-week-stat-label">days</span>
            </div>
          </div>
        </section>

        {/* ── Quick stats row ── */}
        <div className="adash-stats-row">
          <div className="adash-stat-card">
            <span className="adash-stat-num">{totalEvents}</span>
            <span className="adash-stat-desc">Total events</span>
          </div>
          <div className="adash-stat-card">
            <span className="adash-stat-num">{totalAssets}</span>
            <span className="adash-stat-desc">Total assets</span>
          </div>
          <div className="adash-stat-card adash-stat-card--warn">
            <span className="adash-stat-num">{pendingReview}</span>
            <span className="adash-stat-desc">Pending review</span>
          </div>
          <div className="adash-stat-card">
            <span className="adash-stat-num">{publishedEvents}</span>
            <span className="adash-stat-desc">Published</span>
          </div>
        </div>

        {/* ── Bottom grid: recent activity + actions ── */}
        <div className="adash-bottom-grid">

          {/* Recent activity */}
          <section className="adash-card adash-card--activity">
            <h2 className="adash-card-title">Recent activity</h2>
            <div className="adash-activity-list">
              {[
                { icon: '📅', text: `Week seeded — ${totalEvents} events loaded`, time: updatedAt ?? 'recently' },
                { icon: '🗂', text: 'Admin dashboard shell created', time: 'now' },
                { icon: '🔧', text: 'Task tracking connected', time: 'now' },
              ].map((item, i) => (
                <div key={i} className="adash-activity-item">
                  <span className="adash-activity-icon">{item.icon}</span>
                  <span className="adash-activity-text">{item.text}</span>
                  <span className="adash-activity-time">{item.time}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Quick actions */}
          <section className="adash-card adash-card--actions">
            <h2 className="adash-card-title">Actions</h2>
            <div className="adash-actions-list">
              <Link href="/admin/candidates" className="adash-action-btn adash-action-btn--secondary">
                Review candidates →
              </Link>
              <Link href="/admin/assets" className="adash-action-btn adash-action-btn--secondary">
                Review assets →
              </Link>
              <button className="adash-action-btn adash-action-btn--primary" disabled>
                Publish batch (not wired)
              </button>
            </div>
          </section>

        </div>

      </div>

      <style>{`
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

        /* Nav */
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

        /* Week card */
        .adash-week-card {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 20px 24px;
          margin-bottom: 16px;
        }
        .adash-week-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 20px;
        }
        .adash-week-label {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: .08em;
          color: var(--muted);
          margin-bottom: 4px;
        }
        .adash-week-title {
          font-size: 22px;
          font-weight: 700;
          color: var(--text);
        }
        .adash-week-updated {
          font-size: 12px;
          color: var(--muted);
          margin-top: 4px;
        }
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
        .adash-week-stats {
          display: flex;
          gap: 32px;
          flex-wrap: wrap;
        }
        .adash-week-stat {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .adash-week-stat-val {
          font-size: 28px;
          font-weight: 800;
          color: var(--accent);
          line-height: 1;
        }
        .adash-week-stat-label {
          font-size: 12px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: .06em;
        }

        /* Stats row */
        .adash-stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }
        .adash-stat-card {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px 18px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .adash-stat-card--warn {
          border-color: rgba(245,158,11,.25);
          background: rgba(245,158,11,.04);
        }
        .adash-stat-num {
          font-size: 32px;
          font-weight: 800;
          color: var(--text);
          line-height: 1;
        }
        .adash-stat-desc {
          font-size: 12px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: .06em;
        }

        /* Bottom grid */
        .adash-bottom-grid {
          display: grid;
          grid-template-columns: 1fr 280px;
          gap: 16px;
        }
        .adash-card {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 20px 24px;
        }
        .adash-card-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--text);
          margin: 0 0 16px;
        }

        /* Activity */
        .adash-activity-list { display: flex; flex-direction: column; gap: 10px; }
        .adash-activity-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: rgba(255,255,255,.02);
        }
        .adash-activity-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }
        .adash-activity-text { flex: 1; font-size: 14px; color: var(--text); }
        .adash-activity-time {
          font-size: 12px;
          color: var(--muted);
          white-space: nowrap;
          flex-shrink: 0;
        }

        /* Actions */
        .adash-actions-list { display: flex; flex-direction: column; gap: 10px; }
        .adash-action-btn {
          display: block;
          text-align: center;
          padding: 11px 16px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          border: 1px solid;
          transition: opacity .15s, background .15s;
        }
        .adash-action-btn--primary {
          background: var(--accent);
          border-color: var(--accent);
          color: #080b1a;
        }
        .adash-action-btn--primary:disabled {
          opacity: .4;
          cursor: not-allowed;
        }
        .adash-action-btn--secondary {
          background: transparent;
          border-color: var(--border);
          color: var(--text);
        }
        .adash-action-btn--secondary:hover {
          background: rgba(255,255,255,.06);
          border-color: rgba(255,255,255,.15);
        }

        /* Mobile */
        @media (max-width: 640px) {
          .adash-stats-row {
            grid-template-columns: repeat(2, 1fr);
          }
          .adash-bottom-grid {
            grid-template-columns: 1fr;
          }
          .adash-week-stats { gap: 20px; }
          .adash-brand { font-size: 28px; }
        }
      `}</style>
    </main>
  );
}
