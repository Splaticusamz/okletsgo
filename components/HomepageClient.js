'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

let posthogRef = null;
async function getPostHog() {
  if (posthogRef) return posthogRef;
  if (typeof window === 'undefined') return null;
  try {
    const { default: posthog } = await import('posthog-js');
    posthogRef = posthog;
    return posthog;
  } catch {
    return null;
  }
}
function capture(event, props = {}) {
  getPostHog().then((ph) => ph?.capture?.(event, props)).catch(() => {});
}

const INSERT_BEFORE_TUESDAY = 'TUESDAY';
const INSERT_BEFORE_FRIDAY = 'FRIDAY';
const MODES = {
  grownup: { img: 'translateY(-33.33%)', content: 'translateY(-33.33%)' },
  night: { img: 'translateY(0%)', content: 'translateY(-66.67%)' },
  family: { img: 'translateY(-66.67%)', content: 'translateY(0%)' },
};
const MODE_ORDER = ['night', 'grownup', 'family'];
function weatherIcon(code) {
  if ([0, 1].includes(code)) return '☀️';
  if ([2, 3].includes(code)) return '⛅';
  if ([45, 48].includes(code)) return '🌫️';
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return '🌧️';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄️';
  if ([95, 96, 99].includes(code)) return '⛈️';
  return '🌤️';
}

function buildMeta(day, mode, forecast) {
  const entry = day.entries?.[mode] || EMPTY_ENTRY;
  const bits = [];
  if (forecast) bits.push(`${weatherIcon(forecast.code)} ${Math.round(forecast.high)}°/${Math.round(forecast.low)}°C`);
  if (entry.venue) bits.push(entry.venue);
  if (entry.city) bits.push(entry.city);
  return bits.join('  ·  ');
}

function AnimatedCardMedia({ entry }) {
  const [ready, setReady] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    if (!entry.video || !videoRef.current) return;
    const video = videoRef.current;

    const markReady = () => setReady(true);
    video.addEventListener('canplay', markReady, { once: true });

    // Preload but don't play — hover triggers play via CSS opacity + JS
    video.preload = 'auto';
    video.load();

    return () => video.removeEventListener('canplay', markReady);
  }, [entry.video]);

  // Expose play/pause for parent hover handlers
  useEffect(() => {
    if (!entry.video || !videoRef.current) return;
    const card = videoRef.current.closest('.card');
    if (!card) return;

    const play = () => { if (ready) videoRef.current?.play().catch(() => {}); };
    const pause = () => { if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; } };

    card.addEventListener('mouseenter', play);
    card.addEventListener('mouseleave', pause);
    return () => {
      card.removeEventListener('mouseenter', play);
      card.removeEventListener('mouseleave', pause);
    };
  }, [entry.video, ready]);

  return (
    <>
      {entry.video ? (
        <video
          ref={videoRef}
          className={`card-video ${ready ? 'is-ready' : ''}`}
          src={`/${entry.video.replace(/^\//, '')}`}
          muted
          loop
          playsInline
          preload="none"
        />
      ) : null}
    </>
  );
}

const EMPTY_ENTRY = { venue: '', city: '', fallbackImage: null, imageUrl: null, video: null };

function Card({ dayData, mode, index, transitionDelayMs }) {
  const transforms = MODES[mode];

  return (
    <div className="card tooltip-anchor" data-tooltip data-index={index}>
      <div className="card-img-strip" style={{ transform: transforms.img, transitionDelay: `${transitionDelayMs}ms` }}>
        {MODE_ORDER.map((entryMode) => {
          const entry = dayData.entries[entryMode] || EMPTY_ENTRY;
          const imgSrc = entry.imageUrl || entry.fallbackImage || '';
          const bgUrl = imgSrc
            ? (imgSrc.startsWith('http') ? imgSrc : '/' + imgSrc.replace(/^\//, ''))
            : '';
          return (
            <div key={`${dayData.day}-${entryMode}-img`} className={`card-img ${!bgUrl ? 'card-img--empty' : ''}`} style={bgUrl ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 59%), url('${bgUrl}')` } : {}}>
              {entry.video && <AnimatedCardMedia entry={entry} />}
            </div>
          );
        })}
      </div>

      <div className="card-content-strip" style={{ transform: transforms.content, transitionDelay: `${transitionDelayMs + 100}ms` }}>
        {MODE_ORDER.map((entryMode) => {
          const entry = dayData.entries[entryMode] || EMPTY_ENTRY;
          return (
            <a key={`${dayData.day}-${entryMode}-content`} href="#" className="card-content">
              <span className="card-day">{dayData.day}</span>
              <span className="card-venue">{entry.venue || ''}</span>
              <span className="card-city">{entry.city || ''}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

export default function HomepageClient({ currentWeek }) {
  const [familyMode, setFamilyMode] = useState(false);
  const [dayMode, setDayMode] = useState(true);
  const [countdown, setCountdown] = useState('00:00:00');
  const [tooltip, setTooltip] = useState({ visible: false, text: '', x: 0, y: 0 });
  const [sheet, setSheet] = useState({ visible: false, day: null, index: -1 });
  const [isMobile, setIsMobile] = useState(false);
  const [forecasts, setForecasts] = useState(currentWeek.weatherByDate || {});
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState({ state: 'idle', message: '' });

  useEffect(() => {
    let cancelled = false;
    async function loadWeather() {
      try {
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=49.8880&longitude=-119.4960&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=America%2FVancouver&forecast_days=7');
        if (!res.ok) return;
        const data = await res.json();
        const next = {};
        data.daily?.time?.forEach((date, index) => {
          next[date] = {
            code: data.daily.weather_code?.[index],
            high: data.daily.temperature_2m_max?.[index],
            low: data.daily.temperature_2m_min?.[index],
          };
        });
        if (!cancelled) setForecasts(next);
      } catch {}
    }
    loadWeather();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  const [fadeFamily, setFadeFamily] = useState(false);
  const [fadeDay, setFadeDay] = useState(false);

  const mode = useMemo(() => {
    if (!dayMode) return 'night';
    if (familyMode) return 'family';
    return 'grownup';
  }, [dayMode, familyMode]);

  useEffect(() => {
    document.body.classList.toggle('dark-mode', !dayMode);
    return () => document.body.classList.remove('dark-mode');
  }, [dayMode]);

  useEffect(() => {
    function getSecondsUntilReset() {
      const now = new Date();
      const day = now.getUTCDay();
      const target = new Date(now);
      target.setUTCDate(now.getUTCDate() + (7 - day));
      target.setUTCHours(0, 0, 0, 0);
      return Math.max(0, Math.floor((target - now) / 1000));
    }
    function formatTime(totalSeconds) {
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    const tick = () => setCountdown(formatTime(getSecondsUntilReset()));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setFadeFamily(true);
    const t = setTimeout(() => setFadeFamily(false), 200);
    return () => clearTimeout(t);
  }, [familyMode]);

  useEffect(() => {
    setFadeDay(true);
    const t = setTimeout(() => setFadeDay(false), 200);
    return () => clearTimeout(t);
  }, [dayMode]);

  const cardsWithTiles = [];
  currentWeek.days.forEach((day, index) => {
    if (day.day === INSERT_BEFORE_TUESDAY) cardsWithTiles.push({ type: 'cta' });
    if (day.day === INSERT_BEFORE_FRIDAY) cardsWithTiles.push({ type: 'brand' });
    cardsWithTiles.push({ type: 'card', day, index });
  });
  if (!cardsWithTiles.find((item) => item.type === 'brand')) cardsWithTiles.push({ type: 'brand' });

  const familyLabel = familyMode ? { title: 'Family mode', desc: 'family friendly events' } : { title: 'Grown up', desc: 'nightlife available' };
  const dayLabel = dayMode ? { title: 'Daytime', desc: 'daytime events' } : { title: 'Nightlife', desc: 'evening events' };
  const cardCount = currentWeek.days.length || 1;
  const staggerMs = cardCount > 1 ? Math.round((720 - 400) / (cardCount - 1)) : 0;
  const weekStart = currentWeek.weekKey ? new Date(`${currentWeek.weekKey}T12:00:00`) : null;
  const dateForIndex = (index) => {
    if (!weekStart) return null;
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + index);
    return d.toISOString().slice(0, 10);
  };

  const moveTooltip = (event) => {
    const OFFSET = 12;
    const tooltipWidth = 280;
    const tooltipHeight = 56;
    let x = event.clientX + OFFSET;
    let y = event.clientY + OFFSET;
    if (x + tooltipWidth > window.innerWidth) x = event.clientX - tooltipWidth - OFFSET;
    if (y + tooltipHeight > window.innerHeight) y = event.clientY - tooltipHeight - OFFSET;
    setTooltip((prev) => ({ ...prev, x: Math.max(12, x), y: Math.max(12, y) }));
  };

  const forwardNewsletterEmail = (email) => {
    try {
      const form = new FormData();
      form.append('email', email);
      form.append('_subject', 'New OKLetsGo newsletter signup');
      form.append('_template', 'table');
      form.append('_captcha', 'false');
      form.append('source', 'okletsgo.ca homepage form');
      fetch('https://formsubmit.co/sam@samzamor.com', {
        method: 'POST',
        mode: 'no-cors',
        body: form,
      }).catch(() => {});
    } catch {}
  };

  const handleNewsletterSubmit = async (event) => {
    event.preventDefault();
    const email = newsletterEmail.trim();
    if (!email) {
      setNewsletterStatus({ state: 'error', message: 'Enter your email first.' });
      return;
    }
    setNewsletterStatus({ state: 'loading', message: 'Adding you…' });
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'homepage-footer' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not join right now.');
      forwardNewsletterEmail(email);
      setNewsletterEmail('');
      setNewsletterStatus({ state: 'success', message: data.message || 'You\'re on the list.' });
      capture('newsletter_subscribe', { source: 'homepage-footer', success: true });
    } catch (err) {
      setNewsletterStatus({ state: 'error', message: err.message || 'Could not join right now.' });
      capture('newsletter_subscribe', { source: 'homepage-footer', success: false, error: err.message || 'unknown' });
    }
  };

  return (
    <>
      <div className="page" id="publicApp">
        <div className="slide">
          <div className="content">
            <div className="header">
              <div className="title-area">
                <h1 className="title"><span className="title-ok">OK</span><br />LET&apos;S<br />GO</h1>
              </div>
              <div className="toggles">
                <label className="toggle-group">
                  <div className="toggle-labels">
                    <span className={`toggle-title ${fadeFamily ? 'fading' : ''}`}>{familyLabel.title}</span>
                    <span className={`toggle-desc ${fadeFamily ? 'fading' : ''}`}>{familyLabel.desc}</span>
                  </div>
                  <input type="checkbox" className="toggle-input" checked={familyMode} onChange={(e) => {
                    const checked = e.target.checked;
                    setFamilyMode(checked);
                    if (checked && !dayMode) setDayMode(true);
                    capture('mode_toggle', { family: checked });
                  }} />
                  <div className="toggle-track toggle-track--family"><div className="toggle-knob"></div></div>
                </label>

                <label className="toggle-group">
                  <div className="toggle-labels">
                    <span className={`toggle-title ${fadeDay ? 'fading' : ''}`}>{dayLabel.title}</span>
                    <span className={`toggle-desc ${fadeDay ? 'fading' : ''}`}>{dayLabel.desc}</span>
                  </div>
                  <input type="checkbox" className="toggle-input" checked={dayMode} onChange={(e) => {
                    const checked = e.target.checked;
                    setDayMode(checked);
                    if (!checked) setFamilyMode(false);
                    capture('daynight_toggle', { dayMode: checked });
                  }} />
                  <div className="toggle-track toggle-track--day">
                    <div className="toggle-knob toggle-knob--day">
                      <span className="toggle-icon toggle-icon--sun">☀︎</span>
                      <span className="toggle-icon toggle-icon--moon">☾</span>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="cards-section">
              <div className="cards-grid" id="cardsGrid">
                {cardsWithTiles.map((item, order) => {
                  if (item.type === 'cta') {
                    return <a key={`cta-${order}`} href="#newsletter" className="utility-tile utility-tile--cta" aria-label="Join the newsletter"><div className="utility-inner"><span className="utility-kicker">Always stay up to date</span><span className="utility-heading">Join the newsletter</span><span className="utility-pill">Weekly drops →</span></div></a>;
                  }
                  if (item.type === 'brand') {
                    return <a key={`brand-${order}`} href="#newsletter" className="utility-tile utility-tile--brand" aria-label="OK LET&apos;S GO brand tile"><div className="utility-inner utility-inner--brand"><span className="utility-logo"><span className="utility-logo-ok">OK</span><br />LET&apos;S<br />GO</span></div></a>;
                  }
                  const tooltipMode = !dayMode ? 'night' : familyMode ? 'family' : 'grownup';
                  const tooltipText = buildMeta(item.day, tooltipMode, forecasts[dateForIndex(item.index)]);
                  const entry = item.day.entries[mode === 'grownup' ? 'grownup' : mode === 'night' ? 'night' : 'family'];
                  return (
                    <div
                      key={item.day.day}
                      className="card-wrapper"
                      role="button"
                      tabIndex={0}
                      aria-label={`Open details for ${item.day.day}`}
                      onClick={(e) => {
                        e.preventDefault();
                        setTooltip((prev) => ({ ...prev, visible: false }));
                        const opening = !(sheet.visible && sheet.index === item.index);
                        setSheet((prev) => prev.visible && prev.index === item.index
                          ? { visible: false, day: null, index: -1 }
                          : { visible: true, day: item.day, index: item.index });
                        if (opening) {
                          const entry = item.day.entries[mode === 'grownup' ? 'grownup' : mode === 'night' ? 'night' : 'family'] || {};
                          capture('event_card_click', { day: item.day.day, mode, venue: entry.venue || '', city: entry.city || '' });
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setTooltip((prev) => ({ ...prev, visible: false }));
                          setSheet((prev) => prev.visible && prev.index === item.index
                            ? { visible: false, day: null, index: -1 }
                            : { visible: true, day: item.day, index: item.index });
                        }
                      }}
                      onMouseEnter={(e) => { if (!isMobile && !sheet.visible) { setTooltip({ visible: true, text: tooltipText || '', x: 0, y: 0 }); moveTooltip(e); } }}
                      onMouseMove={(e) => { if (!isMobile) moveTooltip(e); }}
                      onMouseLeave={() => { if (!isMobile) setTooltip((prev) => ({ ...prev, visible: false })); }}
                    >
                      <Card dayData={item.day} mode={mode} index={item.index} transitionDelayMs={item.index * staggerMs} />
                    </div>
                  );
                })}
              </div>
              <div className="footer">
                <div className="timer-area"><span className="footer-text">List resets in <span id="countdown">{countdown}</span></span></div>
                <form className="newsletter-area" id="newsletter" onSubmit={handleNewsletterSubmit}>
                  <label className="newsletter-label" htmlFor="newsletterEmail">Always stay up to date</label>
                  <input
                    id="newsletterEmail"
                    className="newsletter-input"
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                  <button className="newsletter-btn" type="submit" disabled={newsletterStatus.state === 'loading'}>
                    {newsletterStatus.state === 'loading' ? 'Joining…' : 'Join'}
                  </button>
                  {newsletterStatus.message && <span className={`newsletter-message newsletter-message--${newsletterStatus.state}`}>{newsletterStatus.message}</span>}
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className={`tooltip ${tooltip.visible ? 'visible' : ''}`} style={{ left: tooltip.x, top: tooltip.y }}>{tooltip.text}</div>

      {/* Mobile bottom sheet */}
      <div className={`bottom-sheet-overlay ${sheet.visible ? 'visible' : ''}`} onClick={() => setSheet({ visible: false, day: null, index: -1 })} />
      <div className={`bottom-sheet ${sheet.visible ? 'visible' : ''}`}>
        {sheet.day && (() => {
          const entry = sheet.day.entries[mode === 'grownup' ? 'grownup' : mode === 'night' ? 'night' : 'family'] || EMPTY_ENTRY;
          const sheetMode = !dayMode ? 'night' : familyMode ? 'family' : 'grownup';
          const forecast = forecasts[dateForIndex(sheet.index)];
          const weatherText = forecast ? `${weatherIcon(forecast.code)} ${Math.round(forecast.high)}°/${Math.round(forecast.low)}°C` : 'Forecast loading';
          const eventInfo = buildMeta(sheet.day, sheetMode, forecast);
          return (
            <>
              <div className="bottom-sheet-handle" />
              <div className="bottom-sheet-content">
                <div className="bottom-sheet-day">{sheet.day.day}</div>
                <div className="bottom-sheet-venue">{entry?.venue || 'Coming soon'}</div>
                {entry?.eventVenue && <div className="bottom-sheet-location">{entry.eventVenue}</div>}
                {entry?.city && <div className="bottom-sheet-city">{entry.city}</div>}
                {entry?.description && <p className="bottom-sheet-blurb">{entry.description}</p>}
                <div className="bottom-sheet-facts">
                  <div><span>Weather</span><strong>{weatherText}</strong></div>
                  <div><span>When</span><strong>{entry?.duration || 'Check listing'}</strong></div>
                  <div><span>Price</span><strong>{entry?.pricing || 'Check listing'}</strong></div>
                </div>
                {entry?.address && <div className="bottom-sheet-address">📍 {entry.address}</div>}
                {eventInfo && <div className="bottom-sheet-meta">{eventInfo}</div>}
                <div className="bottom-sheet-actions">
                  {entry?.ticketUrl && <a className="bottom-sheet-link" href={entry.ticketUrl} target="_blank" rel="noreferrer" onClick={() => capture('open_listing', { day: sheet.day.day, mode, venue: entry.venue || '', url: entry.ticketUrl })}>Open listing</a>}
                  <button className="bottom-sheet-btn bottom-sheet-btn--share" onClick={(e) => {
                    e.stopPropagation();
                    const shareTitle = `${entry.venue || 'Event'} · ${sheet.day.day} — OK LET'S GO`;
                    const shareUrl = entry.ticketUrl || entry.sourceUrl || 'https://okletsgo.ca';
                    if (navigator.share) {
                      navigator.share({ title: shareTitle, url: shareUrl }).then(() => capture('share_event', { method: 'native', day: sheet.day.day, venue: entry.venue || '' })).catch(() => {});
                    } else {
                      navigator.clipboard?.writeText?.(shareUrl).then(() => capture('share_event', { method: 'clipboard', day: sheet.day.day, venue: entry.venue || '' })).catch(() => {});
                    }
                  }}>Share</button>
                  <button className="bottom-sheet-btn" onClick={(e) => { e.stopPropagation(); setSheet({ visible: false, day: null, index: -1 }); }}>
                    Close
                  </button>
                </div>
              </div>
            </>
          );
        })()}
      </div>
    </>
  );
}
