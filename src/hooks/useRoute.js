import { useEffect, useState } from 'react';

/* Two pages, so two routes and no router dependency.

   Paths rather than hashes: the nav's in-page links are already hashes
   (#spending, #schemes), and a hash router would fight them for the same
   part of the URL. */

const ROUTE_CHANGE = 'yojana:routechange';

export function navigate(path) {
  if (path === window.location.pathname) return;
  window.history.pushState({}, '', path);
  window.dispatchEvent(new Event(ROUTE_CHANGE));
  window.scrollTo(0, 0);
}

export default function useRoute() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const sync = () => setPath(window.location.pathname);
    // popstate covers the back button; the custom event covers our own
    // pushState, which does not fire popstate.
    window.addEventListener('popstate', sync);
    window.addEventListener(ROUTE_CHANGE, sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener(ROUTE_CHANGE, sync);
    };
  }, []);

  return path;
}
