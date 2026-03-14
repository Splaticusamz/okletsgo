'use client';

import { useState } from 'react';
import Link from 'next/link';

const initialForm = {
  title: '',
  date: '',
  startTime: '',
  endTime: '',
  venue: '',
  city: 'Kelowna',
  description: '',
  mode: 'day',
};

export default function ManualPage() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setCreated(null);
    try {
      const res = await fetch('/api/events/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Create failed');
      setCreated(data.event);
      setForm(initialForm);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="admin-shell">
      <div className="admin-wrap">
        <header className="adash-header">
          <div className="adash-brand"><span className="adash-brand-ok">OK</span><br />LET&apos;S GO<br />/ ADMIN</div>
          <div className="adash-header-right"><span className="admin-pill">manual intake</span></div>
        </header>

        <nav className="adash-nav">
          <Link href="/admin" className="adash-nav-link">Dashboard</Link>
          <Link href="/admin/candidates" className="adash-nav-link adash-nav-link--dim">Candidates</Link>
          <Link href="/admin/assets" className="adash-nav-link adash-nav-link--dim">Assets</Link>
          <Link href="/admin/sources" className="adash-nav-link adash-nav-link--dim">Sources</Link>
          <Link href="/admin/manual" className="adash-nav-link adash-nav-link--active">Manual</Link>
          <Link href="/admin/publish" className="adash-nav-link adash-nav-link--dim">Publish</Link>
          <Link href="/tasks" className="adash-nav-link">Tasks</Link>
        </nav>

        <section className="manual-panel">
          <div className="eyebrow">Candidate intake</div>
          <h1 className="page-title">Manual event entry</h1>
          <div className="panel-sub">Add a candidate event directly into the review queue with source preset to manual.</div>

          {error && <div className="error-banner">⚠ {error}</div>}
          {created && (
            <div className="success-banner">✓ {created.title} saved as a candidate. <Link href="/admin/candidates">Open candidates →</Link></div>
          )}

          <form className="manual-form" onSubmit={onSubmit}>
            <div className="grid">
              <label><span>Title</span><input value={form.title} onChange={(e) => update('title', e.target.value)} required /></label>
              <label><span>Date</span><input type="date" value={form.date} onChange={(e) => update('date', e.target.value)} required /></label>
              <label><span>Start time</span><input type="time" value={form.startTime} onChange={(e) => update('startTime', e.target.value)} /></label>
              <label><span>End time</span><input type="time" value={form.endTime} onChange={(e) => update('endTime', e.target.value)} /></label>
              <label><span>Venue</span><input value={form.venue} onChange={(e) => update('venue', e.target.value)} required /></label>
              <label><span>City</span><input value={form.city} onChange={(e) => update('city', e.target.value)} required /></label>
              <label><span>Mode</span>
                <select value={form.mode} onChange={(e) => update('mode', e.target.value)}>
                  <option value="day">day</option>
                  <option value="night">night</option>
                </select>
              </label>
              <label><span>Source</span><input value="manual" disabled /></label>
            </div>
            <label className="full"><span>Description</span><textarea rows={6} value={form.description} onChange={(e) => update('description', e.target.value)} /></label>
            <div className="actions">
              <button className="primary-btn" disabled={submitting}>{submitting ? 'Saving…' : 'Create candidate'}</button>
              <Link href="/admin/candidates" className="ghost-btn">View candidates</Link>
            </div>
          </form>
        </section>
      </div>

      <style>{`
        .adash-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px}.adash-brand{font-size:36px;line-height:.9;font-weight:800;letter-spacing:-.05em;color:#fff}.adash-brand-ok{color:var(--accent)}.adash-header-right{display:flex;align-items:flex-start;padding-top:4px}.adash-nav{display:flex;gap:4px;margin-bottom:24px;border-bottom:1px solid var(--border);padding-bottom:16px;overflow:auto;flex-wrap:wrap}.adash-nav-link{padding:7px 14px;border-radius:8px;font-size:14px;font-weight:500;color:var(--text);text-decoration:none;border:1px solid var(--border)}.adash-nav-link--active{background:rgba(78,205,196,.12);border-color:rgba(78,205,196,.35);color:var(--accent)}.adash-nav-link--dim{color:var(--muted)}
        .manual-panel{background:var(--panel);border:1px solid var(--border);border-radius:16px;padding:20px 24px}.eyebrow{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:4px}.page-title{font-size:28px;color:var(--text);margin:0}.panel-sub{color:var(--muted);margin-top:8px;font-size:14px}.manual-form{margin-top:18px;display:flex;flex-direction:column;gap:16px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}label{display:flex;flex-direction:column;gap:6px;color:var(--muted);font-size:13px}input,select,textarea{width:100%;border-radius:10px;border:1px solid var(--border);background:#080b1a;color:var(--text);padding:12px 14px;font:inherit}textarea{resize:vertical}.full{grid-column:1/-1}.actions{display:flex;gap:10px;flex-wrap:wrap}.primary-btn,.ghost-btn{border-radius:10px;padding:10px 14px;border:1px solid var(--border);background:transparent;color:var(--text);cursor:pointer;text-decoration:none;font:inherit}.primary-btn{background:var(--accent);border-color:var(--accent);color:#07121a;font-weight:700}.primary-btn:disabled{opacity:.5;cursor:not-allowed}.error-banner,.success-banner{margin-top:16px;padding:12px 14px;border-radius:10px}.error-banner{color:#fecaca;background:rgba(127,29,29,.18);border:1px solid rgba(248,113,113,.25)}.success-banner{color:#bbf7d0;background:rgba(20,83,45,.25);border:1px solid rgba(74,222,128,.2)}.success-banner a{color:#fff}
        @media (max-width: 640px){.adash-brand{font-size:26px}.grid{grid-template-columns:1fr}.page-title{font-size:22px}}
      `}</style>
    </main>
  );
}
