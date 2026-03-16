'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import AdminNav from '../../../components/AdminNav';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MODES = ['family', 'grownup', 'night'];
const MODE_LABELS = { family: '👨‍👩‍👧 Family', grownup: '☀️ Grown-up', night: '🌙 Night' };
const TOTAL_SLOTS = DAYS.length * MODES.length; // 21

function ModeTag({ mode }) {
  const cls = mode === 'night' ? 'mt--night' : 'mt--day';
  const icon = mode === 'night' ? '🌙' : mode === 'family' ? '👨‍👩‍👧' : '☀️';
  return <span className={`mt ${cls}`}>{icon} {mode}</span>;
}

/* ── Calendar Slot ── */
function CalendarSlot({ day, mode, event, onDrop, onRemove, disabled, onDragStart: onDragStartCb }) {
  const [over, setOver] = useState(false);

  function handleDragOver(e) {
    if (disabled) return;
    e.preventDefault();
    setOver(true);
  }
  function handleDragLeave() { setOver(false); }
  function handleDrop(e) {
    e.preventDefault(); setOver(false);
    if (disabled) return;
    const eventId = e.dataTransfer.getData('text/plain');
    const fromSlot = e.dataTransfer.getData('application/x-from-slot') || null;
    if (eventId) onDrop(day, mode, eventId, fromSlot);
  }

  return (
    <div
      className={`cs ${over ? 'cs--over' : ''} ${event ? 'cs--filled' : ''} ${disabled ? 'cs--disabled' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {event ? (
        <div className="cs-card" draggable onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', event.id);
          e.dataTransfer.setData('application/x-event-mode', event.mode);
          e.dataTransfer.setData('application/x-from-slot', `${day}:${mode}`);
          e.dataTransfer.effectAllowed = 'move';
          onDragStartCb?.(event.mode);
        }}>
          {event.selectedImageCandidate?.url || event.imageCandidates?.[0]?.url ? (
            <img className="cs-img" src={event.selectedImageCandidate?.url || event.imageCandidates[0].url} alt="" />
          ) : event.latestAsset?.portraitUrl ? (
            <img className="cs-img" src={event.latestAsset.portraitUrl} alt="" />
          ) : null}
          <div className="cs-info">
            <div className="cs-title">{event.title}</div>
            <div className="cs-venue">{event.venue}</div>
          </div>
          <button className="cs-remove" onClick={() => onRemove(day, mode)} title="Remove">×</button>
        </div>
      ) : (
        <div className="cs-empty">Drop here</div>
      )}
    </div>
  );
}

/* ── Draggable Event Card ── */
function DraggableEvent({ event, onDragStart: onDragStartCb }) {
  function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', event.id);
    e.dataTransfer.setData('application/x-event-mode', event.mode);
    e.dataTransfer.effectAllowed = 'move';
    onDragStartCb?.(event.mode);
  }

  return (
    <div className="de" draggable onDragStart={handleDragStart}>
      <div className="de-title">{event.title}</div>
      <div className="de-meta">
        <ModeTag mode={event.mode} />
        <span className="de-city">{event.city}</span>
      </div>
    </div>
  );
}

/* ── Progress Bar ── */
function ProgressBar({ filled, total }) {
  const pct = Math.round((filled / total) * 100);
  return (
    <div className="pb">
      <div className="pb-bar"><div className="pb-fill" style={{ width: `${pct}%` }} /></div>
      <span className="pb-text">{filled}/{total} slots filled ({pct}%)</span>
    </div>
  );
}

/* ── Week helpers ── */
function getMonday(d) {
  const date = new Date(d);
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - ((day + 6) % 7));
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function addWeeks(d, n) {
  const date = new Date(d);
  date.setUTCDate(date.getUTCDate() + n * 7);
  return date;
}

function formatDateRange(monday) {
  const sun = new Date(monday);
  sun.setUTCDate(sun.getUTCDate() + 6);
  const opts = { month: 'short', day: 'numeric', timeZone: 'UTC' };
  const mStr = monday.toLocaleDateString('en-US', opts);
  const sStr = sun.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
  return `${mStr} – ${sStr}`;
}

function weekLabel(monday) {
  return monday.toISOString().slice(0, 10);
}

function isCurrentWeek(monday) {
  const now = getMonday(new Date());
  return weekLabel(monday) === weekLabel(now);
}

/* ── Main Page ── */
export default function PublishPage() {
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assignments, setAssignments] = useState({}); // { "MONDAY:family": eventId }
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState(null);
  const [weekMonday, setWeekMonday] = useState(() => getMonday(new Date()));
  const [draggingMode, setDraggingMode] = useState(null);
  const draggingModeRef = useRef(null);

  function prevWeek() { setWeekMonday(m => addWeeks(m, -1)); }
  function nextWeek() { setWeekMonday(m => addWeeks(m, 1)); }
  function goToday() { setWeekMonday(getMonday(new Date())); }

  const [activeWeekLabel, setActiveWeekLabel] = useState(null);

  async function loadEvents() {
    const res = await fetch('/api/events?all=1');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Failed');
    setAllEvents(data.events ?? []);

    // Load saved calendar assignments
    try {
      const aRes = await fetch('/api/calendar/assign');
      const aData = await aRes.json();
      if (aData.assignments) {
        setAssignments(aData.assignments);
        setSavedAssignments(aData.assignments);
      }
    } catch {}

    // Fetch published batch to determine active week
    try {
      const bRes = await fetch('/api/publish/batch');
      const bData = await bRes.json();
      if (bData.currentPublished?.weekLabel) {
        setActiveWeekLabel(bData.currentPublished.weekLabel);
      }
    } catch {}
  }

  useEffect(() => {
    loadEvents().catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function onDragEnd() { setDraggingMode(null); }
    document.addEventListener('dragend', onDragEnd);
    return () => document.removeEventListener('dragend', onDragEnd);
  }, []);

  // Track whether local assignments differ from saved (published) state
  const [savedAssignments, setSavedAssignments] = useState({});
  const hasUnsavedChanges = useMemo(() => {
    const keys = new Set([...Object.keys(assignments), ...Object.keys(savedAssignments)]);
    for (const k of keys) {
      if (assignments[k] !== savedAssignments[k]) return true;
    }
    return false;
  }, [assignments, savedAssignments]);

  // Compute dates for each day column of the current week view
  const weekDates = useMemo(() => {
    return DAYS.map((_, i) => {
      const d = new Date(weekMonday);
      d.setUTCDate(d.getUTCDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }, [weekMonday]);

  // Events eligible for the calendar: approved_2 for current week, published for past weeks
  const isCurrent = isCurrentWeek(weekMonday);
  const approved = useMemo(() => {
    if (isCurrent) {
      return allEvents.filter(e => e.status === 'approved_2');
    }
    // For non-current weeks, show published events whose dates fall in this week range
    return allEvents.filter(e => {
      if (!['published', 'approved_2'].includes(e.status)) return false;
      // Check if event date falls in this week
      const eDate = e.date;
      if (DAYS.includes(eDate)) return true; // legacy day-name dates
      return weekDates.includes(eDate);
    });
  }, [allEvents, isCurrent, weekDates]);

  // Events already assigned to slots
  const assignedIds = new Set(Object.values(assignments));
  const unassigned = approved.filter(e => !assignedIds.has(e.id));

  // Count filled slots
  const filledCount = Object.keys(assignments).length;

  function handleDrop(day, mode, eventId, fromSlot) {
    // Mode restriction: night events only in night slots
    const evt = allEvents.find(e => e.id === eventId);
    if (evt?.mode === 'night' && mode !== 'night') return;
    if (mode === 'night' && evt?.mode && evt.mode !== 'night') return;

    setAssignments(a => {
      const next = { ...a };
      // If dragged from another slot, clear that slot
      if (fromSlot) delete next[fromSlot];
      next[`${day}:${mode}`] = eventId;
      return next;
    });
    setDraggingMode(null);
  }

  function handleRemove(day, mode) {
    setAssignments(a => {
      const next = { ...a };
      delete next[`${day}:${mode}`];
      return next;
    });
  }

  function getEventForSlot(day, mode) {
    const id = assignments[`${day}:${mode}`];
    return id ? allEvents.find(e => e.id === id) ?? null : null;
  }

  async function handlePublish() {
    const slotCount = Object.keys(assignments).length;
    const confirmed = window.confirm(
      `Publish ${slotCount} event${slotCount !== 1 ? 's' : ''} to the homepage?\n\nThis will update okletsgo.ca immediately.`
    );
    if (!confirmed) return;

    setPublishing(true); setPublishError(null);
    try {
      // Save calendar assignments to DB — this is what the homepage reads
      const res = await fetch('/api/calendar/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Publish failed');

      setSavedAssignments({ ...assignments });
      await loadEvents();
    } catch (err) { setPublishError(err.message); }
    finally { setPublishing(false); }
  }

  return (
    <main className="admin-shell">
      <div className="admin-wrap">
        <header className="adash-header">
          <div className="adash-brand"><span className="adash-brand-ok">OK</span><br />LET&apos;S GO<br />/ ADMIN</div>
          <div className="adash-header-right">
            <span className="admin-pill">publish calendar</span>
            <form method="POST" action="/api/admin/logout"><button type="submit" className="logout-btn">Logout</button></form>
          </div>
        </header>
        <AdminNav />

        {loading && <div className="pub-empty">⏳ Loading…</div>}
        {error && <div className="pub-empty">⚠️ {error}</div>}

        {!loading && !error && (
          <>
            <div className="week-nav">
              <button className="week-nav-arrow week-nav-arrow--left" onClick={prevWeek}>‹</button>
              <div className="week-nav-center">
                <div className="week-nav-range">{formatDateRange(weekMonday)}</div>
                {!isCurrent && <button className="week-nav-today" onClick={goToday}>Today</button>}
                {isCurrent && <span className="week-nav-badge">This Week</span>}
                {activeWeekLabel === weekLabel(weekMonday) && <span className="week-nav-active">● Active</span>}
              </div>
              <button className="week-nav-arrow week-nav-arrow--right" onClick={nextWeek}>›</button>
            </div>

            <ProgressBar filled={filledCount} total={TOTAL_SLOTS} />

            <div className="pub-layout">
              {/* Calendar Grid */}
              <div className="cal">
                {/* Day headers */}
                <div className="cal-header">
                  <div className="cal-corner" />
                  {DAYS.map((d, i) => {
                    const dateStr = weekDates[i];
                    const dayNum = new Date(dateStr + 'T12:00:00Z').getUTCDate();
                    return <div key={d} className="cal-day-head">{DAY_SHORT[i]}<span className="cal-day-num">{dayNum}</span></div>;
                  })}
                </div>

                {/* Mode rows */}
                {MODES.map(mode => (
                  <div key={mode} className="cal-row">
                    <div className="cal-mode-head">{MODE_LABELS[mode]}</div>
                    {DAYS.map(day => {
                      // Night events can only go in night slots; non-night events can't go in night slots
                      const slotDisabled = draggingMode
                        ? (draggingMode === 'night' && mode !== 'night') || (draggingMode !== 'night' && mode === 'night')
                        : false;
                      return (
                        <CalendarSlot
                          key={`${day}:${mode}`}
                          day={day}
                          mode={mode}
                          event={getEventForSlot(day, mode)}
                          onDrop={handleDrop}
                          onRemove={handleRemove}
                          disabled={slotDisabled}
                          onDragStart={(m) => setDraggingMode(m)}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Unassigned events pool */}
              <div className="pool">
                <div className="pool-head">Ready to Place ({unassigned.length})</div>
                {unassigned.length === 0 && approved.length === 0 && (
                  <div className="pool-empty">No approved events yet. Approve cards in the Assets page first.</div>
                )}
                {unassigned.length === 0 && approved.length > 0 && (
                  <div className="pool-empty">All events placed! 🎉</div>
                )}
                {unassigned.map(e => <DraggableEvent key={e.id} event={e} onDragStart={(m) => setDraggingMode(m)} />)}
              </div>
            </div>

            {/* Publish button */}
            <div className="pub-footer">
              {publishError && <div className="pub-error">⚠ {publishError}</div>}
              {hasUnsavedChanges && (
                <div className="pub-unsaved">● You have unpublished changes — click Publish to update the homepage</div>
              )}
              <button
                className={`pub-btn ${hasUnsavedChanges ? 'pub-btn--pending' : ''}`}
                disabled={publishing || (!hasUnsavedChanges && filledCount === 0)}
                onClick={handlePublish}
              >
                {publishing ? '⏳ Publishing…' : hasUnsavedChanges ? `🚀 Publish Changes (${filledCount} slots)` : filledCount >= TOTAL_SLOTS ? '✓ Published' : `🚀 Publish (${filledCount}/${TOTAL_SLOTS} slots)`}
              </button>
              {filledCount > 0 && filledCount < TOTAL_SLOTS && (
                <div className="pub-warn">⚠ Not all slots filled — you can still publish with gaps</div>
              )}
            </div>
          </>
        )}
      </div>

      <style>{`
        .adash-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px}
        .adash-brand{font-size:36px;line-height:.9;font-weight:800;letter-spacing:-.05em;color:#fff}
        .adash-brand-ok{color:var(--accent)}
        .adash-header-right{display:flex;align-items:flex-start;padding-top:4px}

        .week-nav{display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:16px}
        .week-nav-arrow{width:40px;height:40px;border-radius:50%;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:var(--text);font-size:24px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}
        .week-nav-arrow:hover{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.25)}
        .week-nav-center{text-align:center;min-width:200px}
        .week-nav-range{font-size:18px;font-weight:700;color:var(--text)}
        .week-nav-today{font-size:11px;font-weight:600;color:var(--accent);background:none;border:1px solid rgba(78,205,196,.3);border-radius:999px;padding:2px 10px;cursor:pointer;margin-top:4px}
        .week-nav-today:hover{background:rgba(78,205,196,.1)}
        .week-nav-badge{font-size:11px;font-weight:600;color:var(--accent);display:inline-block;margin-top:4px}
        .week-nav-active{font-size:11px;font-weight:700;color:#a3e635;display:inline-block;margin-top:4px;margin-left:8px}
        .cal-day-num{display:block;font-size:10px;color:rgba(255,255,255,.3);font-weight:400;margin-top:2px}
        .pub-empty{text-align:center;padding:60px;font-size:16px;color:var(--muted)}

        /* Progress bar */
        .pb{margin-bottom:16px}
        .pb-bar{height:8px;background:rgba(255,255,255,.08);border-radius:999px;overflow:hidden}
        .pb-fill{height:100%;background:linear-gradient(90deg,var(--accent),#22d3ee);border-radius:999px;transition:width .3s}
        .pb-text{font-size:12px;color:var(--muted);margin-top:4px;display:block}

        /* Layout */
        .pub-layout{display:flex;gap:16px;margin-bottom:20px}

        /* Calendar */
        .cal{flex:1;min-width:0;overflow-x:auto}
        .cal-header{display:grid;grid-template-columns:100px repeat(7,1fr);gap:4px;margin-bottom:4px}
        .cal-corner{background:transparent}
        .cal-day-head{text-align:center;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);padding:8px 4px}
        .cal-row{display:grid;grid-template-columns:100px repeat(7,1fr);gap:4px;margin-bottom:4px}
        .cal-mode-head{display:flex;align-items:center;font-size:11px;font-weight:600;color:var(--muted);padding:0 8px;white-space:nowrap}

        /* Calendar slot */
        .cs{min-height:100px;background:var(--panel);border:2px dashed rgba(255,255,255,.08);border-radius:10px;transition:all .15s;position:relative;overflow:hidden}
        .cs--over{border-color:var(--accent);background:rgba(78,205,196,.05)}
        .cs--disabled{opacity:.3;pointer-events:none}
        .cs--filled{border-style:solid;border-color:rgba(255,255,255,.12)}
        .cs-empty{height:100%;display:flex;align-items:center;justify-content:center;font-size:11px;color:rgba(255,255,255,.2)}
        .cs-card{height:100%;position:relative}
        .cs-img{width:100%;height:70px;object-fit:cover;border-radius:8px 8px 0 0}
        .cs-info{padding:6px 8px}
        .cs-title{font-size:11px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .cs-venue{font-size:10px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .cs-remove{position:absolute;top:3px;right:3px;width:18px;height:18px;border-radius:50%;border:none;background:rgba(0,0,0,.6);color:rgba(255,255,255,.7);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s}
        .cs-card:hover .cs-remove{opacity:1}
        .cs-remove:hover{background:rgba(248,113,113,.5);color:#fff}

        /* Pool sidebar */
        .pool{width:240px;flex-shrink:0;max-height:70vh;overflow-y:auto;border:1px solid var(--border);border-radius:12px;background:var(--panel)}
        .pool-head{padding:12px 14px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--panel);z-index:1}
        .pool-empty{padding:20px 14px;font-size:12px;color:var(--muted);text-align:center}

        /* Draggable event */
        .de{padding:10px 14px;border-bottom:1px solid var(--border);cursor:grab;transition:background .12s}
        .de:hover{background:rgba(255,255,255,.04)}
        .de:active{cursor:grabbing;background:rgba(78,205,196,.08)}
        .de-title{font-size:13px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px}
        .de-meta{display:flex;gap:4px;align-items:center}
        .de-city{font-size:10px;color:var(--muted)}
        .mt{font-size:9px;font-weight:700;padding:2px 5px;border-radius:999px;border:1px solid;text-transform:lowercase}
        .mt--night{color:#a78bfa;border-color:rgba(167,139,250,.35);background:rgba(167,139,250,.08)}
        .mt--day{color:#f59e0b;border-color:rgba(245,158,11,.35);background:rgba(245,158,11,.08)}

        /* Publish footer */
        .pub-footer{text-align:center;padding:16px 0}
        .pub-error{margin-bottom:10px;font-size:13px;color:#f87171;background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.2);border-radius:8px;padding:8px 12px;display:inline-block}
        .pub-btn{padding:14px 40px;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;border:2px solid var(--accent);background:rgba(78,205,196,.1);color:var(--accent);transition:all .2s}
        .pub-btn:hover:not(:disabled){background:rgba(78,205,196,.2)}
        .pub-btn:disabled{opacity:.4;cursor:default}
        .pub-warn{margin-top:8px;font-size:12px;color:#f59e0b}
        .pub-unsaved{margin-bottom:10px;font-size:13px;color:#f59e0b;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);border-radius:8px;padding:8px 12px;animation:pub-pulse 2s ease-in-out infinite}
        .pub-btn--pending{background:var(--accent);color:#000;border-color:var(--accent);animation:pub-pulse 2s ease-in-out infinite}
        @keyframes pub-pulse{0%,100%{opacity:1}50%{opacity:.7}}

        /* Mobile */
        @media(max-width:900px){
          .pub-layout{flex-direction:column}
          .pool{width:100%;max-height:300px}
          .cal-header,.cal-row{grid-template-columns:60px repeat(7,1fr)}
          .cal-mode-head{font-size:9px;padding:0 2px}
          .cs{min-height:70px}
          .cs-img{height:40px}
        }
      `}</style>
    </main>
  );
}
