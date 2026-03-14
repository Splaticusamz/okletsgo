'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

function StatusBadge({ status }) {
  const map = {
    draft: ['draft', 'nl-badge--draft'],
    approved: ['approved', 'nl-badge--approved'],
    ready_to_send: ['ready to send', 'nl-badge--ready'],
  };
  const [label, cls] = map[status] ?? [status ?? 'none', ''];
  return <span className={`nl-badge ${cls}`}>{label}</span>;
}

export default function NewsletterPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [error, setError] = useState(null);
  const [settings, setSettings] = useState({ publicationId: '', templateId: '', audienceSegment: 'all', endpointPath: '/v2/posts' });

  async function loadData() {
    const res = await fetch('/api/newsletter');
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? 'Failed to load newsletter data');
    setData(json);
    setSettings({
      publicationId: json.settings?.publicationId ?? '',
      templateId: json.settings?.templateId ?? '',
      audienceSegment: json.settings?.audienceSegment ?? 'all',
      endpointPath: json.settings?.endpointPath ?? '/v2/posts',
    });
  }

  useEffect(() => {
    loadData().catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  async function doAction(action, extra = {}) {
    setActing(action);
    setError(null);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const json = await res.json();
      if (![200, 201].includes(res.status)) throw new Error(json.error ?? json.message ?? 'Action failed');
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActing(null);
    }
  }

  const latest = data?.latest;

  return (
    <main className="admin-shell">
      <div className="admin-wrap">
        <header className="adash-header">
          <div className="adash-brand"><span className="adash-brand-ok">OK</span><br />LET&apos;S GO<br />/ ADMIN</div>
          <div className="adash-header-right">
            <span className="admin-pill">newsletter</span>
            <form method="POST" action="/api/admin/logout"><button type="submit" className="logout-btn">Logout</button></form>
          </div>
        </header>

        <nav className="adash-nav">
          <Link href="/admin" className="adash-nav-link">Dashboard</Link>
          <Link href="/admin/candidates" className="adash-nav-link adash-nav-link--dim">Candidates</Link>
          <Link href="/admin/assets" className="adash-nav-link adash-nav-link--dim">Assets</Link>
          <Link href="/admin/publish" className="adash-nav-link adash-nav-link--dim">Publish</Link>
          <Link href="/admin/newsletter" className="adash-nav-link adash-nav-link--active">Newsletter</Link>
          <Link href="/admin/archives" className="adash-nav-link adash-nav-link--dim">Archives</Link>
          <Link href="/tasks" className="adash-nav-link">Tasks</Link>
        </nav>

        {loading && <div className="nl-empty">Loading…</div>}
        {error && <div className="pub-error">⚠ {error}</div>}

        {!loading && (
          <>
            <section className="pub-section">
              <h2 className="pub-section-title">Newsletter draft {latest?.status ? <StatusBadge status={latest.status} /> : null}</h2>
              {latest ? (
                <>
                  <div className="pub-meta">
                    <span>Draft: <strong>{latest.id}</strong></span>
                    <span>Batch: <strong>{latest.batchId}</strong></span>
                    <span>Week: <strong>{latest.weekLabel}</strong></span>
                    <span>Blocks: <strong>{latest.blocks?.length ?? 0}</strong></span>
                  </div>
                  <div className="nl-copy-grid">
                    <div className="nl-copy-card"><div className="nl-copy-label">Subject</div><div>{latest.subject}</div></div>
                    <div className="nl-copy-card"><div className="nl-copy-label">Preview text</div><div>{latest.previewText}</div></div>
                    <div className="nl-copy-card nl-copy-card--wide"><div className="nl-copy-label">Intro</div><div>{latest.intro}</div></div>
                    <div className="nl-copy-card nl-copy-card--wide"><div className="nl-copy-label">Outro</div><div>{latest.outro}</div></div>
                  </div>
                  <div className="nl-sections">
                    {(latest.sections ?? []).map((section) => (
                      <div key={section.id} className="nl-section-card">
                        <div className="nl-section-head">
                          <strong>{section.heading}</strong>
                          <span>{section.summary}</span>
                        </div>
                        <ul>
                          {(section.items ?? []).map((item) => <li key={item.eventId}>{item.title} — {[item.venue, item.city].filter(Boolean).join(' · ')}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <div className="nl-actions">
                    <button className="pub-btn pub-btn--generate" disabled={!!acting} onClick={() => doAction('generate')}>{acting === 'generate' ? 'Refreshing…' : '↻ Regenerate from current batch'}</button>
                    <button className="pub-btn pub-btn--publish" disabled={!!acting || latest.status !== 'draft'} onClick={() => doAction('approve', { draftId: latest.id })}>{acting === 'approve' ? 'Approving…' : '✓ Final approval'}</button>
                    <button className="pub-btn pub-btn--publish" disabled={!!acting || latest.status !== 'approved'} onClick={() => doAction('ready', { draftId: latest.id })}>{acting === 'ready' ? 'Marking…' : '🚀 Mark ready to send'}</button>
                  </div>
                </>
              ) : (
                <div className="pub-actions"><button className="pub-btn pub-btn--generate" disabled={!!acting} onClick={() => doAction('generate')}>{acting === 'generate' ? 'Generating…' : 'Generate newsletter draft from current batch'}</button></div>
              )}
            </section>

            <section className="pub-section">
              <h2 className="pub-section-title">Beehiiv later-ready scaffold</h2>
              <div className="nl-settings-grid">
                <label><span>Publication ID</span><input value={settings.publicationId} onChange={(e) => setSettings((s) => ({ ...s, publicationId: e.target.value }))} /></label>
                <label><span>Template ID</span><input value={settings.templateId} onChange={(e) => setSettings((s) => ({ ...s, templateId: e.target.value }))} /></label>
                <label><span>Audience segment</span><input value={settings.audienceSegment} onChange={(e) => setSettings((s) => ({ ...s, audienceSegment: e.target.value }))} /></label>
                <label><span>Endpoint path</span><input value={settings.endpointPath} onChange={(e) => setSettings((s) => ({ ...s, endpointPath: e.target.value }))} /></label>
              </div>
              <div className="nl-actions">
                <button className="pub-btn pub-btn--generate" disabled={!!acting} onClick={() => doAction('save_settings', { settings })}>{acting === 'save_settings' ? 'Saving…' : 'Save Beehiiv settings scaffold'}</button>
              </div>
              {data?.beehiivPayload && <pre className="nl-payload">{JSON.stringify(data.beehiivPayload, null, 2)}</pre>}
              <div className="nl-note">Send is intentionally not wired yet. This page stores scaffold settings and exports the payload shape the future Beehiiv integration will post.</div>
            </section>
          </>
        )}
      </div>

      <style>{`
        .adash-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; }
        .adash-brand { font-size:36px; line-height:.9; font-weight:800; letter-spacing:-.05em; color:#fff; }
        .adash-brand-ok { color:var(--accent); }
        .adash-header-right { display:flex; align-items:flex-start; padding-top:4px; }
        .adash-nav { display:flex; flex-wrap:wrap; gap:4px; margin-bottom:24px; border-bottom:1px solid var(--border); padding-bottom:16px; }
        .adash-nav-link { padding:7px 14px; border-radius:8px; font-size:14px; font-weight:500; color:var(--text); text-decoration:none; border:1px solid var(--border); }
        .adash-nav-link--active { background:rgba(78,205,196,.12); border-color:rgba(78,205,196,.35); color:var(--accent); }
        .adash-nav-link--dim { color:var(--muted); }
        .nl-empty { padding:40px 0; color:var(--muted); }
        .nl-badge { font-size:11px; font-weight:700; padding:3px 10px; border-radius:999px; border:1px solid; text-transform:uppercase; }
        .nl-badge--draft { color:#f59e0b; border-color:rgba(245,158,11,.3); background:rgba(245,158,11,.08); }
        .nl-badge--approved { color:#4ecdc4; border-color:rgba(78,205,196,.35); background:rgba(78,205,196,.08); }
        .nl-badge--ready { color:#a3e635; border-color:rgba(163,230,53,.35); background:rgba(163,230,53,.08); }
        .nl-copy-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; margin-bottom:16px; }
        .nl-copy-card { border:1px solid var(--border); border-radius:12px; padding:12px 14px; background:rgba(255,255,255,.02); }
        .nl-copy-card--wide { grid-column:1 / -1; }
        .nl-copy-label { font-size:11px; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); margin-bottom:6px; }
        .nl-sections { display:grid; gap:12px; }
        .nl-section-card { border:1px solid var(--border); border-radius:12px; padding:14px; background:rgba(255,255,255,.02); }
        .nl-section-head { display:flex; justify-content:space-between; gap:10px; margin-bottom:8px; }
        .nl-section-head span { color:var(--muted); font-size:12px; }
        .nl-section-card ul { margin-left:18px; color:#cbd5e1; display:grid; gap:6px; }
        .nl-actions { display:flex; gap:10px; flex-wrap:wrap; margin-top:16px; }
        .nl-settings-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
        .nl-settings-grid label { display:grid; gap:6px; font-size:12px; color:var(--muted); }
        .nl-settings-grid input { background:#0f1323; color:#fff; border:1px solid var(--border); border-radius:10px; padding:10px 12px; }
        .nl-payload { margin-top:16px; white-space:pre-wrap; font-size:12px; background:#0a0d18; border:1px solid var(--border); border-radius:12px; padding:14px; color:#cbd5e1; }
        .nl-note { margin-top:12px; color:var(--muted); font-size:13px; }
        @media (max-width: 640px) { .adash-brand { font-size:28px; } .nl-copy-grid,.nl-settings-grid { grid-template-columns:1fr; } }
      `}</style>
    </main>
  );
}
