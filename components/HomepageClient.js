'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const INSERT_BEFORE_TUESDAY = 'TUESDAY';
const INSERT_BEFORE_FRIDAY = 'FRIDAY';
const MODES = {
  grownup: { img: 'translateY(-33.33%)', content: 'translateY(-33.33%)' },
  night: { img: 'translateY(0%)', content: 'translateY(-66.67%)' },
  family: { img: 'translateY(-66.67%)', content: 'translateY(0%)' },
};
const MODE_ORDER = ['night', 'grownup', 'family'];
const EVENT_DATA = [
  { day: '☀️ 28°C  ·  🍷 Wine  ·  🕐 2PM', night: '🌙 18°C  ·  🎵 Live Music  ·  🕘 9PM', family: '☀️ 28°C  ·  📚 Storytime  ·  🕙 10AM' },
  { day: '☀️ 30°C  ·  🍇 Tasting  ·  🕐 1PM', night: '🌧️ 16°C  ·  🔥 Bonfire  ·  🕗 8PM', family: '☀️ 30°C  ·  💦 Splash Pad  ·  🕛 12PM' },
  { day: '⛅ 24°C  ·  🍺 Pub  ·  🕒 3PM', night: '🌙 12°C  ·  🔭 Stargazing  ·  🕙 10PM', family: '⛅ 24°C  ·  ⛳ Mini Golf  ·  🕑 2PM' },
  { day: '☀️ 27°C  ·  🏒 Hockey  ·  🕖 7PM', night: '⛅ 20°C  ·  🎸 Concert  ·  🕗 8PM', family: '☀️ 27°C  ·  🔬 Science  ·  🕐 1PM' },
  { day: '☀️ 31°C  ·  🍷 Wine  ·  🕑 2PM', night: '🌙 19°C  ·  🍸 Cocktails  ·  🕙 10PM', family: '☀️ 31°C  ·  🍓 Berry Picking  ·  🕙 10AM' },
  { day: '☀️ 29°C  ·  🍖 BBQ  ·  🕛 12PM', night: '🌙 17°C  ·  🎆 Fireworks  ·  🕘 9PM', family: '☀️ 29°C  ·  🏄 Waterpark  ·  🕚 11AM' },
  { day: '⛅ 25°C  ·  🎪 Carnival  ·  🕐 1PM', night: '🌧️ 14°C  ·  🎠 Rides  ·  🕚 11PM', family: '⛅ 25°C  ·  🐾 Petting Zoo  ·  🕙 10AM' },
];

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

function Card({ dayData, mode, index, transitionDelayMs }) {
  const transforms = MODES[mode];

  return (
    <div className="card tooltip-anchor" data-tooltip data-index={index}>
      <div className="card-img-strip" style={{ transform: transforms.img, transitionDelay: `${transitionDelayMs}ms` }}>
        {MODE_ORDER.map((entryMode) => {
          const entry = dayData.entries[entryMode];
          return (
            <div key={`${dayData.day}-${entryMode}-img`} className="card-img" style={{ backgroundImage: `linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 59%), url('/${String(entry.fallbackImage).replace(/^\//, '')}')` }}>
              <AnimatedCardMedia entry={entry} />
            </div>
          );
        })}
      </div>

      <div className="card-content-strip" style={{ transform: transforms.content, transitionDelay: `${transitionDelayMs + 100}ms` }}>
        {MODE_ORDER.map((entryMode) => {
          const entry = dayData.entries[entryMode];
          return (
            <a key={`${dayData.day}-${entryMode}-content`} href="#" className="card-content">
              <span className="card-day">{dayData.day}</span>
              <span className="card-venue">{entry.venue}</span>
              <span className="card-city">{entry.city}</span>
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
                  const tooltipText = !dayMode ? EVENT_DATA[item.index]?.night : familyMode ? EVENT_DATA[item.index]?.family : EVENT_DATA[item.index]?.day;
                  return (
                    <div key={item.day.day} className="card-wrapper" onMouseEnter={(e) => { setTooltip({ visible: true, text: tooltipText || '', x: 0, y: 0 }); moveTooltip(e); }} onMouseMove={moveTooltip} onMouseLeave={() => setTooltip((prev) => ({ ...prev, visible: false }))}>
                      <Card dayData={item.day} mode={mode} index={item.index} transitionDelayMs={item.index * staggerMs} />
                    </div>
                  );
                })}
              </div>
              <div className="footer">
                <div className="timer-area"><span className="footer-text">List resets in <span id="countdown">{countdown}</span></span></div>
                <div className="newsletter-area" id="newsletter"><span className="footer-text">Always stay up to date</span><button className="newsletter-btn">Join the Newsletter</button></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className={`tooltip ${tooltip.visible ? 'visible' : ''}`} style={{ left: tooltip.x, top: tooltip.y }}>{tooltip.text}</div>
    </>
  );
}
