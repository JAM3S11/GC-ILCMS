import { useEffect, useRef } from 'react';

/* ---------------------------------------------------------------------------
 * Mirrors the workspace's `activeView` into the address bar (/app/<view>) so
 * pages can be bookmarked, refreshed and walked with Back / Forward. The app
 * keeps `activeView` as plain state; this hook only reflects it, and feeds
 * browser history moves back in through `navigate`. Guards in App still
 * decide whether a view is allowed, so a stale or forbidden URL falls back
 * exactly as an in-app navigation would.
 * --------------------------------------------------------------------------- */

const PREFIX = '/app/';

/** The view named in the current URL, or null on any non-workspace path. */
export const viewFromLocation = (): string | null => {
  const { pathname } = window.location;
  if (!pathname.startsWith(PREFIX)) return null;
  const view = decodeURIComponent(pathname.slice(PREFIX.length)).replace(/\/+$/, '');
  return view || null;
};

/**
 * `navigate` should be the app's guarded navigation (role checks, toasts), so
 * history moves are held to the same rules as sidebar clicks.
 */
export const useViewRoute = (activeView: string, navigate: (view: string) => void) => {
  // Skip the push that would otherwise echo a popstate back into history.
  const fromHistory = useRef(false);

  useEffect(() => {
    const onPop = () => {
      const view = viewFromLocation();
      if (!view) return;
      fromHistory.current = true;
      navigate(view);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [navigate]);

  useEffect(() => {
    const target = activeView === 'landing' ? '/' : `${PREFIX}${encodeURIComponent(activeView)}`;
    if (fromHistory.current) {
      fromHistory.current = false;
      return;
    }
    if (window.location.pathname === target) return;
    // Landing and the first workspace view replace; later moves add history.
    const replace = activeView === 'landing' || !window.location.pathname.startsWith(PREFIX);
    window.history[replace ? 'replaceState' : 'pushState'](null, '', target);
  }, [activeView]);
};
