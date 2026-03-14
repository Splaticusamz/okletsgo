'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/admin/guide', label: 'Overview' },
  { href: '/admin/guide/pipeline', label: 'Event Pipeline' },
  { href: '/admin/guide/sources', label: 'Sources & Scrapers' },
  { href: '/admin/guide/candidates', label: 'Reviewing Candidates' },
  { href: '/admin/guide/manual', label: 'Manual Entry' },
  { href: '/admin/guide/publishing', label: 'Publishing' },
  { href: '/admin/guide/assets', label: 'Assets' },
  { href: '/admin/guide/newsletter', label: 'Newsletter' },
  { href: '/admin/guide/archives', label: 'Archives' },
];

export default function GuideLayout({ children }) {
  const pathname = usePathname();

  return (
    <div className="gdoc">
      <header className="gdoc-topbar">
        <Link href="/admin" className="gdoc-back">← Admin</Link>
        <div className="gdoc-brand"><span>OK</span> LET&apos;S GO <span className="gdoc-brand-sub">/ DOCS</span></div>
      </header>

      <div className="gdoc-body">
        <nav className="gdoc-sidebar">
          <div className="gdoc-sidebar-title">Guide</div>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`gdoc-sidebar-link ${pathname === item.href ? 'gdoc-sidebar-link--active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="gdoc-content">
          {children}
        </main>
      </div>

      <style>{`
        .gdoc { min-height:100vh; background:#080b1a; color:#e2e8f0 }

        .gdoc-topbar { display:flex; align-items:center; gap:16px; padding:14px 24px; border-bottom:1px solid #1e293b; background:#0d1025 }
        .gdoc-back { color:#818cf8; text-decoration:none; font-size:14px; white-space:nowrap }
        .gdoc-back:hover { text-decoration:underline }
        .gdoc-brand { font-size:18px; font-weight:800; letter-spacing:-.03em }
        .gdoc-brand span { color:#818cf8 }
        .gdoc-brand-sub { font-weight:400; color:#64748b; font-size:14px }

        .gdoc-body { display:flex; min-height:calc(100vh - 53px) }

        .gdoc-sidebar { width:220px; flex-shrink:0; padding:20px 16px; border-right:1px solid #1e293b; background:#0a0e1f; position:sticky; top:0; height:100vh; overflow-y:auto }
        .gdoc-sidebar-title { font-size:11px; text-transform:uppercase; letter-spacing:.1em; color:#475569; margin-bottom:12px; padding:0 8px }
        .gdoc-sidebar-link { display:block; padding:8px 12px; border-radius:8px; color:#94a3b8; text-decoration:none; font-size:14px; margin-bottom:2px; transition:all .15s }
        .gdoc-sidebar-link:hover { background:#1e1e2e; color:#e2e8f0 }
        .gdoc-sidebar-link--active { background:#1e1b4b; color:#818cf8; font-weight:600 }

        .gdoc-content { flex:1; padding:32px 40px 64px; max-width:780px }

        .gdoc-content h1 { font-size:28px; font-weight:800; margin:0 0 8px; color:#f1f5f9 }
        .gdoc-content h2 { font-size:20px; font-weight:700; margin:32px 0 12px; color:#f1f5f9; padding-top:16px; border-top:1px solid #1e293b }
        .gdoc-content h3 { font-size:16px; font-weight:600; margin:24px 0 8px; color:#e2e8f0 }
        .gdoc-content p { font-size:15px; line-height:1.7; color:#cbd5e1; margin:0 0 14px }
        .gdoc-content ul, .gdoc-content ol { padding-left:22px; margin:0 0 16px }
        .gdoc-content li { font-size:15px; line-height:1.7; color:#cbd5e1; margin-bottom:6px }
        .gdoc-content code { background:#1e1e2e; padding:2px 7px; border-radius:6px; font-size:13px; color:#818cf8; font-family:'SF Mono',monospace }
        .gdoc-content .tip { background:#1e1b4b; border:1px solid #312e81; border-radius:10px; padding:14px 18px; margin:16px 0; font-size:14px; color:#c4b5fd }
        .gdoc-content .tip strong { color:#a78bfa }
        .gdoc-content .warn { background:rgba(120,53,15,.2); border:1px solid rgba(251,191,36,.2); border-radius:10px; padding:14px 18px; margin:16px 0; font-size:14px; color:#fde68a }
        .gdoc-content .flow { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin:16px 0; font-size:14px }
        .gdoc-content .flow-step { background:#1e1e2e; border:1px solid #333; padding:6px 14px; border-radius:8px; color:#e2e8f0; font-weight:600 }
        .gdoc-content .flow-arrow { color:#475569; font-size:18px }
        .gdoc-content .status-table { width:100%; border-collapse:collapse; margin:16px 0 }
        .gdoc-content .status-table th { text-align:left; font-size:13px; color:#64748b; text-transform:uppercase; letter-spacing:.05em; padding:8px 12px; border-bottom:1px solid #1e293b }
        .gdoc-content .status-table td { padding:8px 12px; font-size:14px; border-bottom:1px solid #111827; color:#cbd5e1 }
        .gdoc-content .status-table tr:hover td { background:#0f172a }

        .gdoc-content .next-link { display:inline-flex; align-items:center; gap:6px; margin-top:28px; padding:10px 18px; background:#1e1b4b; border:1px solid #312e81; border-radius:10px; color:#818cf8; text-decoration:none; font-size:14px; font-weight:600; transition:background .15s }
        .gdoc-content .next-link:hover { background:#312e81 }

        @media(max-width:768px) {
          .gdoc-body { flex-direction:column }
          .gdoc-sidebar { width:100%; height:auto; position:relative; display:flex; flex-wrap:wrap; gap:4px; padding:12px; border-right:none; border-bottom:1px solid #1e293b }
          .gdoc-sidebar-title { width:100% }
          .gdoc-sidebar-link { font-size:13px; padding:6px 10px }
          .gdoc-content { padding:24px 20px 48px }
          .gdoc-content h1 { font-size:24px }
        }
      `}</style>
    </div>
  );
}
