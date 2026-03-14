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
  if (source === 'seed') {
    return <span className="cand-badge cand-badge--seed">seed</span>;
  }
  if (source === 'manual') {
    return <span className="cand-badge cand-badge--manual">manual</span>;
  }
  if (String(source).startsWith('scraper:')) {
    return <span className="cand-badge cand-badge--scraper">{source.replace('scraper:', '')}</span>;
  }
  return <span className="cand-badge cand-badge--manual">{source || 'unknown'}</span>;
}

function ModeTag({ mode }) {
  const isNightMode = mode === 'night';
  return (
    <span className={`cand-mode-tag ${isNightMode ? 'cand-mode-tag--night' : 'cand-mode-tag--day'}`}>
      {isNightMode ? '🌙 night' : '☀️ day'}
    </span>
  );
}

function TagsRow({ tags }) {
  if (!Array.isArray(tags) || tags.length === 0) return null;
  return (
    <div className="cand-tags-row">
      {tags.map((tag) => <span key={tag} className="cand-tag-pill">#{tag}</span>)}
    </div>
  );
}

function LinkRow({ sourceUrl, ticketUrl, imageCandidateCount }) {
  if (!sourceUrl && !ticketUrl && !imageCandidateCount) return null;
  return (
    <div className="cand-links-row">
      {sourceUrl && <a href={sourceUrl} target="_blank" rel="noreferrer" className="cand-inline-link">Source ↗</a>}
      {ticketUrl && <a href={ticketUrl} target="_blank" rel="noreferrer" className="cand-inline-link">Tickets ↗</a>}
      <span className="cand-inline-meta">🖼 {imageCandidateCount ?? 0} image candidate{(imageCandidateCount ?? 0) === 1 ? '' : 's'}</span>
    </div>
  );
}

function ConfidenceBadge({ score }) {
  const value = Number.isFinite(score) ? score : null;
  const cls = value == null ? 'conf-badge--unknown' : value >= 80 ? 'conf-badge--strong' : value >= 60 ? 'conf-badge--mid' : 'conf-badge--weak';
  return <span className={`conf-badge ${cls}`}>confidence {value ?? '—'}</span>;
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

export default function CandidatesPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acting, setActing] = useState({});   // id → true when in-flight
  const [cardError, setCardError] = useState({}); // id → error message

  useEffect(() => {
    fetch('/api/events?all=1')
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
    setActing(a => ({ ...a, [id]: action }));
    setCardError(e => ({ ...e, [id]: null }));

    // Optimistic update
    const optimisticStatus = action === 'approve' ? 'approved_1'
      : action === 'reject' ? 'rejected'
      : action === 'defer' ? 'deferred'
      : null;

    const prev = events.find(e => e.id === id);
    if (optimisticStatus) {
      setEvents(evs => evs.map(e => e.id === id ? { ...e, status: optimisticStatus } : e));
    }

    try {
      const res = await fetch(`/api/events/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, stage: 1, notes: '', reviewedBy: 'admin' }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Revert on error
        setEvents(evs => evs.map(e => e.id === id ? prev : e));
        setCardError(e => ({ ...e, [id]: data.error ?? 'Review failed' }));
      } else {
        // Confirm server state (includes updated reviews array)
        setEvents(evs => evs.map(e => e.id === id ? data.event : e));
      }
    } catch (err) {
      setEvents(evs => evs.map(e => e.id === id ? prev : e));
      setCardError(e => ({ ...e, [id]: err.message }));
    } finally {
      setActing(a => ({ ...a, [id]: false }));
    }
  }

  const candidates = events;

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
            <form method="POST" action="/api/admin/logout">
              <button type="submit" className="logout-btn">Logout</button>
            </form>
          </div>
        </header>

        {/* ── Nav ── */}
        <nav className="adash-nav">
          <Link href="/admin"            className="adash-nav-link">Dashboard</Link>
          <Link href="/admin/candidates" className="adash-nav-link adash-nav-link--active">Candidates</Link>
          <Link href="/admin/assets"     className="adash-nav-link adash-nav-link--dim">Assets</Link>
          <Link href="/admin/sources"    className="adash-nav-link adash-nav-link--dim">Sources</Link>
          <Link href="/admin/manual"     className="adash-nav-link adash-nav-link--dim">Manual</Link>
          <Link href="/admin/publish"    className="adash-nav-link adash-nav-link--dim">Publish</Link>
          <Link href="/admin/guide"     className="adash-nav-link adash-nav-link--dim">Guide</Link>
          <Link href="/tasks"            className="adash-nav-link">Tasks</Link>
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

        {/* ── Page-level state ── */}
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
              const isActing = !!acting[c.id];
              const actingAction = acting[c.id];
              const isDone = c.status !== 'candidate';
              const errMsg = cardError[c.id];
              return (
                <div key={c.id} className={`cand-card ${isDone ? 'cand-card--done' : ''}`}>
                  <div className="cand-card-main">
                    <div className="cand-card-top">
                      <span className="cand-card-day">{c.date}</span>
                      <ModeTag mode={c.mode} />
                      <SourceBadge source={c.source} />
                      <ConfidenceBadge score={c.confidenceScore} />
                      <StatusBadge status={c.status} />
                    </div>
                    <div className="cand-card-title">{c.title}</div>
                    <div className="cand-card-venue">{[c.venue, c.city, c.address].filter(Boolean).join(' · ') || c.title}</div>
                    {Array.isArray(c.confidenceReasons) && c.confidenceReasons.length > 0 && (
                      <div className="cand-card-confidence">{c.confidenceReasons.slice(0, 3).join(' • ')}</div>
                    )}
                    <TagsRow tags={c.tags} />
                    <LinkRow sourceUrl={c.sourceUrl} ticketUrl={c.ticketUrl} imageCandidateCount={c.imageCandidateCount} />
                    {errMsg && (
                      <div className="cand-card-error">⚠ {errMsg}</div>
                    )}
                    <ReviewHistory reviews={c.reviews} />
                  </div>
                  <div className="cand-card-actions">
                    <button
                      className={`cand-action cand-action--approve ${actingAction === 'approve' ? 'cand-action--loading' : ''}`}
                      title="Approve"
                      disabled={isActing || isDone}
                      onClick={() => doAction(c.id, 'approve')}
                    >
                      {actingAction === 'approve' ? '…' : '✓ Approve'}
                    </button>
                    <button
                      className={`cand-action cand-action--reject ${actingAction === 'reject' ? 'cand-action--loading' : ''}`}
                      title="Reject"
                      disabled={isActing || isDone}
                      onClick={() => doAction(c.id, 'reject')}
                    >
                      {actingAction === 'reject' ? '…' : '✗ Reject'}
                    </button>
                    <button
                      className={`cand-action cand-action--defer ${actingAction === 'defer' ? 'cand-action--loading' : ''}`}
                      title="Defer"
                      disabled={isActing || isDone}
                      onClick={() => doAction(c.id, 'defer')}
                    >
                      {actingAction === 'defer' ? '…' : '→ Defer'}
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
          padding: 7px 14px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text);
          text-decoration: none;
          border: 1px solid var(--border);
          transition: background .15s, border-color .15s;
          white-space: nowrap;
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
          align-items: flex-start;
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
        .cand-card-confidence { margin-top: 6px; font-size: 12px; color: var(--muted); }
        .cand-tags-row, .cand-links-row { margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        .cand-tag-pill, .cand-inline-meta {
          font-size: 11px;
          padding: 3px 8px;
          border-radius: 999px;
          border: 1px solid var(--border);
          color: var(--muted);
          background: rgba(255,255,255,.03);
        }
        .cand-inline-link {
          font-size: 12px;
          color: var(--accent);
          text-decoration: none;
        }
        .cand-inline-link:hover { text-decoration: underline; }

        .cand-card-error {
          margin-top: 6px;
          font-size: 12px;
          color: #f87171;
          background: rgba(248,113,113,.08);
          border: 1px solid rgba(248,113,113,.2);
          border-radius: 6px;
          padding: 4px 8px;
        }

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
        .conf-badge { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; padding: 2px 8px; border-radius: 999px; border: 1px solid; }
        .conf-badge--strong { color: #34d399; border-color: rgba(52,211,153,.3); background: rgba(52,211,153,.08); }
        .conf-badge--mid { color: #fbbf24; border-color: rgba(251,191,36,.3); background: rgba(251,191,36,.08); }
        .conf-badge--weak { color: #f87171; border-color: rgba(248,113,113,.3); background: rgba(248,113,113,.08); }
        .conf-badge--unknown { color: #94a3b8; border-color: rgba(148,163,184,.3); background: rgba(148,163,184,.08); }

        /* Review history */
        .rev-history { margin-top: 8px; }
        .rev-history-toggle {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: none;
          border: none;
          cursor: pointer;
          color: var(--muted);
          font-size: 12px;
          font-weight: 500;
          padding: 2px 0;
          transition: color .15s;
        }
        .rev-history-toggle:hover { color: var(--text); }
        .rev-history-icon { font-size: 10px; }
        .rev-history-count {
          font-size: 10px;
          background: rgba(255,255,255,.08);
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 1px 6px;
          color: var(--muted);
        }
        .rev-history-list {
          margin-top: 6px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding-left: 4px;
          border-left: 2px solid rgba(255,255,255,.08);
        }
        .rev-history-item {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
          padding: 4px 8px;
          font-size: 11px;
          border-radius: 6px;
          background: rgba(255,255,255,.02);
        }
        .rev-action-badge {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .05em;
          padding: 1px 6px;
          border-radius: 4px;
        }
        .rev-action-badge--approve { background: rgba(78,205,196,.15); color: #4ecdc4; }
        .rev-action-badge--reject  { background: rgba(248,113,113,.15); color: #f87171; }
        .rev-action-badge--defer   { background: rgba(245,158,11,.12); color: #f59e0b; }
        .rev-by    { color: var(--text); font-weight: 600; }
        .rev-stage { color: var(--muted); font-style: italic; }
        .rev-when  { color: var(--muted); margin-left: auto; }
        .rev-notes { color: var(--muted); font-style: italic; width: 100%; padding-top: 2px; }

        .cand-card-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
          align-self: flex-start;
          padding-top: 2px;
        }
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
          min-width: 88px;
          text-align: center;
        }
        .cand-action:disabled { opacity: .35; cursor: default; }
        .cand-action--loading { opacity: .7; }
        .cand-action--approve { color: #4ecdc4; border-color: rgba(78,205,196,.35); }
        .cand-action--approve:hover:not(:disabled) { background: rgba(78,205,196,.12); }
        .cand-action--reject  { color: #f87171; border-color: rgba(248,113,113,.35); }
        .cand-action--reject:hover:not(:disabled)  { background: rgba(248,113,113,.1); }
        .cand-action--defer   { color: var(--muted); border-color: var(--border); }
        .cand-action--defer:hover:not(:disabled)   { background: rgba(255,255,255,.05); color: var(--text); }

        /* ── Mobile ── */
        @media (max-width: 640px) {
          .adash-brand { font-size: 26px; }
          .adash-nav { flex-wrap: nowrap; }
          .cand-card {
            flex-direction: column;
            align-items: stretch;
          }
          .cand-card-actions {
            width: 100%;
            align-self: stretch;
            flex-direction: row;
          }
          .cand-action {
            flex: 1;
            min-width: 0;
            padding: 10px 6px;
          }
          .cand-card-title { white-space: normal; }
          .rev-when { margin-left: 0; width: 100%; }
        }
      `}</style>
    </main>
  );
}
