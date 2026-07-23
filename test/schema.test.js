/* Checks on normalize(), the one part of the schema snapshot with logic.

   Its whole job is to make two dumps of the same schema compare equal by
   discarding the parts pg_dump changes between runs. If it strips too little,
   schema:check goes red on a timestamp; if it strips too much, a real schema
   change slips past. Both are quiet, so both are pinned here.

   No database and no pg_dump — normalize takes a string. */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { normalize } from '../scripts/schema.js';

test('two dumps differing only in the header normalize equal', () => {
  const body = 'CREATE TABLE public.states (\n    id integer NOT NULL\n);';
  const dumpA = [
    '--',
    '-- PostgreSQL database dump',
    '--',
    "\\restrict aB3xY",
    '',
    'SET statement_timeout = 0;',
    "SELECT pg_catalog.set_config('search_path', '', false);",
    '',
    '-- Name: states; Type: TABLE; Schema: public; Owner: -',
    body,
    '',
    "\\unrestrict aB3xY",
  ].join('\n');
  const dumpB = [
    '--',
    '-- PostgreSQL database dump',
    '--',
    "\\restrict Zq99Kp", // different token
    '',
    'SET statement_timeout = 0;',
    "SELECT pg_catalog.set_config('search_path', '', false);",
    '',
    '-- Name: states; Type: TABLE; Schema: public; Owner: -',
    body,
    '',
    "\\unrestrict Zq99Kp",
  ].join('\n');

  assert.equal(normalize(dumpA), normalize(dumpB));
  assert.equal(normalize(dumpA), body);
});

test('a real DDL change survives normalization', () => {
  const before = normalize('CREATE TABLE public.states (\n    id integer NOT NULL\n);');
  const after = normalize('CREATE TABLE public.states (\n    id bigint NOT NULL\n);');
  assert.notEqual(before, after);
});

test('trailing whitespace does not count as a difference', () => {
  assert.equal(normalize('CREATE TABLE x ();   '), normalize('CREATE TABLE x ();'));
});

test('a comment that happens to look like DDL is still stripped', () => {
  assert.equal(normalize('-- CREATE TABLE decoy ();'), '');
});

test('SET inside a normal statement is not mistaken for a session SET line', () => {
  // The filter anchors SET to the start of a line, so an ALTER ... SET
  // DEFAULT — which pg_dump does emit — must be kept.
  const ddl = 'ALTER TABLE public.states ALTER COLUMN id SET DEFAULT 1;';
  assert.equal(normalize(ddl), ddl);
});
