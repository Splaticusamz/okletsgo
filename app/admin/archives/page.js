'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminNav from '../../../components/AdminNav';

function ModeTag({ mode }) {
  const isNight = mode === 'night';
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
      background: isNight ? '#312e81' : '#fef3c7', color: isNight ? '#c4b5fd' : '#92400e',
    }}>
      {isNight ? '🌙 night' : '☀️ day'}
    </span>
  );
}

function EventCard({ event, onReuse, reusing }) {
  return (
    <div style={{
      background: '#1e1e2e', border: '1px solid #333', borderRadius: 10, padding: 16, marginBottom: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#e2e8f0', marginBottom: 4 }}>{event.title}</div>
          <div style={{ fontSize: 13, color: '#94a3b8' }}>
            {event.date} {event.startTime && `· ${event.startTime}`} · {event.venue || 'No venue'} · {event.city || ''}
          </div>
          {event.tags?.length > 0 && (
            <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {event.tags.map((t) => (
                <span key={t} style={{ fontSize: 11, color: '#818cf8', background: '#1e1b4b', padding: '1px 6px', borderRadius: 8 }}>#{t}</span>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <ModeTag mode={event.mode} />
          {onReuse && (
            <button
              onClick={() => onReuse(event)}
              disabled={reusing}
              style={{
                fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid #4f46e5',
                background: reusing ? '#333' : '#312e81', color: '#c4b5fd', cursor: reusing ? 'not-allowed' : 'pointer',
              }}
            >
              {reusing ? 'Adding...' : '♻️ Reuse'}
            </button>
          )}
        </div>
      </div>
      {event.description && (
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 8, lineHeight: 1.4 }}>
          {event.description.slice(0, 150)}{event.description.length > 150 ? '...' : ''}
        </div>
      )}
    </div>
  );
}

function DiffSection({ title, events, color, onReuse, reusingId }) {
  if (!events || events.length === 0) return null;
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ color, fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{title} ({events.length})</h3>
      {events.map((e) => (
        <EventCard key={e.id} event={e} onReuse={onReuse} reusing={reusingId === e.id} />
      ))}
    </div>
  );
}

export default function ArchivesPage() {
  const [archives, setArchives] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [weekData, setWeekData] = useState(null);
  const [compareA, setCompareA] = useState('');
  const [compareB, setCompareB] = useState('');
  const [diff, setDiff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reusingId, setReusingId] = useState(null);
  const [reusedIds, setReusedIds] = useState(new Set());
  const [toast, setToast] = useState('');

  useEffect(() => { loadArchives(); }, []);

  async function loadArchives() {
    setLoading(true);
    try {
      const res = await fetch('/api/archives');
      const data = await res.json();
      setArchives(data.archives || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  async function loadWeek(weekLabel) {
    setSelectedWeek(weekLabel);
    setWeekData(null);
    setDiff(null);
    try {
      const res = await fetch(`/api/archives?week=${weekLabel}`);
      const data = await res.json();
      setWeekData(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function runCompare() {
    if (!compareA || !compareB || compareA === compareB) return;
    setDiff(null);
    setSelectedWeek(null);
    setWeekData(null);
    try {
      const res = await fetch(`/api/archives?compareA=${compareA}&compareB=${compareB}`);
      const data = await res.json();
      setDiff(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleReuse(event) {
    setReusingId(event.id);
    try {
      const res = await fetch('/api/archives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reuse', event }),
      });
      if (res.ok) {
        setReusedIds((prev) => new Set([...prev, event.id]));
        setToast(`✅ "${event.title}" added to candidates`);
        setTimeout(() => setToast(''), 3000);
      }
    } catch (err) {
      console.error(err);
    }
    setReusingId(null);
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0f0f1a', color: '#e2e8f0',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>

        <AdminNav />

        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>📦 Week Archives</h1>
        <p style={{ color: '#64748b', fontSize: 13, marginBottom: 24 }}>
          Snapshots of published weeks. Browse, compare, and reuse events.
        </p>

        {toast && (
          <div style={{
            position: 'fixed', top: 16, right: 16, background: '#065f46', color: '#d1fae5',
            padding: '10px 16px', borderRadius: 8, fontSize: 13, zIndex: 999,
          }}>{toast}</div>
        )}

        {/* Archive list */}
        {loading ? (
          <p style={{ color: '#64748b' }}>Loading archives...</p>
        ) : archives.length === 0 ? (
          <div style={{ background: '#1e1e2e', border: '1px solid #333', borderRadius: 10, padding: 24, textAlign: 'center' }}>
            <p style={{ color: '#64748b', fontSize: 14 }}>No archives yet. Archives are created automatically when you publish a batch.</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 10, marginBottom: 24 }}>
              {archives.map((a) => (
                <button
                  key={a.weekLabel}
                  onClick={() => loadWeek(a.weekLabel)}
                  style={{
                    background: selectedWeek === a.weekLabel ? '#312e81' : '#1e1e2e',
                    border: `1px solid ${selectedWeek === a.weekLabel ? '#4f46e5' : '#333'}`,
                    borderRadius: 10, padding: 14, cursor: 'pointer', textAlign: 'left', color: '#e2e8f0',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Week of {a.weekLabel}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                    {a.eventCount} events · Published {new Date(a.publishedAt).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>

            {/* Compare section */}
            {archives.length >= 2 && (
              <div style={{ background: '#1e1e2e', border: '1px solid #333', borderRadius: 10, padding: 16, marginBottom: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>🔍 Compare Weeks</h3>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <select value={compareA} onChange={(e) => setCompareA(e.target.value)} style={selectStyle}>
                    <option value="">Week A...</option>
                    {archives.map((a) => <option key={a.weekLabel} value={a.weekLabel}>{a.weekLabel}</option>)}
                  </select>
                  <span style={{ color: '#64748b' }}>vs</span>
                  <select value={compareB} onChange={(e) => setCompareB(e.target.value)} style={selectStyle}>
                    <option value="">Week B...</option>
                    {archives.map((a) => <option key={a.weekLabel} value={a.weekLabel}>{a.weekLabel}</option>)}
                  </select>
                  <button
                    onClick={runCompare}
                    disabled={!compareA || !compareB || compareA === compareB}
                    style={{
                      padding: '6px 14px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 600,
                      background: compareA && compareB && compareA !== compareB ? '#4f46e5' : '#333',
                      color: '#e2e8f0', cursor: compareA && compareB && compareA !== compareB ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Compare
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Week detail view */}
        {weekData && (
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>
              Week of {weekData.weekLabel} — {weekData.events?.length || 0} events
            </h2>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
              Published {new Date(weekData.publishedAt).toLocaleString()} · Batch {weekData.batchId}
            </p>
            {(weekData.events || []).map((e) => (
              <EventCard
                key={e.id}
                event={e}
                onReuse={reusedIds.has(e.id) ? null : handleReuse}
                reusing={reusingId === e.id}
              />
            ))}
          </div>
        )}

        {/* Diff view */}
        {diff && (
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 14 }}>
              Diff: {diff.weekA} → {diff.weekB}
            </h2>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
              <span style={{ background: '#065f46', color: '#d1fae5', padding: '3px 10px', borderRadius: 6, fontSize: 12 }}>
                +{diff.summary.addedCount} added
              </span>
              <span style={{ background: '#7f1d1d', color: '#fecaca', padding: '3px 10px', borderRadius: 6, fontSize: 12 }}>
                −{diff.summary.removedCount} removed
              </span>
              <span style={{ background: '#1e1b4b', color: '#c4b5fd', padding: '3px 10px', borderRadius: 6, fontSize: 12 }}>
                ={diff.summary.keptCount} kept
              </span>
            </div>
            <DiffSection title="Added" events={diff.added} color="#34d399" onReuse={handleReuse} reusingId={reusingId} />
            <DiffSection title="Removed" events={diff.removed} color="#f87171" onReuse={handleReuse} reusingId={reusingId} />
            <DiffSection title="Kept" events={diff.kept} color="#818cf8" />
          </div>
        )}
      </div>
    </div>
  );
}

const selectStyle = {
  background: '#0f0f1a', color: '#e2e8f0', border: '1px solid #333',
  borderRadius: 6, padding: '6px 10px', fontSize: 13,
};
