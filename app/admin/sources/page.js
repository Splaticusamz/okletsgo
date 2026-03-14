'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

function ResultCard({ result }) {
  if (!result) return null;

  const summary = result.summary ?? {};

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Latest run</div>
          <h2 className="panel-title">{summary.dedupedCount ?? 0} candidate{summary.dedupedCount === 1 ? '' : 's'} returned</h2>
        </div>
        <div className="summary-chips">
          <span className="chip">{result.ran} source{result.ran === 1 ? '' : 's'}</span>
          <span className="chip">raw {summary.rawCount ?? 0}</span>
          <span className="chip">normalized {summary.normalizedCount ?? 0}</span>
          <span className="chip">deduped {summary.dedupedCount ?? 0}</span>
          <span className="chip">dupes {summary.duplicateCount ?? 0}</span>
          <span className="chip">errors {summary.errorCount ?? 0}</span>
          <span className="chip">fallbacks {summary.fallbackCount ?? 0}</span>
        </div>
      </div>

      {result.errors?.length > 0 && (
        <div className="error-list">
          {result.errors.map((error, index) => (
            <div key={`${error.sourceId}-${index}`} className="error-row">⚠ <strong>{error.sourceId}</strong>: {error.message}</div>
          ))}
        </div>
      )}

      {result.duplicates?.length > 0 && (
        <div className="dupe-list">
          <div className="dupe-title">Dropped duplicates</div>
          {result.duplicates.slice(0, 8).map((dupe, index) => (
            <div key={`${dupe.duplicateId}-${index}`} className="dupe-row">
              Dropped <strong>{dupe.event?.title}</strong> as duplicate of <code>{dupe.keptId}</code>
            </div>
          ))}
        </div>
      )}

      <div className="events-list">
        {(result.events ?? []).slice(0, 12).map((event) => (
          <div key={event.id} className="event-row">
            <div>
              <div className="event-title">{event.title}</div>
              <div className="event-meta">{event.date} · {event.venue} · {event.city}</div>
            </div>
            <span className={`mode-pill mode-pill--${event.mode}`}>{event.mode}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function SourcesPage() {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetch('/api/sources')
      .then((res) => res.json())
      .then((data) => {
        setSources(data.sources ?? []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  async function run(body, label) {
    setRunning(label);
    setError('');
    try {
      const res = await fetch('/api/sources/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Run failed');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(null);
    }
  }

  return (
    <main className="admin-shell">
      <div className="admin-wrap">
        <header className="adash-header">
          <div className="adash-brand"><span className="adash-brand-ok">OK</span><br />LET&apos;S GO<br />/ ADMIN</div>
          <div className="adash-header-right">
            <span className="admin-pill">source runners</span>
            <form method="POST" action="/api/admin/logout">
              <button type="submit" className="logout-btn">Logout</button>
            </form>
          </div>
        </header>

        <nav className="adash-nav">
          <Link href="/admin" className="adash-nav-link">Dashboard</Link>
          <Link href="/admin/candidates" className="adash-nav-link adash-nav-link--dim">Candidates</Link>
          <Link href="/admin/assets" className="adash-nav-link adash-nav-link--dim">Assets</Link>
          <Link href="/admin/sources" className="adash-nav-link adash-nav-link--active">Sources</Link>
          <Link href="/admin/manual" className="adash-nav-link adash-nav-link--dim">Manual</Link>
          <Link href="/admin/publish" className="adash-nav-link adash-nav-link--dim">Publish</Link>
          <Link href="/tasks" className="adash-nav-link">Tasks</Link>
        </nav>

        <section className="panel">
          <div className="panel-header">
            <div>
              <div className="eyebrow">Ingestion</div>
              <h1 className="page-title">Source fetchers</h1>
            </div>
            <button className="primary-btn" disabled={loading || !!running} onClick={() => run({ all: true }, 'all')}>
              {running === 'all' ? 'Running all…' : 'Run all active'}
            </button>
          </div>
          <div className="panel-sub">Run source fetchers, normalize their output into a common candidate shape, and dedupe obvious duplicates before review.</div>

          {loading && <div className="empty">Loading sources…</div>}
          {error && <div className="error-banner">⚠ {error}</div>}

          {!loading && (
            <div className="source-list">
              {sources.map((source) => (
                <div key={source.id} className={`source-row ${source.active ? '' : 'source-row--inactive'}`}>
                  <div>
                    <div className="source-name">{source.name}</div>
                    <div className="source-meta">{source.id} · {source.type} · {source.active ? 'active' : 'inactive'}{source.hasFetcher ? ' · fetcher ready' : ' · no fetcher yet'}</div>
                    {source.notes && <div className="source-notes">{source.notes}</div>}
                  </div>
                  <div className="source-actions">
                    <a href={source.url} target="_blank" rel="noreferrer" className="ghost-btn">Open ↗</a>
                    <button className="ghost-btn" disabled={!source.active || !source.hasFetcher || !!running} onClick={() => run({ sourceId: source.id }, source.id)}>
                      {running === source.id ? 'Running…' : 'Run'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <ResultCard result={result} />
      </div>

      <style>{`
        .adash-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px}.adash-brand{font-size:36px;line-height:.9;font-weight:800;letter-spacing:-.05em;color:#fff}.adash-brand-ok{color:var(--accent)}.adash-header-right{display:flex;align-items:flex-start;gap:10px;padding-top:4px}.adash-nav{display:flex;gap:4px;margin-bottom:24px;border-bottom:1px solid var(--border);padding-bottom:16px;overflow:auto;flex-wrap:wrap}.adash-nav-link{padding:7px 14px;border-radius:8px;font-size:14px;font-weight:500;color:var(--text);text-decoration:none;border:1px solid var(--border)}.adash-nav-link--active{background:rgba(78,205,196,.12);border-color:rgba(78,205,196,.35);color:var(--accent)}.adash-nav-link--dim{color:var(--muted)}
        .panel{background:var(--panel);border:1px solid var(--border);border-radius:16px;padding:20px 24px;margin-bottom:16px}.panel-header{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap}.eyebrow{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:4px}.page-title,.panel-title{font-size:28px;color:var(--text);margin:0}.panel-sub{color:var(--muted);margin-top:8px;font-size:14px}.primary-btn,.ghost-btn,.logout-btn{border-radius:10px;padding:10px 14px;border:1px solid var(--border);background:transparent;color:var(--text);cursor:pointer;text-decoration:none;font:inherit}.primary-btn{background:var(--accent);border-color:var(--accent);color:#07121a;font-weight:700}.primary-btn:disabled,.ghost-btn:disabled{opacity:.45;cursor:not-allowed}.source-list,.events-list,.dupe-list{display:flex;flex-direction:column;gap:10px;margin-top:18px}.source-row,.event-row,.dupe-row{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;padding:14px;border-radius:12px;border:1px solid var(--border);background:rgba(255,255,255,.02)}.source-row--inactive{opacity:.6}.source-name,.event-title,.dupe-title{font-weight:700;color:var(--text)}.source-meta,.source-notes,.event-meta{color:var(--muted);font-size:13px}.source-actions,.summary-chips{display:flex;gap:8px;flex-wrap:wrap}.chip,.mode-pill{font-size:12px;padding:5px 10px;border-radius:999px;border:1px solid var(--border);color:var(--muted)}.mode-pill--day{color:#fbbf24}.mode-pill--night{color:#60a5fa}.error-banner,.error-row{color:#fecaca;background:rgba(127,29,29,.18);border:1px solid rgba(248,113,113,.25);padding:10px 12px;border-radius:10px}.error-list{display:flex;flex-direction:column;gap:8px;margin-top:16px}.empty{margin-top:16px;color:var(--muted)}code{font-family:ui-monospace, SFMono-Regular, Menlo, monospace}
        @media (max-width: 640px){.adash-brand{font-size:26px}.source-row,.event-row{flex-direction:column}.page-title,.panel-title{font-size:22px}}
      `}</style>
    </main>
  );
}
