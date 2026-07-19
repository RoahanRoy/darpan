/* Contract checks for the API handlers that need no database.

   Every handler is imported, which alone catches the class of mistake CI is
   here to stop: a syntax error, a bad import path, or a renamed export
   reaching production because the frontend build does not compile api/.

   Method handling is checked for real. The three handlers are read-only
   endpoints over public records; a write verb reaching one should be refused
   before it can touch anything, and the refusal is asserted rather than
   assumed. Nothing here connects to Postgres — a rejected method returns
   before any query — so these run in CI with no database. */

import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost/none';

const HANDLERS = ['home', 'parliament', 'regions'];

/** Minimal Vercel-shaped res that records what the handler did to it. */
function mockRes() {
  const res = {
    statusCode: null,
    headers: {},
    body: null,
    setHeader(k, v) {
      res.headers[k.toLowerCase()] = v;
      return res;
    },
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(payload) {
      res.body = payload;
      return res;
    },
  };
  return res;
}

for (const name of HANDLERS) {
  test(`api/${name}.js exports a handler function`, async () => {
    const mod = await import(`../api/${name}.js`);
    assert.equal(typeof mod.default, 'function', 'default export must be the handler');
  });

  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    test(`api/${name}.js refuses ${method}`, async () => {
      const { default: handler } = await import(`../api/${name}.js`);
      const res = mockRes();
      await handler({ method, url: `/api/${name}`, headers: { host: 'localhost' } }, res);

      assert.equal(res.statusCode, 405);
      // Required by RFC 9110 on a 405, and it is what tells a client the
      // endpoint exists rather than that it guessed the path wrong.
      assert.equal(res.headers.allow, 'GET');
    });
  }
}
