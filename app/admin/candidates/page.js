'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

function StatusBadge({ status }) {
  const map = {
    candidate:  { label: 'candidate',  cls: 'sbadge--candidate' },
    approved_1: { label: 'approved ✓', cls: 'sbadge--approved1' },
    approved_2: { label: 'approved ✓✓', cls: 'sbadge--approved2' },
    rejected:   { label: 'rejected',   cls: 'sbadge--rejected' },
    deferred:   { label: 'deferred',   cls: 'sbadge--deferred' },
    published:  { label: 'published',  cls: 'sbadge--published' },
  };
  const cfg = map[status] ?? { label: status, cls: '' };
  return <span className={`sbadge ${cfg.cls}`}>{cfg.label}</span>;
}

function SourceBadge({ source }) {
  const map = {
    seed:    { label: 'seed',    cls: 'cand-badge--seed' },
    manual:  { label: 'manual',  cls: 'cand-badge--manual' },
    scraper: { label: 'scraper', cls: 'cand-badge--scraper' },
  };
  const config = map[source] ?? map.manual;
  return <span className={`cand-badge ${config.cls}`}>{config.label}</span>;
}

function ModeTag({ mode }) {
  const isDayMode = mode === 'family' || mode === 'grownup';
  return (
    <span className={`cand-mode-tag ${isDayMode ? 'cand-mode-tag--day' : 'cand-mode-tag--night'}`}>
      {isDayMode ? '☀️ day' : '🌙 night'}
    </span>
  );
}

export default function CandidatesPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acting, setActing] = useState({}); // id → true when in-flight

  useEffect(() => {
    fetch('/api/events')
      .then(r => r.json())
      .then(data => {
        setEvents(data.events ?? []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  async function doAction(id, action) {
    // Optimistic update
    setActing(a => ({ ...a, [id]: true }));
    const optimisticStatus = action === 'approve' ? 'approved_1'
      : action === 'reject' ? 'rejected'
      : action === 'defer' ? 'deferred'
      : null;

    if (optimisticStatus) {
      setEvents(prev => prev.map(e => e.id === id ? { ...e, status: optimisticStatus } : e));
    }

    try {
      const res = await fetch(`/api/events/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, stage: 1, notes: '' }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Revert on error
        setEvents(prev => prev.map(e => e.id === id ? { ...e, status: e._prevStatus ?? e.status } : e));
        console.error('Review error:', data.error);
      } else {
        // Confirm server state
        setEvents(prev => prev.map(e => e.id === id ? data.event : e));
      }
    } catch (err) {
      console.error('Network error:', err);
    } finally {
      setActing(a => ({ ...a, [id]: false }));
    }
  }

  const candidates = events; // Show all events on this page

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
            <span className="admin-pill">candidate review</span>
          </div>
        </header>

        {/* ── Nav ── */}
        <nav className="adash-nav">
          <Link href="/admin" className="adash-nav-link">Dashboard</Link>
          <Link href="/admin/candidates" className="adash-nav-link adash-nav-link--active">Candidates</Link>
          <Link href="/admin/assets" className="adash-nav-link adash-nav-link--dim">Assets</Link>
          <Link href="/admin/publish" className="adash-nav-link adash-nav-link--dim">Publish</Link>
          <Link href="/tasks" className="adash-nav-link">Tasks</Link>
        </nav>

        {/* ── Page title row ── */}
        <div className="cand-title-row">
          <div>
            <h1 className="cand-page-title">Candidate Events</h1>
            <div className="cand-page-sub">
              {loading ? 'Loading…' : `${candidates.length} event${candidates.length !== 1 ? 's' : ''}`}
            </div>
          </div>
        </div>

        {/* ── State ── */}
        {loading && (
          <div className="cand-empty">
            <div className="cand-empty-icon">⏳</div>
            <div className="cand-empty-title">Loading events…</div>
          </div>
        )}

        {error && (
          <div className="cand-empty">
            <div className="cand-empty-icon">⚠️</div>
            <div className="cand-empty-title">Error loading events</div>
            <div className="cand-empty-sub">{error}</div>
          </div>
        )}

        {!loading && !error && candidates.length === 0 && (
          <div className="cand-empty">
            <div className="cand-empty-icon">📭</div>
            <div className="cand-empty-title">No candidates yet</div>
            <div className="cand-empty-sub">Add events manually or run the scraper to populate candidates for review.</div>
          </div>
        )}

        {!loading && !error && candidates.length > 0 && (
          <div className="cand-list">
            {candidates.map((c) => {
              const isActing = acting[c.id];
              const isDone = c.status !== 'candidate';
              return (
                <div key={c.id} className={`cand-card ${isDone ? 'cand-card--done' : ''}`}>
                  <div className="cand-card-main">
                    <div className="cand-card-top">
                      <span className="cand-card-day">{c.date}</span>
                      <ModeTag mode={c.mode} />
                      <SourceBadge source={c.source} />
                      <StatusBadge status={c.status} />
                    </div>
                    <div className="cand-card-title">{c.title}</div>
                    <div className="cand-card-venue">{c.city ? `${c.title} · ${c.city}` : c.title}</div>
                  </div>
                  <div className="cand-card-actions">
                    <button
                      className="cand-action cand-action--approve"
                      title="Approve"
                      disabled={isActing || isDone}
                      onClick={() => doAction(c.id, 'approve')}
                    >
                      {isActing ? '…' : '✓ Approve'}
                    </button>
                    <button
                      className="cand-action cand-action--reject"
                      title="Reject"
                      disabled={isActing || isDone}
                      onClick={() => doAction(c.id, 'reject')}
                    >
                      {isActing ? '…' : '✗ Reject'}
                    </button>
                    <button
                      className="cand-action cand-action--defer"
                      title="Defer"
                      disabled={isActing || isDone}
                      onClick={() => doAction(c.id, 'defer')}
                    >
                      {isActing ? '…' : '→ Defer'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
        .adash-nav-link:hover { background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.15); }
        .adash-nav-link--active {
          background: rgba(78,205,196,.12);
          border-color: rgba(78,205,196,.35);
          color: var(--accent);
        }
        .adash-nav-link--dim { color: var(--muted); }

        /* Status badge */
        .sbadge {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .07em;
          padding: 2px 8px;
          border-radius: 999px;
          border: 1px solid;
        }
        .sbadge--candidate  { color: #94a3b8; border-color: rgba(148,163,184,.3); background: rgba(148,163,184,.08); }
        .sbadge--approved1  { color: #4ecdc4; border-color: rgba(78,205,196,.35); background: rgba(78,205,196,.1); }
        .sbadge--approved2  { color: #22d3ee; border-color: rgba(34,211,238,.35); background: rgba(34,211,238,.1); }
        .sbadge--rejected   { color: #f87171; border-color: rgba(248,113,113,.3); background: rgba(248,113,113,.08); }
        .sbadge--deferred   { color: #f59e0b; border-color: rgba(245,158,11,.3); background: rgba(245,158,11,.08); }
        .sbadge--published  { color: #a3e635; border-color: rgba(163,230,53,.3); background: rgba(163,230,53,.08); }

        .cand-title-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 20px;
        }
        .cand-page-title {
          font-size: 22px;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 4px;
        }
        .cand-page-sub { font-size: 13px; color: var(--muted); }

        .cand-empty {
          text-align: center;
          padding: 60px 24px;
          border: 1px dashed rgba(255,255,255,.12);
          border-radius: 16px;
          background: rgba(255,255,255,.01);
        }
        .cand-empty-icon { font-size: 40px; margin-bottom: 12px; }
        .cand-empty-title { font-size: 18px; font-weight: 600; color: var(--text); margin-bottom: 8px; }
        .cand-empty-sub { font-size: 14px; color: var(--muted); max-width: 360px; margin: 0 auto; }

        .cand-list { display: flex; flex-direction: column; gap: 10px; }
        .cand-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 16px 20px;
          transition: border-color .15s, opacity .15s;
        }
        .cand-card:hover { border-color: rgba(255,255,255,.15); }
        .cand-card--done { opacity: .6; }
        .cand-card-main { flex: 1; min-width: 0; }
        .cand-card-top {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
          flex-wrap: wrap;
        }
        .cand-card-day {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .08em;
          color: var(--muted);
        }
        .cand-card-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .cand-card-venue { font-size: 13px; color: var(--muted); }

        .cand-mode-tag {
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 999px;
          border: 1px solid;
        }
        .cand-mode-tag--day { color: #f59e0b; border-color: rgba(245,158,11,.35); background: rgba(245,158,11,.08); }
        .cand-mode-tag--night { color: #a78bfa; border-color: rgba(167,139,250,.35); background: rgba(167,139,250,.08); }

        .cand-badge {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .07em;
          padding: 2px 8px;
          border-radius: 999px;
          border: 1px solid;
        }
        .cand-badge--seed    { color: #60a5fa; border-color: rgba(96,165,250,.3); background: rgba(96,165,250,.08); }
        .cand-badge--manual  { color: #34d399; border-color: rgba(52,211,153,.3); background: rgba(52,211,153,.08); }
        .cand-badge--scraper { color: #f472b6; border-color: rgba(244,114,182,.3); background: rgba(244,114,182,.08); }

        .cand-card-actions { display: flex; gap: 8px; flex-shrink: 0; }
        .cand-action {
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid;
          background: transparent;
          transition: background .15s, opacity .15s;
          white-space: nowrap;
        }
        .cand-action:disabled { opacity: .35; cursor: default; }
        .cand-action--approve { color: #4ecdc4; border-color: rgba(78,205,196,.35); }
        .cand-action--approve:hover:not(:disabled) { background: rgba(78,205,196,.12); }
        .cand-action--reject  { color: #f87171; border-color: rgba(248,113,113,.35); }
        .cand-action--reject:hover:not(:disabled)  { background: rgba(248,113,113,.1); }
        .cand-action--defer   { color: var(--muted); border-color: var(--border); }
        .cand-action--defer:hover:not(:disabled)   { background: rgba(255,255,255,.05); color: var(--text); }

        @media (max-width: 640px) {
          .adash-brand { font-size: 28px; }
          .cand-card { flex-direction: column; align-items: flex-start; }
          .cand-card-actions { width: 100%; }
          .cand-action { flex: 1; text-align: center; }
        }
      `}</style>
    </main>
  );
}
