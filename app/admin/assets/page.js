'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

function StatusBadge({ status }) {
  const map = {
    candidate:  { label: 'candidate',   cls: 'sbadge--candidate' },
    approved_1: { label: 'approved ✓',  cls: 'sbadge--approved1' },
    approved_2: { label: 'approved ✓✓', cls: 'sbadge--approved2' },
    rejected:   { label: 'rejected',    cls: 'sbadge--rejected' },
    deferred:   { label: 'deferred',    cls: 'sbadge--deferred' },
    published:  { label: 'published',   cls: 'sbadge--published' },
  };
  const cfg = map[status] ?? { label: status, cls: '' };
  return <span className={`sbadge ${cfg.cls}`}>{cfg.label}</span>;
}

function ModeTag({ mode }) {
  const isDayMode = mode === 'family' || mode === 'grownup';
  return (
    <span className={`asset-mode-tag ${isDayMode ? 'asset-mode-tag--day' : 'asset-mode-tag--night'}`}>
      {isDayMode ? '☀️' : '🌙'} {mode}
    </span>
  );
}

function ReviewHistory({ reviews }) {
  const [open, setOpen] = useState(false);
  if (!reviews || reviews.length === 0) return null;

  return (
    <div className="rev-history">
      <button
        className="rev-history-toggle"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="rev-history-icon">{open ? '▾' : '▸'}</span>
        Review history
        <span className="rev-history-count">{reviews.length}</span>
      </button>
      {open && (
        <div className="rev-history-list">
          {[...reviews].reverse().map((r, i) => {
            const ts = r.reviewedAt
              ? new Date(r.reviewedAt).toLocaleString('en-CA', {
                  month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                  timeZone: 'UTC', hour12: false,
                }) + ' UTC'
              : '—';
            return (
              <div key={r.id ?? i} className="rev-history-item">
                <span className={`rev-action-badge rev-action-badge--${r.action}`}>{r.action}</span>
                <span className="rev-by">{r.reviewedBy ?? 'admin'}</span>
                {r.stage != null && <span className="rev-stage">stage {r.stage}</span>}
                <span className="rev-when">{ts}</span>
                {r.notes && <span className="rev-notes">{r.notes}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AssetsPage() {
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acting, setActing] = useState({});
  const [cardError, setCardError] = useState({});

  useEffect(() => {
    fetch('/api/events')
      .then(r => r.json())
      .then(data => {
        setAllEvents(data.events ?? []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Stage 2 — only show events that passed stage 1
  const assets = allEvents.filter(e =>
    e.status === 'approved_1' || e.status === 'approved_2' || e.status === 'rejected'
  );

  async function doAction(id, action) {
    setActing(a => ({ ...a, [id]: action }));
    setCardError(e => ({ ...e, [id]: null }));

    const prev = allEvents.find(e => e.id === id);
    const optimisticStatus = action === 'approve' ? 'approved_2' : 'rejected';
    setAllEvents(evs => evs.map(e => e.id === id ? { ...e, status: optimisticStatus } : e));

    try {
      const res = await fetch(`/api/events/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, stage: 2, notes: '', reviewedBy: 'admin' }),
      });
      const data = await res.json();
      if (res.ok) {
        setAllEvents(evs => evs.map(e => e.id === id ? data.event : e));
      } else {
        setAllEvents(evs => evs.map(e => e.id === id ? prev : e));
        setCardError(e => ({ ...e, [id]: data.error ?? 'Review failed' }));
      }
    } catch (err) {
      setAllEvents(evs => evs.map(e => e.id === id ? prev : e));
      setCardError(e => ({ ...e, [id]: err.message }));
    } finally {
      setActing(a => ({ ...a, [id]: false }));
    }
  }

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
            <form method="POST" action="/api/admin/logout">
              <button type="submit" className="logout-btn">Logout</button>
            </form>
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

        {/* ── Page title ── */}
        <div className="asset-title-row">
          <div>
            <h1 className="asset-page-title">Asset Review</h1>
            <div className="asset-page-sub">
              {loading ? 'Loading…' : `${assets.length} event${assets.length !== 1 ? 's' : ''} awaiting stage 2 review`}
            </div>
          </div>
          {!loading && assets.length > 0 && (
            <div className="asset-summary-chips">
              <span className="asset-chip asset-chip--pending">{assets.filter(a => a.status === 'approved_1').length} pending</span>
              {assets.filter(a => a.status === 'approved_2').length > 0 &&
                <span className="asset-chip asset-chip--ready">{assets.filter(a => a.status === 'approved_2').length} approved</span>}
            </div>
          )}
        </div>

        {loading && (
          <div className="asset-empty">
            <div className="asset-empty-icon">⏳</div>
            <div className="asset-empty-title">Loading…</div>
          </div>
        )}

        {error && (
          <div className="asset-empty">
            <div className="asset-empty-icon">⚠️</div>
            <div className="asset-empty-title">Error loading events</div>
            <div className="asset-empty-sub">{error}</div>
          </div>
        )}

        {!loading && !error && assets.length === 0 && (
          <div className="asset-empty">
            <div className="asset-empty-icon">🖼️</div>
            <div className="asset-empty-title">No assets ready for review</div>
            <div className="asset-empty-sub">
              Assets appear here after passing stage 1 candidate review.
              Go to <Link href="/admin/candidates" style={{color:'var(--accent)'}}>Candidates</Link> first.
            </div>
          </div>
        )}

        {!loading && !error && assets.length > 0 && (
          <div className="asset-grid">
            {assets.map((asset) => {
              const isActing = !!acting[asset.id];
              const actingAction = acting[asset.id];
              const isDone = asset.status === 'approved_2' || asset.status === 'rejected';
              const errMsg = cardError[asset.id];
              return (
                <div key={asset.id} className={`asset-card ${isDone ? 'asset-card--done' : ''}`}>
                  <div className="asset-thumb">
                    <span className="asset-thumb-label">1080 × 1920</span>
                  </div>
                  <div className="asset-card-body">
                    <div className="asset-card-top">
                      <span className="asset-card-day">{asset.date}</span>
                      <ModeTag mode={asset.mode} />
                      <StatusBadge status={asset.status} />
                    </div>
                    <div className="asset-card-title">{asset.title}</div>
                    <div className="asset-card-city">{asset.city}</div>
                    {errMsg && (
                      <div className="asset-card-error">⚠ {errMsg}</div>
                    )}
                    <ReviewHistory reviews={asset.reviews} />
                    <div className="asset-card-actions">
                      <button
                        className={`asset-action asset-action--approve ${actingAction === 'approve' ? 'asset-action--loading' : ''}`}
                        disabled={isActing || isDone}
                        onClick={() => doAction(asset.id, 'approve')}
                      >
                        {actingAction === 'approve' ? '…' : '✓ Approve'}
                      </button>
                      <button
                        className={`asset-action asset-action--reject ${actingAction === 'reject' ? 'asset-action--loading' : ''}`}
                        disabled={isActing || isDone}
                        onClick={() => doAction(asset.id, 'reject')}
                      >
                        {actingAction === 'reject' ? '…' : '✗ Reject'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      <style>{`
        .adash-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
        .adash-brand { font-size: 36px; line-height: .9; font-weight: 800; letter-spacing: -.05em; color: #fff; }
        .adash-brand-ok { color: var(--accent); }
        .adash-header-right { display: flex; align-items: flex-start; padding-top: 4px; }
        .adash-nav {
          display: flex;
          gap: 4px;
          margin-bottom: 24px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 16px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          flex-wrap: wrap;
        }
        .adash-nav::-webkit-scrollbar { display: none; }
        .adash-nav-link {
          padding: 7px 14px; border-radius: 8px; font-size: 14px; font-weight: 500;
          color: var(--text); text-decoration: none; border: 1px solid var(--border);
          transition: background .15s, border-color .15s; white-space: nowrap;
        }
        .adash-nav-link:hover { background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.15); }
        .adash-nav-link--active { background: rgba(78,205,196,.12); border-color: rgba(78,205,196,.35); color: var(--accent); }
        .adash-nav-link--dim { color: var(--muted); }

        .sbadge { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; padding: 2px 8px; border-radius: 999px; border: 1px solid; }
        .sbadge--candidate  { color: #94a3b8; border-color: rgba(148,163,184,.3); background: rgba(148,163,184,.08); }
        .sbadge--approved1  { color: #4ecdc4; border-color: rgba(78,205,196,.35); background: rgba(78,205,196,.1); }
        .sbadge--approved2  { color: #22d3ee; border-color: rgba(34,211,238,.35); background: rgba(34,211,238,.1); }
        .sbadge--rejected   { color: #f87171; border-color: rgba(248,113,113,.3); background: rgba(248,113,113,.08); }
        .sbadge--deferred   { color: #f59e0b; border-color: rgba(245,158,11,.3); background: rgba(245,158,11,.08); }
        .sbadge--published  { color: #a3e635; border-color: rgba(163,230,53,.3); background: rgba(163,230,53,.08); }

        .asset-title-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
        .asset-page-title { font-size: 22px; font-weight: 700; color: var(--text); margin: 0 0 4px; }
        .asset-page-sub { font-size: 13px; color: var(--muted); }
        .asset-summary-chips { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        .asset-chip { font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 999px; border: 1px solid; }
        .asset-chip--ready   { color: var(--accent); border-color: rgba(78,205,196,.3); background: rgba(78,205,196,.08); }
        .asset-chip--pending { color: #f59e0b; border-color: rgba(245,158,11,.3); background: rgba(245,158,11,.08); }

        .asset-empty { text-align: center; padding: 60px 24px; border: 1px dashed rgba(255,255,255,.12); border-radius: 16px; background: rgba(255,255,255,.01); }
        .asset-empty-icon { font-size: 40px; margin-bottom: 12px; }
        .asset-empty-title { font-size: 18px; font-weight: 600; color: var(--text); margin-bottom: 8px; }
        .asset-empty-sub { font-size: 14px; color: var(--muted); max-width: 360px; margin: 0 auto; }

        .asset-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
        .asset-card { background: var(--panel); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; transition: border-color .15s, opacity .15s; }
        .asset-card:hover { border-color: rgba(255,255,255,.15); }
        .asset-card--done { opacity: .6; }

        .asset-thumb { width: 100%; aspect-ratio: 9/16; max-height: 200px; background: #1a1f38; display: flex; align-items: center; justify-content: center; border-bottom: 1px solid var(--border); }
        .asset-thumb-label { font-size: 12px; color: rgba(255,255,255,.25); font-weight: 600; letter-spacing: .06em; }

        .asset-card-body { padding: 14px 16px 16px; }
        .asset-card-top { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
        .asset-card-day { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); }
        .asset-card-title { font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .asset-card-city { font-size: 12px; color: var(--muted); margin-bottom: 12px; }

        .asset-card-error {
          margin-bottom: 8px;
          font-size: 11px;
          color: #f87171;
          background: rgba(248,113,113,.08);
          border: 1px solid rgba(248,113,113,.2);
          border-radius: 6px;
          padding: 4px 8px;
        }

        /* Review history */
        .rev-history { margin-bottom: 10px; }
        .rev-history-toggle {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: none;
          border: none;
          cursor: pointer;
          color: var(--muted);
          font-size: 11px;
          font-weight: 500;
          padding: 2px 0;
          transition: color .15s;
        }
        .rev-history-toggle:hover { color: var(--text); }
        .rev-history-icon { font-size: 9px; }
        .rev-history-count {
          font-size: 9px;
          background: rgba(255,255,255,.08);
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 1px 5px;
          color: var(--muted);
        }
        .rev-history-list {
          margin-top: 5px;
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding-left: 4px;
          border-left: 2px solid rgba(255,255,255,.08);
        }
        .rev-history-item {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 5px;
          padding: 3px 6px;
          font-size: 10px;
          border-radius: 4px;
          background: rgba(255,255,255,.02);
        }
        .rev-action-badge {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .05em;
          padding: 1px 5px;
          border-radius: 3px;
        }
        .rev-action-badge--approve { background: rgba(78,205,196,.15); color: #4ecdc4; }
        .rev-action-badge--reject  { background: rgba(248,113,113,.15); color: #f87171; }
        .rev-action-badge--defer   { background: rgba(245,158,11,.12); color: #f59e0b; }
        .rev-by    { color: var(--text); font-weight: 600; }
        .rev-stage { color: var(--muted); font-style: italic; }
        .rev-when  { color: var(--muted); margin-left: auto; }
        .rev-notes { color: var(--muted); font-style: italic; width: 100%; }

        .asset-mode-tag { font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 999px; border: 1px solid; text-transform: lowercase; }
        .asset-mode-tag--day   { color: #f59e0b; border-color: rgba(245,158,11,.35); background: rgba(245,158,11,.08); }
        .asset-mode-tag--night { color: #a78bfa; border-color: rgba(167,139,250,.35); background: rgba(167,139,250,.08); }

        .asset-card-actions { display: flex; gap: 6px; }
        .asset-action { flex: 1; padding: 8px 6px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid; background: transparent; transition: background .15s; white-space: nowrap; text-align: center; }
        .asset-action:disabled { opacity: .35; cursor: default; }
        .asset-action--loading { opacity: .7; }
        .asset-action--approve { color: var(--accent); border-color: rgba(78,205,196,.35); }
        .asset-action--approve:hover:not(:disabled) { background: rgba(78,205,196,.12); }
        .asset-action--reject  { color: #f87171; border-color: rgba(248,113,113,.35); }
        .asset-action--reject:hover:not(:disabled)  { background: rgba(248,113,113,.1); }

        /* ── Mobile ── */
        @media (max-width: 640px) {
          .adash-brand { font-size: 26px; }
          .adash-nav { flex-wrap: nowrap; }
          .asset-grid { grid-template-columns: 1fr; }
          .asset-thumb { max-height: 160px; }
          .asset-card-title { white-space: normal; }
          .rev-when { margin-left: 0; width: 100%; }
        }
      `}</style>
    </main>
  );
}
