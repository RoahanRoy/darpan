/* Turns a URL's { stateSlug, areaSlug } into what the home page should show.

   This lives outside the component because it is the load-bearing decision on
   the page and it is worth testing directly: every wrong answer here shows a
   reader figures for somewhere they did not ask about, which is the one thing
   this site must not do. The component renders whatever this returns.

   Statuses:
     pending        regions have not arrived; decide nothing yet
     choose         the URL names no state, so ask for one
     unknown-state  the URL names a state we do not list
     no-areas       the state is listed but has no districts loaded
     canonicalise   a state with no area; redirect to a full address
     unknown-area   the state is real, the area is not one of its own
     ok             both resolved
*/

// The capital, and the area most likely to be looked for. Without it a bare
// state path lands on whichever district the source annexure happens to list
// first, which for Uttarakhand is Uttarkashi — an arbitrary front page.
export const DEFAULT_AREA = 'dehradun';

export function resolveRegion(regions, stateSlug, areaSlug) {
  if (regions.length === 0) return { status: 'pending' };

  /* A bare `/` names no state, and is answered by asking for one rather than
     choosing. It used to redirect to Uttarakhand, which was defensible when
     the site held two states and became wrong the moment it held thirty-six:
     every reader landed on one particular state's page, with that state's
     name in the picker, and nothing on screen said the choice was arbitrary
     rather than theirs. There is no non-arbitrary default, so none is
     invented. */
  if (!stateSlug) return { status: 'choose' };

  const state = regions.find((s) => s.slug === stateSlug);
  if (!state) return { status: 'unknown-state' };
  if (state.districts.length === 0) return { status: 'no-areas', state };

  /* A state named without an area: send the reader to a full address rather
     than leaving them on a URL that names less than the page shows.

     The lookup is confined to the state that resolved, which is what makes
     the fallback safe. Area slugs are NOT unique across states — Bilaspur is
     in both Himachal Pradesh and Chhattisgarh — so searching the whole
     country for the preferred one could land a reader in a state they did not
     ask for. A state with no area of that name falls back to its own first. */
  if (!areaSlug) {
    const preferred = state.districts.find((d) => d.slug === DEFAULT_AREA);
    return { status: 'canonicalise', state, area: preferred ?? state.districts[0] };
  }

  const area = state.districts.find((d) => d.slug === areaSlug);
  if (!area) return { status: 'unknown-area', state };

  return { status: 'ok', state, area };
}
