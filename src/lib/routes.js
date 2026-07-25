/* URL shapes for the whole site.

   State and area used to live in React state, which meant every reader saw
   the same URL whatever they were looking at: a link to Delhi's records could
   not be sent to anyone, the back button ignored the picker, and a crawler
   only ever saw Dehradun. For a site whose entire claim is "check this
   yourself", the address bar has to name what is on screen.

     /                      names no state; the page asks for one
     /uttarakhand           a state; canonicalised to its first area
     /uttarakhand/dehradun  a state and one of its areas
     /parliament            the union budget
     /parliament/defence    one ministry's spending, opened out
     /about                 how the records are chosen and checked

   Parsing here is deliberately dumb: it does not know which states exist,
   because the parser runs before /api/regions has answered. It reports what
   the URL says and the page decides whether that names anything real. An
   unknown state must reach the reader as "we do not hold Bihar", never as a
   silent fallback to a state they did not ask for. */

// Paths that are pages in their own right, so no state may be named for one.
// State slugs come from a column we control, which is what makes this safe to
// keep as a short list rather than a namespace prefix on every state URL.
//
// /api needs no entry: the rewrite sends those paths to the functions, so
// they never reach this parser. A hand-typed /api falls through to the state
// branch and is reported as a state we do not hold, which is true.
const RESERVED = new Set(['parliament', 'about']);

/** Splits a pathname into { page, stateSlug, areaSlug, ministrySlug }. */
export function parseRoute(pathname) {
  const [first, second] = String(pathname || '/')
    .split('/')
    .filter(Boolean)
    .map((s) => decodeURIComponent(s).toLowerCase());

  if (first && RESERVED.has(first)) {
    /* Only /parliament reads its second segment, and it reads it as a
       ministry. /about takes none: a second segment there is a URL nobody
       published, and answering it with the same page under a different
       address is how two addresses come to hold one document. */
    return {
      page: first,
      stateSlug: null,
      areaSlug: null,
      ministrySlug: first === 'parliament' ? (second ?? null) : null,
    };
  }

  return {
    page: 'home',
    stateSlug: first ?? null,
    areaSlug: second ?? null,
    ministrySlug: null,
  };
}

/** The canonical path for a state, or a state and one of its areas. */
export function homePath(stateSlug, areaSlug) {
  if (!stateSlug) return '/';
  return areaSlug ? `/${stateSlug}/${areaSlug}` : `/${stateSlug}`;
}

/* The canonical path for a ministry, and null for a row that has none — the
   published residual, which is not a ministry. Returning null rather than
   '/parliament' is deliberate: the caller has to decide what an unopenable
   row looks like, and a link that silently goes back to the page you are on
   is the worst of the options. */
export function ministryPath(slug) {
  return slug ? `/parliament/${slug}` : null;
}
