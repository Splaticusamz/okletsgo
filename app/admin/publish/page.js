'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

function StatusBadge({ status }) {
  const map = {
    draft: ['draft', 'batch-badge--draft'],
    published: ['published', 'batch-badge--published'],
    superseded: ['superseded', 'batch-badge--superseded'],
    rolled_back: ['rolled back', 'batch-badge--rolledback'],
  };
  const [label, cls] = map[status] ?? [status, ''];
  return <span className={`batch-badge ${cls}`}>{label}</span>;
}

function EventRow({ event }) {
  return (
    <div className="pub-row">
      <span className="pub-row-title">{event.title || event.venue || event.id}</span>
      <span className="pub-row-day">{event.date || '—'}</span>
      <span className="pub-row-mode">{event.mode || '—'}</span>
      <span className="pub-row-city">{event.city || '—'}</span>
    </div>
  );
}

function AuditTrail({ actions }) {
  if (!actions || actions.length === 0) return null;
  return (
    <div className="pub-audit">
      <h3 className="pub-audit-title">Audit trail</h3>
      {actions.map((a) => (
        <div key={a.id} className="pub-audit-row">
          <span className={`pub-audit-action pub-audit-action--${a.action}`}>{a.action}</span>
          <span className="pub-audit-detail">{a.detail}</span>
          <span className="pub-audit-by">{a.by}</span>
          <span className="pub-audit-time">{a.timestamp ? new Date(a.timestamp).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false }) + ' UTC' : '—'}</span>
        </div>
      ))}
    </div>
  );
}

export default function PublishPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acting, setActing] = useState(null);

  async function loadData() {
    const res = await fetch('/api/publish/batch');
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? 'Failed to load batch data');
    setData(json);
  }

  useEffect(() => {
    loadData().catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  async function doAction(action, batchId) {
    setActing(action);
    setError(null);
    try {
      const res = await fetch('/api/publish/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, batchId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Action failed');
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActing(null);
    }
  }

  const latest = data?.latest;
  const currentPublished = data?.currentPublished;
  const hasDraft = latest?.status === 'draft';
  const hasPublished = !!currentPublished;

  return (
    <main className="admin-shell">
      <div className="admin-wrap">

        {/* Header */}
        <header className="adash-header">
          <div className="adash-brand">
            <span className="adash-brand-ok">OK</span><br />LET&apos;S GO<br />/ ADMIN
          </div>
          <div className="adash-header-right">
            <span className="admin-pill">publish</span>
            <form method="POST" action="/api/admin/logout">
              <button type="submit" className="logout-btn">Logout</button>
            </form>
          </div>
        </header>

        {/* Nav */}
        <nav className="adash-nav">
          <Link href="/admin" className="adash-nav-link">Dashboard</Link>
          <Link href="/admin/candidates" className="adash-nav-link adash-nav-link--dim">Candidates</Link>
          <Link href="/admin/assets" className="adash-nav-link adash-nav-link--dim">Assets</Link>
          <Link href="/admin/sources" className="adash-nav-link adash-nav-link--dim">Sources</Link>
          <Link href="/admin/manual" className="adash-nav-link adash-nav-link--dim">Manual</Link>
          <Link href="/admin/publish" className="adash-nav-link adash-nav-link--active">Publish</Link>
          <Link href="/tasks" className="adash-nav-link">Tasks</Link>
        </nav>

        {loading && <div className="pub-empty"><div className="pub-empty-icon">⏳</div><div className="pub-empty-text">Loading…</div></div>}
        {error && <div className="pub-error">⚠ {error}</div>}

        {!loading && (
          <>
            {/* ── Currently Live ── */}
            <section className="pub-section">
              <h2 className="pub-section-title">
                Currently live
                {hasPublished && <StatusBadge status="published" />}
              </h2>
              {hasPublished ? (
                <>
                  <div className="pub-meta">
                    <span>Batch: <strong>{currentPublished.id}</strong></span>
                    <span>Week: <strong>{currentPublished.weekLabel}</strong></span>
                    <span>Published: <strong>{currentPublished.publishedAt ? new Date(currentPublished.publishedAt).toLocaleString('en-CA') : '—'}</strong></span>
                    <span>Events: <strong>{currentPublished.events?.length ?? 0}</strong></span>
                  </div>
                  <div className="pub-table">
                    <div className="pub-table-header">
                      <span>Event</span><span>Date</span><span>Mode</span><span>City</span>
                    </div>
                    {(currentPublished.events ?? []).map((e) => <EventRow key={e.id} event={e} />)}
                  </div>
                  <div className="pub-actions">
                    <button
                      className="pub-btn pub-btn--danger"
                      disabled={!!acting}
                      onClick={() => { if (confirm('Rollback this published batch?')) doAction('rollback', currentPublished.id); }}
                    >
                      {acting === 'rollback' ? 'Rolling back…' : '↩ Rollback'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="pub-empty-inline">No published batch yet. Generate a draft from approved events below.</div>
              )}
            </section>

            {/* ── Draft Preview ── */}
            <section className="pub-section">
              <h2 className="pub-section-title">
                Draft batch preview
                {hasDraft && <StatusBadge status="draft" />}
              </h2>

              {hasDraft ? (
                <>
                  <div className="pub-meta">
                    <span>Batch: <strong>{latest.id}</strong></span>
                    <span>Week: <strong>{latest.weekLabel}</strong></span>
                    <span>Events: <strong>{latest.events?.length ?? 0}</strong></span>
                  </div>
                  <div className="pub-table">
                    <div className="pub-table-header">
                      <span>Event</span><span>Date</span><span>Mode</span><span>City</span>
                    </div>
                    {(latest.events ?? []).map((e) => <EventRow key={e.id} event={e} />)}
                  </div>
                  <div className="pub-actions">
                    <button
                      className="pub-btn pub-btn--publish"
                      disabled={!!acting}
                      onClick={() => { if (confirm('Publish this batch? It will go live on the homepage.')) doAction('publish', latest.id); }}
                    >
                      {acting === 'publish' ? 'Publishing…' : '🚀 Confirm publish'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="pub-empty-inline">No draft batch. Generate one from all approved_2 events.</div>
                  <div className="pub-actions">
                    <button
                      className="pub-btn pub-btn--generate"
                      disabled={!!acting}
                      onClick={() => doAction('generate')}
                    >
                      {acting === 'generate' ? 'Generating…' : '📦 Generate draft batch'}
                    </button>
                  </div>
                </>
              )}
            </section>

            {/* ── All Batches ── */}
            {data?.batches?.length > 0 && (
              <section className="pub-section">
                <h2 className="pub-section-title">Batch history</h2>
                <div className="pub-batch-list">
                  {data.batches.map((b) => (
                    <div key={b.id} className="pub-batch-row">
                      <span className="pub-batch-id">{b.id}</span>
                      <span className="pub-batch-week">{b.weekLabel}</span>
                      <StatusBadge status={b.status} />
                      <span className="pub-batch-count">{b.eventIds?.length ?? 0} events</span>
                      <span className="pub-batch-time">{new Date(b.createdAt).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false })}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Audit Trail ── */}
            <AuditTrail actions={data?.auditTrail} />
          </>
        )}
      </div>

      <style>{`
        .adash-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; }
        .adash-brand { font-size:36px; line-height:.9; font-weight:800; letter-spacing:-.05em; color:#fff; }
        .adash-brand-ok { color:var(--accent); }
        .adash-header-right { display:flex; align-items:flex-start; padding-top:4px; }
        .adash-nav { display:flex; flex-wrap:wrap; gap:4px; margin-bottom:24px; border-bottom:1px solid var(--border); padding-bottom:16px; }
        .adash-nav-link { padding:7px 14px; border-radius:8px; font-size:14px; font-weight:500; color:var(--text); text-decoration:none; border:1px solid var(--border); transition:background .15s; }
        .adash-nav-link:hover { background:rgba(255,255,255,.06); }
        .adash-nav-link--active { background:rgba(78,205,196,.12); border-color:rgba(78,205,196,.35); color:var(--accent); }
        .adash-nav-link--dim { color:var(--muted); }

        .pub-section { background:var(--panel); border:1px solid var(--border); border-radius:16px; padding:20px 24px; margin-bottom:20px; }
        .pub-section-title { font-size:18px; font-weight:700; margin:0 0 16px; display:flex; align-items:center; gap:10px; }
        .pub-meta { display:flex; flex-wrap:wrap; gap:16px; margin-bottom:16px; font-size:13px; color:var(--muted); }
        .pub-meta strong { color:var(--text); }

        .batch-badge { font-size:11px; font-weight:700; padding:3px 10px; border-radius:999px; border:1px solid; text-transform:uppercase; letter-spacing:.06em; }
        .batch-badge--draft { color:#f59e0b; border-color:rgba(245,158,11,.3); background:rgba(245,158,11,.08); }
        .batch-badge--published { color:#a3e635; border-color:rgba(163,230,53,.3); background:rgba(163,230,53,.08); }
        .batch-badge--superseded { color:#94a3b8; border-color:rgba(148,163,184,.3); background:rgba(148,163,184,.08); }
        .batch-badge--rolledback { color:#f87171; border-color:rgba(248,113,113,.3); background:rgba(248,113,113,.08); }

        .pub-table { border:1px solid var(--border); border-radius:12px; overflow:hidden; margin-bottom:16px; }
        .pub-table-header { display:grid; grid-template-columns:1fr 100px 80px 100px; gap:12px; padding:10px 16px; background:rgba(255,255,255,.03); border-bottom:1px solid var(--border); font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:var(--muted); }
        .pub-row { display:grid; grid-template-columns:1fr 100px 80px 100px; gap:12px; padding:12px 16px; align-items:center; border-bottom:1px solid var(--border); }
        .pub-row:last-child { border-bottom:none; }
        .pub-row-title { font-size:14px; font-weight:600; color:var(--text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .pub-row-day,.pub-row-mode,.pub-row-city { font-size:12px; color:var(--muted); text-transform:uppercase; letter-spacing:.06em; }

        .pub-actions { display:flex; gap:10px; margin-top:12px; }
        .pub-btn { padding:12px 24px; border-radius:10px; font-size:15px; font-weight:700; cursor:pointer; border:1px solid; background:transparent; transition:opacity .15s; }
        .pub-btn:disabled { opacity:.5; cursor:default; }
        .pub-btn--publish { color:#a3e635; border-color:rgba(163,230,53,.35); }
        .pub-btn--publish:hover:not(:disabled) { background:rgba(163,230,53,.08); }
        .pub-btn--generate { color:var(--accent); border-color:rgba(78,205,196,.35); }
        .pub-btn--generate:hover:not(:disabled) { background:rgba(78,205,196,.08); }
        .pub-btn--danger { color:#f87171; border-color:rgba(248,113,113,.35); }
        .pub-btn--danger:hover:not(:disabled) { background:rgba(248,113,113,.08); }

        .pub-empty { text-align:center; padding:40px 24px; }
        .pub-empty-icon { font-size:32px; margin-bottom:8px; }
        .pub-empty-text { font-size:14px; color:var(--muted); }
        .pub-empty-inline { font-size:14px; color:var(--muted); margin-bottom:12px; }
        .pub-error { font-size:13px; color:#f87171; background:rgba(248,113,113,.08); border:1px solid rgba(248,113,113,.2); border-radius:8px; padding:10px 14px; margin-bottom:16px; }

        .pub-batch-list { display:flex; flex-direction:column; gap:6px; }
        .pub-batch-row { display:flex; align-items:center; gap:10px; padding:8px 12px; background:rgba(255,255,255,.02); border-radius:8px; font-size:12px; flex-wrap:wrap; }
        .pub-batch-id { font-weight:600; color:var(--text); }
        .pub-batch-week,.pub-batch-count,.pub-batch-time { color:var(--muted); }

        .pub-audit { background:var(--panel); border:1px solid var(--border); border-radius:16px; padding:20px 24px; margin-bottom:20px; }
        .pub-audit-title { font-size:16px; font-weight:600; margin:0 0 12px; }
        .pub-audit-row { display:flex; align-items:center; gap:8px; padding:6px 8px; font-size:11px; border-bottom:1px solid rgba(255,255,255,.04); flex-wrap:wrap; }
        .pub-audit-row:last-child { border-bottom:none; }
        .pub-audit-action { font-weight:700; text-transform:uppercase; padding:2px 6px; border-radius:4px; font-size:10px; }
        .pub-audit-action--generate_draft { background:rgba(78,205,196,.12); color:#4ecdc4; }
        .pub-audit-action--publish { background:rgba(163,230,53,.12); color:#a3e635; }
        .pub-audit-action--rollback { background:rgba(248,113,113,.12); color:#f87171; }
        .pub-audit-action--superseded,.pub-audit-action--restored { background:rgba(148,163,184,.1); color:#94a3b8; }
        .pub-audit-detail { color:var(--muted); flex:1; }
        .pub-audit-by { color:var(--text); font-weight:600; }
        .pub-audit-time { color:var(--muted); margin-left:auto; }

        @media (max-width:640px) {
          .adash-brand { font-size:28px; }
          .pub-table-header,.pub-row { grid-template-columns:1fr 80px; }
          .pub-table-header span:nth-child(3),.pub-table-header span:nth-child(4),.pub-row>*:nth-child(3),.pub-row>*:nth-child(4) { display:none; }
        }
      `}</style>
    </main>
  );
}
