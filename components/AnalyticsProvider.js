'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

let initialized = false;

function initPostHog() {
  if (initialized || !POSTHOG_KEY || typeof window === 'undefined') return false;
  import('posthog-js').then(({ default: posthog }) => {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: false,
      capture_pageleave: true,
      persistence: 'localStorage',
      loaded: () => { initialized = true; },
    });
    initialized = true;
  }).catch(() => {});
  return true;
}

export function PostHogPageView() {
  const pathname = usePathname();
  useEffect(() => {
    if (!initPostHog()) return;
    let cancelled = false;
    const timer = setInterval(() => {
      if (cancelled) return;
      import('posthog-js').then(({ default: posthog }) => {
        if (posthog.__loaded) {
          posthog.capture('$pageview', {
            $current_url: window.location.href,
            path: pathname,
            search: window.location.search,
          });
          clearInterval(timer);
        }
      }).catch(() => {});
    }, 300);
    return () => { cancelled = true; clearInterval(timer); };
  }, [pathname]);
  return null;
}

export function AnalyticsProvider({ children }) {
  useEffect(() => { initPostHog(); }, []);
  return children;
}
