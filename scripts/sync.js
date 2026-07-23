/* Applies the prose stores in git to the database, or reports the difference.

   Usage:
     npm run db:sync                    apply every store
     npm run db:sync -- --dry           say what would change, write nothing
     npm run db:sync -- --check         fail if any store and the database differ
     npm run db:sync -- glosses         one store; ids are in scripts/lib/stores.js

   The per-store commands still exist and are unchanged in behaviour —
   `npm run gloss:apply`, `findings:check` and so on now name this script with
   a store id. What is new is being able to ask about all three at once, which
   is what a rebuild and the weekly drift workflow both actually want to know.

   Direction is one-way on purpose. The file is authoritative and the database
   is the copy, so a difference is repaired by writing the file to the database
   and never the other way round. When the database is the side holding work
   that was never written back, this script is the wrong tool and --check
   saying so is the point at which a person should stop and look. */

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, withTransaction } from '../ingest/lib/db.js';
import { STORES, changedStates, columnDiff, groupBySlug } from './lib/stores.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry');
const checkOnly = args.includes('--check');
const named = args.filter((a) => !a.startsWith('--'));

const selected = named.length
  ? named.map((id) => {
      const s = STORES.find((x) => x.id === id);
      if (!s) {
        console.error(`no such store: ${id} (have ${STORES.map((x) => x.id).join(', ')})`);
        process.exit(2);
      }
      return s;
    })
  : STORES;

const load = async (store) => {
  const raw = JSON.parse(await readFile(join(root, store.file), 'utf8'));
  return raw[store.jsonKey];
};

/** Slug → id maps for the tables a store's rows point at. */
async function resolveRefs(names) {
  const refs = {};
  for (const table of names) {
    const { rows } = await pool.query(`SELECT id, slug FROM ${table}`);
    refs[table] = new Map(rows.map((r) => [r.slug, r.id]));
  }
  return refs;
}

/* Returns true if the store and the database agree. Printing happens here
   rather than at the end because the output is a report a person reads in
   order, not a value anything computes on. */
async function syncRows(store) {
  const data = await load(store);
  const slugs = Object.keys(data);
  const refs = await resolveRefs(store.refs);

  // Every reference in the whole store is checked before a single row is
  // written. Landing the states that happen to resolve would leave the
  // database in a state no file describes.
  const unresolved = [];
  for (const [slug, list] of Object.entries(data)) {
    if (!refs.states.has(slug)) unresolved.push(`no such state: ${slug}`);
    if (store.validate) unresolved.push(...store.validate(list, slug, refs));
  }
  if (unresolved.length) {
    console.error(`${store.file} references rows that do not exist:`);
    for (const u of unresolved) console.error(`  ${u}`);
    return false;
  }

  const { rows: live } = await pool.query(store.liveSql, [slugs]);
  const changed = changedStates({ store: data, live, fields: store.fields, sort: store.sort });
  const total = Object.values(data).reduce((n, l) => n + l.length, 0);
  const liveByState = groupBySlug(live);

  console.log(
    `${total} ${store.plural} in the store across ${slugs.length} state(s) · ` +
      `${live.length} row(s) live`
  );

  if (checkOnly) {
    if (changed.length) {
      console.error(`${changed.length} state(s) differ from the store: ${changed.join(', ')}`);
    } else {
      console.log(`database matches ${store.file}`);
    }
    return changed.length === 0;
  }

  if (dryRun) {
    for (const slug of changed) {
      const had = (liveByState.get(slug) ?? []).length;
      console.log(`${slug}: would replace ${had} with ${data[slug].length}`);
      for (const item of store.sort(data[slug])) console.log(`    ${store.describe(item)}`);
    }
    console.log(`${changed.length} state(s) would change; nothing written`);
    return true;
  }

  // One transaction for the whole store: a delete that commits without its
  // insert is the failure this is here to prevent.
  const written = await withTransaction(async (client) => {
    let n = 0;
    for (const slug of changed) {
      const stateId = refs.states.get(slug);

      await client.query(
        `DELETE FROM ${store.table} WHERE state_id = $1 ${store.deleteWhere}`,
        [stateId]
      );

      let order = 0;
      if (store.appendAfterExisting) {
        const { rows } = await client.query(
          `SELECT COALESCE(max(display_order), 0) AS n FROM ${store.table} WHERE state_id = $1`,
          [stateId]
        );
        order = Number(rows[0].n);
      }

      const cols = ['state_id', ...store.columns, 'display_order'];
      const params = cols.map((_, i) => `$${i + 1}`).join(',');

      for (const item of store.sort(data[slug])) {
        await client.query(
          `INSERT INTO ${store.table} (${cols.join(',')}) VALUES (${params})`,
          [stateId, ...store.values(item, refs), ++order]
        );
        n++;
      }
    }
    return n;
  });

  console.log(`wrote ${written} ${store.plural} across ${changed.length} state(s)`);
  return true;
}

async function syncColumn(store) {
  const data = await load(store);
  const { rows: live } = await pool.query(store.liveSql);
  const { toWrite, unmatched, ungiven } = columnDiff({
    store: data, live, column: store.column,
  });

  console.log(
    `${live.length} live rows · ${Object.keys(data).length} ${store.plural} in the store · ` +
      `${ungiven.length} rows with none`
  );

  if (unmatched.length) {
    console.error(`${unmatched.length} ${store.plural} match no row — sector renamed?`);
    for (const k of unmatched) console.error(`  ${k}`);
  }

  if (checkOnly) {
    if (toWrite.length) {
      console.error(`${toWrite.length} row(s) differ from the store:`);
      for (const w of toWrite) console.error(`  ${w.key}`);
    }
    if (!toWrite.length && !unmatched.length) console.log(`database matches ${store.file}`);
    return !toWrite.length && !unmatched.length;
  }

  if (dryRun) {
    for (const w of toWrite) console.log(`would set ${w.key}\n    ${w.text}`);
    console.log(`${toWrite.length} row(s) would change; ${ungiven.length} have no ${store.noun}`);
  } else {
    for (const w of toWrite) {
      await pool.query(
        `UPDATE ${store.table} SET ${store.column} = $2 WHERE id = $1`,
        [w.id, w.text]
      );
    }
    console.log(`wrote ${toWrite.length} ${store.plural}; ${ungiven.length} rows have none`);
  }

  // An unmatched key fails an apply as well as a check. The write that did
  // happen was still correct, but a gloss that reached no row is prose lost
  // unless somebody is told.
  return unmatched.length === 0;
}

let ok = true;
for (const store of selected) {
  if (selected.length > 1) console.log(`\n── ${store.id} ──`);
  const passed = store.strategy === 'rows' ? await syncRows(store) : await syncColumn(store);
  if (!passed) ok = false;
}

if (!ok) process.exitCode = 1;
await pool.end();
