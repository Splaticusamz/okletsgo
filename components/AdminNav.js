'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/sources', label: 'Sources' },
  { href: '/admin/candidates', label: 'From Discord' },
  { href: '/admin/manual', label: 'Manual' },
  { href: '/admin/assets', label: 'Assets' },
  { href: '/admin/publish', label: 'Publish' },
  { href: '/admin/newsletter', label: 'Newsletter' },
  { href: '/admin/archives', label: 'Archives' },
  { href: '/admin/guide', label: 'Guide' },
];

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
    </nav>
  );
}
