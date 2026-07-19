import { useEffect } from 'react';

/* Per-page title, description and canonical URL.

   The site is client-rendered, so index.html can only carry one generic set
   of tags. Every page sharing them means a search result for Delhi's records
   is titled the same as one for the union budget, and a shared link previews
   identically wherever it points. This writes the real ones once the page
   knows what it is showing.

   The tags are updated rather than appended, so switching state does not
   leave a stack of descriptions behind. Ones that index.html does not already
   carry are created on first use.

   This is not a substitute for server-rendered HTML — a crawler that does not
   execute JavaScript still sees the generic tags. It is the useful half of
   the fix, and the half that does not require moving data fetching to build
   time. */

const OG_PREFIX = 'og:';

/** Finds a meta tag by name or property, creating it if it does not exist. */
function upsertMeta(key, content) {
  const attr = key.startsWith(OG_PREFIX) ? 'property' : 'name';
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export default function useDocumentMeta({ title, description }) {
  useEffect(() => {
    // A page still resolving what it holds passes no title; leaving the
    // previous one up is better than flashing a wrong one.
    if (!title) return;

    document.title = title;
    upsertMeta('og:title', title);
    upsertMeta('twitter:title', title);

    if (description) {
      upsertMeta('description', description);
      upsertMeta('og:description', description);
      upsertMeta('twitter:description', description);
    }

    // Built from the live location so it is correct on preview deployments
    // and on localhost, neither of which knows the production domain.
    const url = window.location.origin + window.location.pathname;
    upsertCanonical(url);
    upsertMeta('og:url', url);
  }, [title, description]);
}
