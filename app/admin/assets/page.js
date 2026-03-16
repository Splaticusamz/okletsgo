'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import AdminNav from '../../../components/AdminNav';

/* ── Tiny utility components ── */

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

function ModeTag({ mode }) {
  const m = { night: ['🌙', 'night', 'mode--night'], family: ['👨‍👩‍👧', 'family', 'mode--day'], grownup: ['☀️', 'grownup', 'mode--day'], day: ['☀️', 'day', 'mode--day'] };
  const [icon, label, cls] = m[mode] ?? ['☀️', mode, 'mode--day'];
  return <span className={`mode-tag ${cls}`}>{icon} {label}</span>;
}

function AssetStateBadge({ asset }) {
  const status = asset?.status ?? 'missing';
  const map = { missing: ['not generated', 'ab--missing'], pending: ['pending', 'ab--pending'], processing: ['processing', 'ab--processing'], ready: ['ready', 'ab--ready'], partial: ['still only', 'ab--partial'], failed: ['failed', 'ab--failed'] };
  const [label, cls] = map[status] ?? [status, 'ab--missing'];
  return <span className={`ab ${cls}`}>{label}</span>;
}

/* ── Image Gallery ── */

function ImageGallery({ event, onUpdate, onSelectImage }) {
  const [uploading, setUploading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [categories, setCategories] = useState(null);
  const candidates = event.imageCandidates ?? [];

  // Group existing candidates by category
  const venueImgs = candidates.filter(c => c.category === 'venue');
  const eventImgs = candidates.filter(c => c.category === 'event');
  const activityImgs = candidates.filter(c => c.category === 'activity');
  const otherImgs = candidates.filter(c => !c.category);
  const hasCategorized = venueImgs.length > 0 || eventImgs.length > 0 || activityImgs.length > 0;

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch(`/api/events/${event.id}/upload-image`, { method: 'POST', body: form });
      if (!res.ok) throw new Error((await res.json()).error);
      onUpdate?.();
    } catch (err) { alert('Upload failed: ' + err.message); }
    finally { setUploading(false); }
  }

  async function handleFetchImages() {
    setFetching(true);
    try {
      const res = await fetch(`/api/events/${event.id}/find-images`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categorized: true }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      if (data.categories) setCategories(data.categories);
      onUpdate?.();
    } catch (err) { alert('Fetch failed: ' + err.message); }
    finally { setFetching(false); }
  }

  function renderRow(label, emoji, images) {
    return (
      <div className="img-cat">
        <div className="img-cat-label">{emoji} {label} ({images.length})</div>
        <div className="img-cat-row">
          {images.length > 0 ? images.map(c => (
            <div key={c.id} className={`img-thumb ${c.selected ? 'img-thumb--sel' : ''}`} onClick={() => onSelectImage?.(c)}>
              <img src={c.url} alt="" loading="lazy" />
              {c.selected && <div className="img-check">✓</div>}
            </div>
          )) : <span className="img-cat-empty">—</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="img-gal">
      <div className="img-gal-head">
        <span className="img-gal-label">Images ({candidates.length})</span>
        <div className="img-gal-acts">
          <label className="img-gal-btn">{uploading ? '…' : '📤 Upload'}<input type="file" accept="image/*" onChange={handleUpload} hidden /></label>
          <button className="img-gal-btn img-gal-btn--fetch" onClick={handleFetchImages} disabled={fetching}>{fetching ? '⏳ Fetching…' : '📥 Fetch Images'}</button>
        </div>
      </div>

      {hasCategorized ? (
        <div className="img-grid-3x3">
          {renderRow('Venue', '🏢', venueImgs)}
          {renderRow('Event', '🎫', eventImgs)}
          {renderRow('Activity', '🎨', activityImgs)}
          {otherImgs.length > 0 && renderRow('Other', '📷', otherImgs)}
        </div>
      ) : candidates.length > 0 ? (
        <div className="img-gal-scroll">
          {candidates.map(c => (
            <div key={c.id} className={`img-thumb ${c.selected ? 'img-thumb--sel' : ''}`} onClick={() => onSelectImage?.(c)}>
              <img src={c.url} alt="" loading="lazy" />
              {c.selected && <div className="img-check">✓</div>}
            </div>
          ))}
        </div>
      ) : <div className="img-gal-empty">No images — click Fetch Images to load venue, event, and AI-generated options</div>}
    </div>
  );
}

/* ── Crop Modal ── */

function CropModal({ candidate, onSelect, onClose }) {
  const [dragState, setDragState] = useState(null);
  const [offsetX, setOffsetX] = useState(50);
  const imgRef = useRef(null);
  const boxRef = useRef(null);

  function handlePointerDown(e) {
    e.preventDefault();
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return;
    setDragState({ startX: e.clientX, startOffset: offsetX, boxWidth: box.width });
    boxRef.current?.setPointerCapture(e.pointerId);
  }
  function handlePointerMove(e) {
    if (!dragState) return;
    const img = imgRef.current;
    if (!img || !img.naturalWidth) return;
    const aspectBox = 0.5;
    const imgAspect = img.naturalWidth / img.naturalHeight;
    if (imgAspect <= aspectBox) return;
    const visibleFraction = aspectBox / imgAspect;
    const maxPan = ((1 - visibleFraction) / 2) * 100;
    const dx = e.clientX - dragState.startX;
    const pxToPercent = (dx / dragState.boxWidth) * 100 * (imgAspect / aspectBox);
    setOffsetX(Math.max(50 - maxPan, Math.min(50 + maxPan, dragState.startOffset - pxToPercent)));
  }
  function handlePointerUp() { setDragState(null); }

  return (
    <div className="crop-backdrop" onClick={onClose}>
      <div className="crop-modal" onClick={e => e.stopPropagation()}>
        <button className="crop-close" onClick={onClose}>×</button>
        <div className="crop-title">Position Image (1:2 Portrait)</div>
        <div className="crop-hint">Drag left/right to set crop center</div>
        <div className="crop-preview-wrap" ref={boxRef} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} style={{ cursor: dragState ? 'grabbing' : 'grab' }}>
          <div className="crop-aspect-box"><img ref={imgRef} src={candidate.url} alt="" draggable={false} style={{ objectPosition: `${offsetX}% 50%` }} /></div>
        </div>
        <div className="crop-actions">
          <button className="crop-btn crop-btn--cancel" onClick={onClose}>Cancel</button>
          <button className="crop-btn crop-btn--confirm" onClick={() => onSelect(candidate.id, Math.round(offsetX))}>✓ Select</button>
        </div>
      </div>
    </div>
  );
}

/* ── Queue Item ── */

function QueueItem({ event, active, onClick }) {
  const asset = event.latestAsset;
  return (
    <div className={`qi ${active ? 'qi--active' : ''}`} onClick={onClick}>
      <div className="qi-title">{event.title}</div>
      <div className="qi-meta">
        <ModeTag mode={event.mode} />
        <StatusBadge status={event.status} />
        {asset && <AssetStateBadge asset={asset} />}
      </div>
      <div className="qi-sub">{[event.venue, event.city].filter(Boolean).join(' · ')}</div>
    </div>
  );
}

/* ── Edit Panel ── */

function EditPanel({ event, onUpdate, onAction }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState(null);
  const [error, setError] = useState(null);
  const [cropCandidate, setCropCandidate] = useState(null);

  // Reset form when event changes
  useEffect(() => {
    if (event) setForm({
      title: event.title || '', venue: event.venue || '', city: event.city || '',
      date: event.date || '', startTime: event.startTime || '', endTime: event.endTime || '',
      mode: event.mode || 'day', description: event.description || '',
    });
  }, [event?.id]);

  if (!event) return <div className="ep-empty">← Select an event from the queue</div>;

  const asset = event.latestAsset;
  const selectedImage = event.selectedImageCandidate?.url || event.imageCandidates?.find(c => c.selected)?.url;

  function field(key, label, opts = {}) {
    const Tag = opts.textarea ? 'textarea' : opts.select ? 'select' : 'input';
    return (
      <div className="ep-field">
        <label>{label}</label>
        {opts.select ? (
          <select value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}>
            <option value="day">☀️ Day</option>
            <option value="night">🌙 Night</option>
            <option value="family">👨‍👩‍👧 Family</option>
            <option value="grownup">☀️ Grown-up</option>
          </select>
        ) : (
          <Tag value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} rows={opts.textarea ? 3 : undefined} />
        )}
      </div>
    );
  }

  async function save() {
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Save failed');
      onUpdate?.();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function doAction(action) {
    setActing(action); setError(null);
    try {
      if (action === 'fetch-images') {
        const res = await fetch(`/api/events/${event.id}/find-images`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ offset: (event.imageCandidates?.length || 0), limit: 5 }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      } else if (action === 'build-card') {
        const res = await fetch('/api/assets/generate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId: event.id }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      } else if (action === 'animate') {
        const res = await fetch('/api/assets/generate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId: event.id, regenerate: true }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      } else if (action === 'approve') {
        const res = await fetch(`/api/events/${event.id}/review`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'approve', stage: 2, reviewedBy: 'admin' }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      } else if (action === 'reject') {
        const res = await fetch(`/api/events/${event.id}/review`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reject', stage: 2, reviewedBy: 'admin' }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      }
      onUpdate?.();
    } catch (err) { setError(err.message); }
    finally { setActing(null); }
  }

  async function handleSelectImage(candidate) {
    setCropCandidate(candidate);
  }

  async function confirmSelectImage(candidateId, cropOffsetX) {
    try {
      const res = await fetch(`/api/events/${event.id}/select-image`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, cropOffsetX }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setCropCandidate(null);
      onUpdate?.();
    } catch (err) { alert('Select failed: ' + err.message); }
  }

  const isDone = event.status === 'approved_2' || event.status === 'rejected';

  return (
    <div className="ep">
      <div className="ep-split">
        {/* Left: preview + gallery */}
        <div className="ep-left">
          <div className="ep-preview">
            {asset?.animationUrl ? (
              <video className="ep-preview-media" src={asset.animationUrl} poster={asset.portraitUrl} muted playsInline loop controls />
            ) : selectedImage ? (
              <img className="ep-preview-media" src={selectedImage} alt="" />
            ) : asset?.portraitUrl ? (
              <img className="ep-preview-media" src={asset.portraitUrl} alt="" />
            ) : (
              <div className="ep-preview-empty">No image selected</div>
            )}
          </div>
          <ImageGallery event={event} onUpdate={onUpdate} onSelectImage={handleSelectImage} />
        </div>

        {/* Right: metadata + actions */}
        <div className="ep-right">
          <div className="ep-form">
            {field('title', 'Title')}
            <div className="ep-row">
              {field('venue', 'Venue')}
              {field('city', 'City')}
            </div>
            <div className="ep-row">
              {field('date', 'Date')}
              {field('startTime', 'Start')}
              {field('endTime', 'End')}
            </div>
            {field('mode', 'Mode', { select: true })}
            {field('description', 'Description', { textarea: true })}
          </div>

          <button className="ep-save" onClick={save} disabled={saving}>{saving ? 'Saving…' : '💾 Save Metadata'}</button>

          {error && <div className="ep-error">⚠ {error}</div>}

          <div className="ep-actions">
            <button className="ep-btn ep-btn--build" disabled={!!acting} onClick={() => doAction('build-card')}>{acting === 'build-card' ? '…' : '🎨 Build Card'}</button>
            <button className="ep-btn ep-btn--animate" disabled={!!acting || !asset} onClick={() => doAction('animate')}>{acting === 'animate' ? '…' : '🎬 Animate'}</button>
          </div>
          <div className="ep-actions">
            <button className="ep-btn ep-btn--approve" disabled={!!acting || isDone} onClick={() => doAction('approve')}>{acting === 'approve' ? '…' : '✓ Approve Card'}</button>
            <button className="ep-btn ep-btn--reject" disabled={!!acting || isDone} onClick={() => doAction('reject')}>{acting === 'reject' ? '…' : '✗ Reject'}</button>
          </div>
        </div>
      </div>

      {cropCandidate && <CropModal candidate={cropCandidate} onSelect={confirmSelectImage} onClose={() => setCropCandidate(null)} />}
    </div>
  );
}

/* ── Main Page ── */

export default function AssetsPage() {
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeId, setActiveId] = useState(null);

  async function loadEvents() {
    const res = await fetch('/api/events?all=1');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Failed');
    setAllEvents(data.events ?? []);
  }

  useEffect(() => {
    loadEvents().catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const queue = useMemo(() => allEvents.filter(e => ['approved_1', 'approved_2', 'published'].includes(e.status)), [allEvents]);
  const activeEvent = queue.find(e => e.id === activeId) || null;

  // Auto-select first item
  useEffect(() => {
    if (!activeId && queue.length > 0) setActiveId(queue[0].id);
  }, [queue.length]);

  return (
    <main className="admin-shell">
      <div className="admin-wrap">
        <header className="adash-header">
          <div className="adash-brand"><span className="adash-brand-ok">OK</span><br />LET&apos;S GO<br />/ ADMIN</div>
          <div className="adash-header-right">
            <span className="admin-pill">asset studio</span>
            <form method="POST" action="/api/admin/logout"><button type="submit" className="logout-btn">Logout</button></form>
          </div>
        </header>
        <AdminNav />

        {loading && <div className="ep-empty">⏳ Loading…</div>}
        {error && <div className="ep-empty">⚠️ {error}</div>}

        {!loading && !error && (
          <div className="assets-layout">
            {/* Sidebar queue */}
            <div className="queue">
              <div className="queue-head">Queue ({queue.length})</div>
              {queue.length === 0 && <div className="queue-empty">No events in asset lane</div>}
              {queue.map(e => (
                <QueueItem key={e.id} event={e} active={e.id === activeId} onClick={() => setActiveId(e.id)} />
              ))}
            </div>

            {/* Edit panel */}
            <EditPanel event={activeEvent} onUpdate={loadEvents} />
          </div>
        )}
      </div>

      <style>{`
        .adash-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px}
        .adash-brand{font-size:36px;line-height:.9;font-weight:800;letter-spacing:-.05em;color:#fff}
        .adash-brand-ok{color:var(--accent)}
        .adash-header-right{display:flex;align-items:flex-start;padding-top:4px}

        /* Layout */
        .assets-layout{display:flex;gap:16px;min-height:70vh}

        /* Queue sidebar */
        .queue{width:260px;flex-shrink:0;overflow-y:auto;max-height:80vh;border:1px solid var(--border);border-radius:12px;background:var(--panel)}
        .queue-head{padding:12px 14px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--panel);z-index:1}
        .queue-empty{padding:24px 14px;font-size:13px;color:var(--muted);text-align:center}
        .qi{padding:10px 14px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .12s;border-left:3px solid transparent}
        .qi:hover{background:rgba(255,255,255,.04)}
        .qi--active{background:rgba(78,205,196,.06);border-left-color:var(--accent)}
        .qi-title{font-size:14px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:4px}
        .qi-meta{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:2px}
        .qi-sub{font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

        /* Badges */
        .sbadge,.ab,.mode-tag{font-size:10px;font-weight:700;padding:2px 6px;border-radius:999px;border:1px solid;text-transform:uppercase;letter-spacing:.05em}
        .sbadge--candidate{color:#94a3b8;border-color:rgba(148,163,184,.3);background:rgba(148,163,184,.08)}
        .sbadge--approved1{color:#4ecdc4;border-color:rgba(78,205,196,.35);background:rgba(78,205,196,.1)}
        .sbadge--approved2{color:#22d3ee;border-color:rgba(34,211,238,.35);background:rgba(34,211,238,.1)}
        .sbadge--rejected{color:#f87171;border-color:rgba(248,113,113,.3);background:rgba(248,113,113,.08)}
        .sbadge--deferred{color:#f59e0b;border-color:rgba(245,158,11,.3);background:rgba(245,158,11,.08)}
        .sbadge--published{color:#a3e635;border-color:rgba(163,230,53,.3);background:rgba(163,230,53,.08)}
        .ab--missing{color:#94a3b8;border-color:rgba(148,163,184,.3);background:rgba(148,163,184,.08)}
        .ab--pending{color:#f59e0b;border-color:rgba(245,158,11,.3);background:rgba(245,158,11,.08)}
        .ab--processing{color:#c084fc;border-color:rgba(192,132,252,.3);background:rgba(192,132,252,.08)}
        .ab--ready{color:#22d3ee;border-color:rgba(34,211,238,.35);background:rgba(34,211,238,.1)}
        .ab--partial{color:#fb7185;border-color:rgba(251,113,133,.3);background:rgba(251,113,133,.08)}
        .ab--failed{color:#f87171;border-color:rgba(248,113,113,.3);background:rgba(248,113,113,.08)}
        .mode-tag{text-transform:lowercase}
        .mode--night{color:#a78bfa;border-color:rgba(167,139,250,.35);background:rgba(167,139,250,.08)}
        .mode--day{color:#f59e0b;border-color:rgba(245,158,11,.35);background:rgba(245,158,11,.08)}

        /* Edit panel */
        .ep{flex:1;min-width:0}
        .ep-empty{flex:1;display:flex;align-items:center;justify-content:center;font-size:16px;color:var(--muted);min-height:400px}
        .ep-split{display:flex;gap:20px}
        .ep-left{width:280px;flex-shrink:0}
        .ep-right{flex:1;min-width:0}

        /* Preview */
        .ep-preview{aspect-ratio:1/2;border-radius:12px;overflow:hidden;background:#0f1323;border:1px solid var(--border);margin-bottom:12px}
        .ep-preview-media{width:100%;height:100%;object-fit:cover}
        .ep-preview-empty{width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.3);font-size:14px}

        /* Form */
        .ep-form{display:flex;flex-direction:column;gap:10px;margin-bottom:12px}
        .ep-row{display:flex;gap:10px}
        .ep-row>.ep-field{flex:1}
        .ep-field{display:flex;flex-direction:column;gap:3px}
        .ep-field label{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:600}
        .ep-field input,.ep-field select,.ep-field textarea{background:#1e1e2e;color:var(--text);border:1px solid var(--border);border-radius:8px;padding:8px 10px;font-size:13px;font-family:inherit;resize:vertical}
        .ep-field input:focus,.ep-field select:focus,.ep-field textarea:focus{outline:none;border-color:var(--accent)}

        .ep-save{width:100%;padding:8px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid rgba(78,205,196,.35);background:rgba(78,205,196,.08);color:#4ecdc4;margin-bottom:10px}
        .ep-save:hover:not(:disabled){background:rgba(78,205,196,.15)}
        .ep-save:disabled{opacity:.5;cursor:default}

        .ep-error{margin-bottom:10px;font-size:12px;color:#f87171;background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.2);border-radius:6px;padding:6px 8px}

        /* Action buttons */
        .ep-actions{display:flex;gap:8px;margin-bottom:8px}
        .ep-btn{flex:1;padding:9px 8px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid;background:transparent;transition:background .15s}
        .ep-btn:disabled{opacity:.35;cursor:default}
        .ep-btn--fetch{color:#60a5fa;border-color:rgba(96,165,250,.35)}
        .ep-btn--fetch:hover:not(:disabled){background:rgba(96,165,250,.1)}
        .ep-btn--build{color:#4ecdc4;border-color:rgba(78,205,196,.35)}
        .ep-btn--build:hover:not(:disabled){background:rgba(78,205,196,.1)}
        .ep-btn--animate{color:#c084fc;border-color:rgba(192,132,252,.35)}
        .ep-btn--animate:hover:not(:disabled){background:rgba(192,132,252,.1)}
        .ep-btn--approve{color:var(--accent);border-color:rgba(78,205,196,.35)}
        .ep-btn--approve:hover:not(:disabled){background:rgba(78,205,196,.1)}
        .ep-btn--reject{color:#f87171;border-color:rgba(248,113,113,.35)}
        .ep-btn--reject:hover:not(:disabled){background:rgba(248,113,113,.1)}

        /* Image gallery */
        .img-gal{margin-top:4px}
        .img-gal-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
        .img-gal-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
        .img-gal-acts{display:flex;gap:5px}
        .img-gal-btn{font-size:10px;font-weight:600;padding:3px 8px;border-radius:5px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:var(--text);cursor:pointer}
        .img-gal-btn:hover{background:rgba(255,255,255,.08)}
        .img-gal-btn:disabled{opacity:.4}
        .img-gal-scroll{display:flex;gap:6px;overflow-x:auto;padding:2px 0 6px;scrollbar-width:thin}
        .img-thumb{position:relative;flex-shrink:0;width:52px;height:104px;border-radius:6px;overflow:hidden;cursor:pointer;border:2px solid transparent;transition:border-color .12s}
        .img-thumb:hover{border-color:rgba(78,205,196,.4)}
        .img-thumb--sel{border-color:var(--accent);box-shadow:0 0 6px rgba(78,205,196,.3)}
        .img-thumb img{width:100%;height:100%;object-fit:cover}
        .img-check{position:absolute;top:2px;right:2px;width:14px;height:14px;border-radius:50%;background:var(--accent);color:#000;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center}
        .img-gal-empty{font-size:11px;color:var(--muted);padding:10px;text-align:center;border:1px dashed rgba(255,255,255,.1);border-radius:6px}
        .img-gal-btn--fetch{background:rgba(96,165,250,.1);border-color:rgba(96,165,250,.3);color:#60a5fa}
        .img-grid-3x3{display:flex;flex-direction:column;gap:8px}
        .img-cat{}
        .img-cat-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:4px}
        .img-cat-row{display:flex;gap:6px;flex-wrap:wrap}
        .img-cat-empty{font-size:11px;color:rgba(255,255,255,.2);font-style:italic}

        /* Crop modal */
        .crop-backdrop{position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center}
        .crop-modal{background:var(--panel);border:1px solid var(--border);border-radius:16px;padding:20px;max-width:420px;width:90%;position:relative}
        .crop-close{position:absolute;top:10px;right:10px;width:28px;height:28px;border-radius:50%;border:none;background:rgba(255,255,255,.08);color:var(--muted);font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center}
        .crop-close:hover{color:#fff;background:rgba(255,255,255,.15)}
        .crop-title{font-size:16px;font-weight:700;margin-bottom:4px}
        .crop-hint{font-size:12px;color:var(--muted);margin-bottom:14px}
        .crop-preview-wrap{display:flex;justify-content:center;margin-bottom:14px}
        .crop-aspect-box{width:200px;aspect-ratio:1/2;border-radius:10px;overflow:hidden;border:2px solid var(--accent)}
        .crop-aspect-box img{width:100%;height:100%;object-fit:cover}
        .crop-actions{display:flex;gap:8px}
        .crop-btn{flex:1;padding:10px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid}
        .crop-btn--cancel{color:var(--muted);border-color:rgba(255,255,255,.12);background:transparent}
        .crop-btn--confirm{color:#000;border-color:var(--accent);background:var(--accent)}

        /* Mobile */
        @media(max-width:768px){
          .assets-layout{flex-direction:column}
          .queue{width:100%;max-height:200px}
          .ep-split{flex-direction:column}
          .ep-left{width:100%}
          .ep-preview{max-height:400px}
          .adash-brand{font-size:26px}
        }
      `}</style>
    </main>
  );
}
