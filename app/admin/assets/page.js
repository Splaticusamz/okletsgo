'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

function StatusBadge({ status }) {
  const map = {
    candidate: { label: 'candidate', cls: 'sbadge--candidate' },
    approved_1: { label: 'approved ✓', cls: 'sbadge--approved1' },
    approved_2: { label: 'approved ✓✓', cls: 'sbadge--approved2' },
    rejected: { label: 'rejected', cls: 'sbadge--rejected' },
    deferred: { label: 'deferred', cls: 'sbadge--deferred' },
    published: { label: 'published', cls: 'sbadge--published' },
  };
  const cfg = map[status] ?? { label: status, cls: '' };
  return <span className={`sbadge ${cfg.cls}`}>{cfg.label}</span>;
}

function AssetStateBadge({ asset }) {
  const status = asset?.status ?? 'missing';
  const map = {
    missing: ['not generated', 'asset-badge--missing'],
    pending: ['pending', 'asset-badge--pending'],
    processing: ['processing', 'asset-badge--processing'],
    ready: ['ready', 'asset-badge--ready'],
    partial: ['still only fallback', 'asset-badge--partial'],
    failed: ['failed', 'asset-badge--failed'],
  };
  const [label, cls] = map[status] ?? [status, 'asset-badge--missing'];
  return <span className={`asset-badge ${cls}`}>{label}</span>;
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
      <button className="rev-history-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="rev-history-icon">{open ? '▾' : '▸'}</span>
        Review history
        <span className="rev-history-count">{reviews.length}</span>
      </button>
      {open && (
        <div className="rev-history-list">
          {[...reviews].reverse().map((r, i) => {
            const ts = r.reviewedAt
              ? new Date(r.reviewedAt).toLocaleString('en-CA', {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false,
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

function PreviewPane({ asset, title }) {
  if (!asset?.portraitUrl) {
    return <div className="asset-preview-empty">No preview yet</div>;
  }

  if (title === 'Animation' && asset.animationUrl) {
    return <video className="asset-preview-media" src={asset.animationUrl} poster={asset.animationPosterUrl ?? asset.portraitUrl} muted playsInline loop controls />;
  }

  return <img className="asset-preview-media" src={asset.portraitUrl} alt={title} />;
}

export default function AssetsPage() {
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acting, setActing] = useState({});
  const [cardError, setCardError] = useState({});
  const [stillOnly, setStillOnly] = useState({});

  async function loadEvents() {
    const res = await fetch('/api/events');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Failed to load events');
    setAllEvents(data.events ?? []);
  }

  useEffect(() => {
    loadEvents()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const assets = useMemo(() => allEvents.filter((e) => ['approved_1', 'approved_2', 'published', 'rejected'].includes(e.status)), [allEvents]);

  async function doReview(id, action) {
    setActing((a) => ({ ...a, [id]: action }));
    setCardError((e) => ({ ...e, [id]: null }));
    try {
      const res = await fetch(`/api/events/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, stage: 2, notes: '', reviewedBy: 'admin' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Review failed');
      setAllEvents((evs) => evs.map((e) => (e.id === id ? data.event : e)));
    } catch (err) {
      setCardError((e) => ({ ...e, [id]: err.message }));
    } finally {
      setActing((a) => ({ ...a, [id]: false }));
    }
  }

  async function generateAsset(id, regenerate = false) {
    const mode = stillOnly[id] ? 'still-only' : regenerate ? 'regenerate' : 'generate';
    setActing((a) => ({ ...a, [id]: mode }));
    setCardError((e) => ({ ...e, [id]: null }));
    try {
      const res = await fetch('/api/assets/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: id, regenerate, stillOnly: !!stillOnly[id] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Asset generation failed');
      await loadEvents();
    } catch (err) {
      setCardError((e) => ({ ...e, [id]: err.message }));
    } finally {
      setActing((a) => ({ ...a, [id]: false }));
    }
  }

  return (
    <main className="admin-shell">
      <div className="admin-wrap">
        <header className="adash-header">
          <div className="adash-brand"><span className="adash-brand-ok">OK</span><br />LET&apos;S GO<br />/ ADMIN</div>
          <div className="adash-header-right">
            <span className="admin-pill">asset review</span>
            <form method="POST" action="/api/admin/logout"><button type="submit" className="logout-btn">Logout</button></form>
          </div>
        </header>

        <nav className="adash-nav">
          <Link href="/admin" className="adash-nav-link">Dashboard</Link>
          <Link href="/admin/candidates" className="adash-nav-link adash-nav-link--dim">Candidates</Link>
          <Link href="/admin/assets" className="adash-nav-link adash-nav-link--active">Assets</Link>
          <Link href="/admin/publish" className="adash-nav-link adash-nav-link--dim">Publish</Link>
          <Link href="/tasks" className="adash-nav-link">Tasks</Link>
        </nav>

        <div className="asset-title-row">
          <div>
            <h1 className="asset-page-title">Asset Review + Preview</h1>
            <div className="asset-page-sub">{loading ? 'Loading…' : `${assets.length} event${assets.length !== 1 ? 's' : ''} in the asset lane`}</div>
          </div>
          {!loading && assets.length > 0 && (
            <div className="asset-summary-chips">
              <span className="asset-chip asset-chip--pending">{assets.filter((a) => !a.latestAsset || ['pending', 'processing'].includes(a.latestAsset.status)).length} pending</span>
              <span className="asset-chip asset-chip--ready">{assets.filter((a) => a.latestAsset?.status === 'ready').length} ready</span>
              <span className="asset-chip asset-chip--warn">{assets.filter((a) => a.latestAsset?.status === 'partial').length} still-only</span>
            </div>
          )}
        </div>

        {loading && <div className="asset-empty"><div className="asset-empty-icon">⏳</div><div className="asset-empty-title">Loading…</div></div>}
        {error && <div className="asset-empty"><div className="asset-empty-icon">⚠️</div><div className="asset-empty-title">Error loading events</div><div className="asset-empty-sub">{error}</div></div>}
        {!loading && !error && assets.length === 0 && <div className="asset-empty"><div className="asset-empty-icon">🖼️</div><div className="asset-empty-title">No assets ready for review</div><div className="asset-empty-sub">Stage 1 approvals create pending asset records. Approve candidates first.</div></div>}

        {!loading && !error && assets.length > 0 && (
          <div className="asset-grid">
            {assets.map((assetEvent) => {
              const asset = assetEvent.latestAsset;
              const isActing = !!acting[assetEvent.id];
              const actingAction = acting[assetEvent.id];
              const isDone = assetEvent.status === 'approved_2' || assetEvent.status === 'rejected';
              const errMsg = cardError[assetEvent.id] ?? asset?.error;
              const selectedImage = assetEvent.selectedImageCandidate?.url;

              return (
                <div key={assetEvent.id} className={`asset-card ${isDone ? 'asset-card--done' : ''}`}>
                  <div className="asset-previews">
                    <div className="asset-preview-panel"><div className="asset-preview-label">Still</div><PreviewPane asset={asset} title="Still" /></div>
                    <div className="asset-preview-panel"><div className="asset-preview-label">Animation</div><PreviewPane asset={asset} title="Animation" /></div>
                  </div>
                  <div className="asset-card-body">
                    <div className="asset-card-top">
                      <span className="asset-card-day">{assetEvent.date}</span>
                      <ModeTag mode={assetEvent.mode} />
                      <StatusBadge status={assetEvent.status} />
                      <AssetStateBadge asset={asset} />
                    </div>
                    <div className="asset-card-title">{assetEvent.title}</div>
                    <div className="asset-card-city">{[assetEvent.venue, assetEvent.city].filter(Boolean).join(' · ')}</div>
                    <div className="asset-meta-grid">
                      <span>Source image: {selectedImage ? 'selected candidate' : assetEvent.fallbackImage ? 'fallback still' : 'missing'}</span>
                      <span>Assets: {assetEvent.assetCount ?? 0} version{(assetEvent.assetCount ?? 0) === 1 ? '' : 's'}</span>
                      <span>Portrait: 1080×1920</span>
                      <span>Square: 1080×1080</span>
                    </div>
                    {asset?.notes && <div className="asset-note">{asset.notes}</div>}
                    {errMsg && <div className="asset-card-error">⚠ {errMsg}</div>}
                    <ReviewHistory reviews={assetEvent.reviews} />

                    <label className="asset-toggle-row">
                      <input type="checkbox" checked={!!stillOnly[assetEvent.id]} onChange={(e) => setStillOnly((s) => ({ ...s, [assetEvent.id]: e.target.checked }))} />
                      still-only fallback
                    </label>

                    <div className="asset-card-actions">
                      <button className={`asset-action asset-action--generate ${actingAction === 'generate' ? 'asset-action--loading' : ''}`} disabled={isActing || assetEvent.status === 'rejected'} onClick={() => generateAsset(assetEvent.id, false)}>{actingAction === 'generate' ? '…' : asset ? 'Rebuild outputs' : 'Generate assets'}</button>
                      <button className={`asset-action asset-action--regen ${actingAction === 'regenerate' ? 'asset-action--loading' : ''}`} disabled={isActing || assetEvent.status === 'rejected'} onClick={() => generateAsset(assetEvent.id, true)}>{actingAction === 'regenerate' ? '…' : 'Regenerate +'}</button>
                    </div>

                    <div className="asset-card-actions">
                      <button className={`asset-action asset-action--approve ${actingAction === 'approve' ? 'asset-action--loading' : ''}`} disabled={isActing || isDone || !asset || !['ready', 'partial'].includes(asset.status)} onClick={() => doReview(assetEvent.id, 'approve')}>{actingAction === 'approve' ? '…' : '✓ Approve'}</button>
                      <button className={`asset-action asset-action--reject ${actingAction === 'reject' ? 'asset-action--loading' : ''}`} disabled={isActing || isDone} onClick={() => doReview(assetEvent.id, 'reject')}>{actingAction === 'reject' ? '…' : '✗ Reject'}</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        .adash-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; }
        .adash-brand { font-size:36px; line-height:.9; font-weight:800; letter-spacing:-.05em; color:#fff; }
        .adash-brand-ok { color:var(--accent); }
        .adash-header-right { display:flex; align-items:flex-start; padding-top:4px; }
        .adash-nav { display:flex; gap:4px; margin-bottom:24px; border-bottom:1px solid var(--border); padding-bottom:16px; overflow-x:auto; flex-wrap:wrap; }
        .adash-nav-link { padding:7px 14px; border-radius:8px; font-size:14px; font-weight:500; color:var(--text); text-decoration:none; border:1px solid var(--border); }
        .adash-nav-link--active { background:rgba(78,205,196,.12); border-color:rgba(78,205,196,.35); color:var(--accent); }
        .adash-nav-link--dim { color:var(--muted); }
        .asset-title-row { display:flex; justify-content:space-between; gap:12px; margin-bottom:20px; flex-wrap:wrap; }
        .asset-page-title { font-size:22px; font-weight:700; margin:0 0 4px; }
        .asset-page-sub { font-size:13px; color:var(--muted); }
        .asset-summary-chips { display:flex; gap:8px; flex-wrap:wrap; }
        .asset-chip, .asset-badge, .sbadge { font-size:11px; font-weight:700; padding:4px 10px; border-radius:999px; border:1px solid; }
        .asset-chip--pending,.asset-badge--pending { color:#f59e0b; border-color:rgba(245,158,11,.3); background:rgba(245,158,11,.08); }
        .asset-chip--ready,.asset-badge--ready,.sbadge--approved2 { color:#22d3ee; border-color:rgba(34,211,238,.35); background:rgba(34,211,238,.1); }
        .asset-chip--warn,.asset-badge--partial { color:#fb7185; border-color:rgba(251,113,133,.3); background:rgba(251,113,133,.08); }
        .asset-badge--processing { color:#c084fc; border-color:rgba(192,132,252,.3); background:rgba(192,132,252,.08); }
        .asset-badge--failed,.sbadge--rejected { color:#f87171; border-color:rgba(248,113,113,.3); background:rgba(248,113,113,.08); }
        .asset-badge--missing,.sbadge--candidate { color:#94a3b8; border-color:rgba(148,163,184,.3); background:rgba(148,163,184,.08); }
        .sbadge--approved1 { color:#4ecdc4; border-color:rgba(78,205,196,.35); background:rgba(78,205,196,.1); }
        .sbadge--deferred { color:#f59e0b; border-color:rgba(245,158,11,.3); background:rgba(245,158,11,.08); }
        .sbadge--published { color:#a3e635; border-color:rgba(163,230,53,.3); background:rgba(163,230,53,.08); }
        .asset-empty { text-align:center; padding:60px 24px; border:1px dashed rgba(255,255,255,.12); border-radius:16px; background:rgba(255,255,255,.01); }
        .asset-empty-icon { font-size:40px; margin-bottom:12px; }
        .asset-empty-title { font-size:18px; font-weight:600; margin-bottom:8px; }
        .asset-empty-sub { font-size:14px; color:var(--muted); max-width:420px; margin:0 auto; }
        .asset-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(380px,1fr)); gap:16px; }
        .asset-card { background:var(--panel); border:1px solid var(--border); border-radius:16px; overflow:hidden; }
        .asset-card--done { opacity:.7; }
        .asset-previews { display:grid; grid-template-columns:1fr 1fr; border-bottom:1px solid var(--border); }
        .asset-preview-panel { padding:10px; background:#14192e; }
        .asset-preview-label { font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:.08em; margin-bottom:8px; }
        .asset-preview-media, .asset-preview-empty { width:100%; aspect-ratio:9/16; border-radius:12px; background:#0f1323; object-fit:cover; display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,.35); }
        .asset-card-body { padding:14px 16px 16px; }
        .asset-card-top { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px; align-items:center; }
        .asset-card-day { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); }
        .asset-card-title { font-size:16px; font-weight:700; margin-bottom:4px; }
        .asset-card-city { font-size:13px; color:var(--muted); margin-bottom:10px; }
        .asset-meta-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px 10px; font-size:11px; color:var(--muted); margin-bottom:10px; }
        .asset-note { margin-bottom:8px; font-size:12px; color:#cbd5e1; }
        .asset-card-error { margin-bottom:8px; font-size:11px; color:#f87171; background:rgba(248,113,113,.08); border:1px solid rgba(248,113,113,.2); border-radius:6px; padding:6px 8px; }
        .asset-toggle-row { display:flex; gap:8px; align-items:center; font-size:12px; color:var(--muted); margin:10px 0; }
        .asset-card-actions { display:flex; gap:8px; margin-top:8px; }
        .asset-action { flex:1; padding:9px 8px; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; border:1px solid; background:transparent; }
        .asset-action:disabled { opacity:.35; cursor:default; }
        .asset-action--loading { opacity:.7; }
        .asset-action--generate { color:#4ecdc4; border-color:rgba(78,205,196,.35); }
        .asset-action--regen { color:#c084fc; border-color:rgba(192,132,252,.35); }
        .asset-action--approve { color:var(--accent); border-color:rgba(78,205,196,.35); }
        .asset-action--reject { color:#f87171; border-color:rgba(248,113,113,.35); }
        .asset-mode-tag { font-size:10px; font-weight:600; padding:2px 7px; border-radius:999px; border:1px solid; text-transform:lowercase; }
        .asset-mode-tag--day { color:#f59e0b; border-color:rgba(245,158,11,.35); background:rgba(245,158,11,.08); }
        .asset-mode-tag--night { color:#a78bfa; border-color:rgba(167,139,250,.35); background:rgba(167,139,250,.08); }
        .rev-history { margin-bottom:10px; }
        .rev-history-toggle { display:inline-flex; align-items:center; gap:5px; background:none; border:none; cursor:pointer; color:var(--muted); font-size:11px; padding:2px 0; }
        .rev-history-list { margin-top:5px; display:flex; flex-direction:column; gap:3px; padding-left:4px; border-left:2px solid rgba(255,255,255,.08); }
        .rev-history-item { display:flex; align-items:center; flex-wrap:wrap; gap:5px; padding:3px 6px; font-size:10px; border-radius:4px; background:rgba(255,255,255,.02); }
        .rev-action-badge { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; padding:1px 5px; border-radius:3px; }
        .rev-action-badge--approve { background:rgba(78,205,196,.15); color:#4ecdc4; }
        .rev-action-badge--reject { background:rgba(248,113,113,.15); color:#f87171; }
        .rev-action-badge--defer { background:rgba(245,158,11,.12); color:#f59e0b; }
        .rev-by { color:var(--text); font-weight:600; } .rev-stage,.rev-when,.rev-notes { color:var(--muted); }
        .rev-when { margin-left:auto; }
        @media (max-width: 640px) { .adash-brand{font-size:26px;} .asset-grid{grid-template-columns:1fr;} .asset-previews{grid-template-columns:1fr;} .asset-meta-grid{grid-template-columns:1fr;} .rev-when{margin-left:0;width:100%;} }
      `}</style>
    </main>
  );
}
