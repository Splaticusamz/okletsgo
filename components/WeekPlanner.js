'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_NAME_UPPER = DAY_NAMES.map((d) => d.toUpperCase());

function getWeekDates() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  return DAY_NAMES.map((name, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      name,
      short: name.slice(0, 3),
      date: d.toISOString().slice(0, 10),
      isToday: d.toDateString() === now.toDateString(),
    };
  });
}

function ModeChip({ mode }) {
  const map = {
    day: { emoji: '☀️', label: 'day', bg: '#422006', color: '#fde68a' },
    grownup: { emoji: '🍷', label: 'grownup', bg: '#422006', color: '#fde68a' },
    night: { emoji: '🌙', label: 'night', bg: '#1e1b4b', color: '#c4b5fd' },
    family: { emoji: '👨‍👩‍👧', label: 'family', bg: '#064e3b', color: '#6ee7b7' },
  };
  const cfg = map[mode] ?? { emoji: '📅', label: mode, bg: '#333', color: '#ccc' };
  return (
    <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 6, background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap' }}>
      {cfg.emoji} {cfg.label}
    </span>
  );
}

function StatusDot({ status }) {
  const colors = {
    candidate: '#f59e0b',
    approved_1: '#60a5fa',
    approved_2: '#34d399',
    published: '#818cf8',
    rejected: '#f87171',
    deferred: '#94a3b8',
  };
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: colors[status] ?? '#666', flexShrink: 0,
    }} title={status} />
  );
}

export default function WeekPlanner() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const weekDates = useMemo(getWeekDates, []);

  useEffect(() => {
    fetch('/api/events?all=1')
      .then((r) => r.json())
      .then((d) => setEvents(d.events ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const byDay = useMemo(() => {
    const map = {};
    for (const d of weekDates) map[d.date] = [];
    for (const e of events) {
      if (e.status === 'rejected') continue;
      // Match by ISO date (2026-03-14) or day name (MONDAY)
      if (map[e.date]) {
        map[e.date].push(e);
      } else {
        // Try matching day name to this week's dates
        const dayIdx = DAY_NAME_UPPER.indexOf(String(e.date).toUpperCase());
        if (dayIdx >= 0 && weekDates[dayIdx]) {
          map[weekDates[dayIdx].date].push(e);
        }
      }
    }
    return map;
  }, [events, weekDates]);

  const stats = useMemo(() => {
    let filled = 0;
    let empty = 0;
    let totalEvents = 0;
    const modes = { day: 0, night: 0, family: 0, grownup: 0 };
    for (const d of weekDates) {
      const dayEvents = byDay[d.date] ?? [];
      if (dayEvents.length > 0) filled++;
      else empty++;
      totalEvents += dayEvents.length;
      for (const e of dayEvents) {
        if (modes[e.mode] !== undefined) modes[e.mode]++;
      }
    }
    return { filled, empty, totalEvents, modes };
  }, [byDay, weekDates]);

  if (loading) return <div style={{ color: '#64748b', padding: 16 }}>Loading planner…</div>;

  return (
    <div className="wp">
      <div className="wp-header">
        <h2 className="wp-title">📅 Week Planner</h2>
        <div className="wp-stats">
          <span className="wp-stat wp-stat--filled">{stats.filled}/7 days filled</span>
          {stats.empty > 0 && <span className="wp-stat wp-stat--empty">{stats.empty} days need content</span>}
          <span className="wp-stat">{stats.totalEvents} events total</span>
        </div>
      </div>

      <div className="wp-grid">
        {weekDates.map((d) => {
          const dayEvents = byDay[d.date] ?? [];
          const hasContent = dayEvents.length > 0;
          const hasModes = { day: false, night: false, family: false };
          for (const e of dayEvents) {
            if (e.mode === 'day' || e.mode === 'grownup') hasModes.day = true;
            if (e.mode === 'night') hasModes.night = true;
            if (e.mode === 'family') hasModes.family = true;
          }

          return (
            <div key={d.date} className={`wp-day ${d.isToday ? 'wp-day--today' : ''} ${!hasContent ? 'wp-day--empty' : ''}`}>
              <div className="wp-day-head">
                <span className="wp-day-name">{d.short}</span>
                <span className="wp-day-date">{d.date.slice(5)}</span>
                {!hasContent && <span className="wp-day-alert">⚠️ empty</span>}
              </div>

              <div className="wp-day-modes">
                <span className={`wp-mode-dot ${hasModes.day ? 'wp-mode-dot--active' : ''}`} title="Day/Grownup">☀️</span>
                <span className={`wp-mode-dot ${hasModes.night ? 'wp-mode-dot--active' : ''}`} title="Night">🌙</span>
                <span className={`wp-mode-dot ${hasModes.family ? 'wp-mode-dot--active' : ''}`} title="Family">👨‍👩‍👧</span>
              </div>

              <div className="wp-day-events">
                {dayEvents.length === 0 && (
                  <div className="wp-day-placeholder">No events</div>
                )}
                {dayEvents.map((e) => (
                  <div key={e.id} className="wp-event">
                    <div className="wp-event-top">
                      <StatusDot status={e.status} />
                      <span className="wp-event-title">{e.title}</span>
                    </div>
                    <div className="wp-event-detail">
                      <ModeChip mode={e.mode} />
                      {e.startTime && <span className="wp-event-time">{e.startTime}</span>}
                      {e.venue && <span className="wp-event-venue">{e.venue}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {stats.empty > 0 && (
        <div className="wp-cta">
          <p>
            {stats.empty} day{stats.empty > 1 ? 's' : ''} still need{stats.empty === 1 ? 's' : ''} events.{' '}
            <Link href="/admin/sources">Run scrapers</Link> or <Link href="/admin/manual">add manually</Link>.
          </p>
        </div>
      )}

      <style>{`
        .wp { margin-bottom: 28px; }
        .wp-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
        .wp-title { font-size: 18px; font-weight: 700; margin: 0; color: #f1f5f9; }
        .wp-stats { display: flex; gap: 8px; flex-wrap: wrap; }
        .wp-stat { font-size: 12px; padding: 3px 10px; border-radius: 8px; background: #1e1e2e; color: #94a3b8; border: 1px solid #333; }
        .wp-stat--filled { color: #34d399; border-color: rgba(52,211,153,.3); }
        .wp-stat--empty { color: #f59e0b; border-color: rgba(245,158,11,.3); }

        .wp-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }
        .wp-day { background: #1e1e2e; border: 1px solid #333; border-radius: 10px; padding: 10px; min-height: 140px; display: flex; flex-direction: column; }
        .wp-day--today { border-color: #818cf8; box-shadow: 0 0 0 1px rgba(129,140,248,.3); }
        .wp-day--empty { background: #151525; border-style: dashed; }

        .wp-day-head { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
        .wp-day-name { font-size: 13px; font-weight: 700; color: #e2e8f0; }
        .wp-day-date { font-size: 11px; color: #64748b; }
        .wp-day-alert { font-size: 10px; margin-left: auto; }

        .wp-day-modes { display: flex; gap: 4px; margin-bottom: 8px; }
        .wp-mode-dot { font-size: 12px; opacity: .25; }
        .wp-mode-dot--active { opacity: 1; }

        .wp-day-events { flex: 1; display: flex; flex-direction: column; gap: 6px; }
        .wp-day-placeholder { font-size: 12px; color: #475569; font-style: italic; }

        .wp-event { background: #262640; border-radius: 6px; padding: 6px 8px; }
        .wp-event-top { display: flex; align-items: center; gap: 5px; }
        .wp-event-title { font-size: 12px; font-weight: 600; color: #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .wp-event-detail { display: flex; align-items: center; gap: 6px; margin-top: 3px; flex-wrap: wrap; }
        .wp-event-time { font-size: 11px; color: #94a3b8; }
        .wp-event-venue { font-size: 11px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100px; }

        .wp-cta { margin-top: 12px; padding: 12px 16px; background: rgba(245,158,11,.08); border: 1px solid rgba(245,158,11,.2); border-radius: 10px; }
        .wp-cta p { margin: 0; font-size: 13px; color: #fde68a; }
        .wp-cta a { color: #818cf8; text-decoration: underline; }

        @media(max-width: 900px) {
          .wp-grid { grid-template-columns: repeat(4, 1fr); }
        }
        @media(max-width: 600px) {
          .wp-grid { grid-template-columns: repeat(2, 1fr); }
          .wp-day { min-height: 100px; }
        }
      `}</style>
    </div>
  );
}
