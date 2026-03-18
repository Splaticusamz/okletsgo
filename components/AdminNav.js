'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/candidates', label: 'From Discord' },
  { href: '/admin/manual', label: 'Manual' },
  { href: '/admin/assets', label: 'Assets' },
  { href: '/admin/publish', label: 'Publish' },
  { href: '/admin/guide', label: 'Guide' },
];

function DemoToggle() {
  const [demo, setDemo] = useState(null);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    fetch('/api/admin/demo').then(r => r.json()).then(d => setDemo(d.demoMode)).catch(() => {});
  }, []);

  async function toggle() {
    setToggling(true);
    try {
      const res = await fetch('/api/admin/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !demo }),
      });
      const data = await res.json();
      if (data.ok) setDemo(data.demoMode);
    } catch {}
    finally { setToggling(false); }
  }

  if (demo === null) return null;

  return (
    <button
      className={`demo-toggle ${demo ? 'demo-toggle--on' : ''}`}
      onClick={toggle}
      disabled={toggling}
      title={demo ? 'Demo mode ON — homepage shows seed data. Click to disable.' : 'Enable demo mode — homepage shows original seed images & videos.'}
    >
      <span className="demo-toggle-dot" />
      <span className="demo-toggle-label">{demo ? '🎭 Demo ON' : 'Demo'}</span>
    </button>
  );
}

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="adash-nav">
      {NAV_ITEMS.map(({ href, label }) => {
        const isActive = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`adash-nav-link ${isActive ? 'adash-nav-link--active' : 'adash-nav-link--dim'}`}
          >
            {label}
          </Link>
        );
      })}
      <div style={{ marginLeft: 'auto' }}>
        <DemoToggle />
      </div>

      <style>{`
        .demo-toggle{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:20px;border:1px solid var(--border, rgba(255,255,255,.12));background:rgba(255,255,255,.04);color:var(--muted, #888);font-size:12px;font-weight:600;cursor:pointer;transition:all .2s}
        .demo-toggle:hover{background:rgba(255,255,255,.08)}
        .demo-toggle--on{background:rgba(168,85,247,.12);border-color:rgba(168,85,247,.4);color:#c084fc}
        .demo-toggle-dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.2);transition:all .2s}
        .demo-toggle--on .demo-toggle-dot{background:#c084fc;box-shadow:0 0 6px rgba(168,85,247,.5)}
        .demo-toggle:disabled{opacity:.5;cursor:default}
        .demo-toggle-label{white-space:nowrap}
      `}</style>
    </nav>
  );
}
