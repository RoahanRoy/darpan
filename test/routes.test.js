/* The URL parser, which decides what every address on the site means.

   Worth pinning tightly: these are the site's public links. A parse that
   changes shape silently turns every shared URL into a different page, and
   the failure shows up as readers landing on the wrong state's figures rather
   than as an error anyone would notice. */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseRoute, homePath, ministryPath } from '../src/lib/routes.js';

test('the bare path names no state, leaving the default to the page', () => {
  const bare = { page: 'home', stateSlug: null, areaSlug: null, ministrySlug: null };
  assert.deepEqual(parseRoute('/'), bare);
  assert.deepEqual(parseRoute(''), bare);
});

test('one segment is a state, two are a state and an area', () => {
  assert.deepEqual(parseRoute('/uttarakhand'), {
    page: 'home',
    stateSlug: 'uttarakhand',
    areaSlug: null,
    ministrySlug: null,
  });
  assert.deepEqual(parseRoute('/uttarakhand/dehradun'), {
    page: 'home',
    stateSlug: 'uttarakhand',
    areaSlug: 'dehradun',
    ministrySlug: null,
  });
});

test('reserved paths are pages, not states', () => {
  assert.equal(parseRoute('/parliament').page, 'parliament');
  assert.equal(parseRoute('/about').page, 'about');
  // They carry no region, or the page would inherit whatever the last URL said.
  assert.equal(parseRoute('/about').stateSlug, null);
});

test('trailing slashes and repeated separators do not change the route', () => {
  // A trailing slash is the commonest way a shared link differs from ours; it
  // must not resolve to a different page.
  assert.deepEqual(parseRoute('/uttarakhand/dehradun/'), parseRoute('/uttarakhand/dehradun'));
  assert.deepEqual(parseRoute('//uttarakhand//dehradun'), parseRoute('/uttarakhand/dehradun'));
  assert.equal(parseRoute('/parliament/').page, 'parliament');
});

test('slugs are lowercased and percent-decoding is undone', () => {
  assert.deepEqual(parseRoute('/Uttarakhand/Dehradun'), parseRoute('/uttarakhand/dehradun'));
  assert.equal(parseRoute('/delhi/south%2Ddelhi%2Dmcd').areaSlug, 'south-delhi-mcd');
});

test('extra segments beyond the area are ignored rather than failing', () => {
  const route = parseRoute('/uttarakhand/dehradun/anything/else');
  assert.equal(route.stateSlug, 'uttarakhand');
  assert.equal(route.areaSlug, 'dehradun');
});

test('an unknown first segment is reported as a state, not swallowed', () => {
  // The parser cannot know which states exist — /api/regions has not answered
  // yet. Reporting the slug is what lets the page say "no records for bihar"
  // instead of quietly showing a state the reader did not ask for.
  assert.deepEqual(parseRoute('/bihar'), {
    page: 'home',
    stateSlug: 'bihar',
    areaSlug: null,
    ministrySlug: null,
  });
});

test('homePath builds what parseRoute reads', () => {
  assert.equal(homePath('uttarakhand', 'dehradun'), '/uttarakhand/dehradun');
  assert.equal(homePath('uttarakhand'), '/uttarakhand');
  assert.equal(homePath(null), '/');
});

test('homePath and parseRoute round-trip', () => {
  for (const [state, area] of [
    ['uttarakhand', 'dehradun'],
    ['delhi', 'south-delhi-mcd'],
    ['uttarakhand', undefined],
  ]) {
    const route = parseRoute(homePath(state, area));
    assert.equal(route.stateSlug, state);
    assert.equal(route.areaSlug, area ?? null);
  }
});

test('a second segment under /parliament names a ministry', () => {
  const route = parseRoute('/parliament/jal-shakti');
  assert.equal(route.page, 'parliament');
  assert.equal(route.ministrySlug, 'jal-shakti');
  // Still no region. The union budget does not decompose by state, and a
  // stray stateSlug here would let the masthead's picker light up on a page
  // that has nothing to filter.
  assert.equal(route.stateSlug, null);
});

test('/parliament alone names no ministry', () => {
  assert.equal(parseRoute('/parliament').ministrySlug, null);
  assert.equal(parseRoute('/parliament/').ministrySlug, null);
});

test('/about ignores a second segment rather than reading it as a ministry', () => {
  assert.equal(parseRoute('/about/defence').ministrySlug, null);
  assert.equal(parseRoute('/about/defence').page, 'about');
});

test('ministryPath builds what parseRoute reads, and nothing for the residual', () => {
  assert.equal(ministryPath('home-affairs'), '/parliament/home-affairs');
  assert.equal(parseRoute(ministryPath('home-affairs')).ministrySlug, 'home-affairs');
  // 'Other Ministries' carries a NULL slug and must not get a URL.
  assert.equal(ministryPath(null), null);
  assert.equal(ministryPath(undefined), null);
});
