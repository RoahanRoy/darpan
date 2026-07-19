import { useEffect, useState } from 'react';
import { parseRoute } from '../lib/routes.js';

/* Four routes, so a hand-rolled router and no dependency.

   Paths rather than hashes: the nav's in-page links are already hashes
   (#spending, #schemes), and a hash router would fight them for the same
   part of the URL.

   `replace` exists for canonicalisation. Landing on /uttarakhand and being
   moved to /uttarakhand/dehradun should not leave a history entry, or the
   back button returns to a URL that immediately forwards again and the
   reader cannot get out of the page. */

const ROUTE_CHANGE = 'yojana:routechange';

export function navigate(path, { replace = false } = {}) {
  if (path === window.location.pathname) return;

  if (replace) {
    window.history.replaceState({}, '', path);
  } else {
    window.history.pushState({}, '', path);
    // Only a real navigation should move the reader. A canonicalising
    // replace happens on first paint, where scrolling to the top is either a
    // no-op or an unexplained jump.
    window.scrollTo(0, 0);
  }

  window.dispatchEvent(new Event(ROUTE_CHANGE));
}

export default function useRoute() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const sync = () => setPath(window.location.pathname);
    // popstate covers the back button; the custom event covers our own
    // pushState/replaceState, neither of which fires popstate.
    window.addEventListener('popstate', sync);
    window.addEventListener(ROUTE_CHANGE, sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener(ROUTE_CHANGE, sync);
    };
  }, []);

  return parseRoute(path);
}
