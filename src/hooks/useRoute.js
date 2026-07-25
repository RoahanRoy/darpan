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

// An anchor on a page we are also navigating to cannot be scrolled to until
// that page has mounted, so the scroll waits for the next frame. One retry
// covers a cross-page jump, where the target renders a commit later than the
// route change that asked for it.
function scrollToAnchor(id, attempts = 2) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView();
  } else if (attempts > 0) {
    requestAnimationFrame(() => scrollToAnchor(id, attempts - 1));
  }
}

export function navigate(path, { replace = false, hash = '' } = {}) {
  const samePath = path === window.location.pathname;
  // Nothing to do when neither the page nor a scroll target would change.
  if (samePath && !hash) return;

  // pushState keeps the hash in the address bar; the parser only ever reads
  // window.location.pathname, so the fragment never reaches routing.
  const url = hash ? `${path}#${hash}` : path;
  if (replace) {
    window.history.replaceState({}, '', url);
  } else {
    window.history.pushState({}, '', url);
  }

  if (!samePath) window.dispatchEvent(new Event(ROUTE_CHANGE));

  if (hash) {
    requestAnimationFrame(() => scrollToAnchor(hash));
  } else if (!replace) {
    // Only a real navigation should move the reader. A canonicalising
    // replace happens on first paint, where scrolling to the top is either a
    // no-op or an unexplained jump.
    window.scrollTo(0, 0);
  }
}

/* The click handler every in-app link needs, in one place.

   Two things it must not do. It must not take over a modified click — those
   are the reader asking for a new tab, and stealing them breaks an
   affordance the browser owns. And it must not be used INSTEAD of a real
   href: the anchor carries the address whether or not this ever fires, which
   is what makes the link crawlable, hoverable and middle-clickable. */
export function handleRouteClick(event, href, hash = '') {
  if (!href || !href.startsWith('/')) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (event.button !== 0) return;
  event.preventDefault();
  navigate(href, hash ? { hash } : undefined);
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
