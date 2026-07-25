/* Reports, and on request removes, the pipeline scratch nothing needs.

   Usage:
     npm run db:prune            report what could be freed; write nothing
     npm run db:prune -- --apply actually free it

   Reporting by default is the point. This is the only script here that
   destroys anything, everything it touches is unrecoverable without
   re-fetching documents that may have moved, and the amounts involved are
   megabytes — never urgent enough to justify a command that acts before it
   is read. `--apply` has to be typed.

   Two things accumulate, and neither is on any page:

   `raw_documents.extracted_text` is the text of every PDF the ingester has
   parsed, kept — per 002 — "so a bad figure is diagnosable later without
   re-fetching a document that may have changed or moved". That is a real
   purpose and this script does not undo it. It only clears the text of runs
   that have been SUPERSEDED: where a later successful run of the same
   adapter and target has replaced their figures. Diagnosing a figure means
   diagnosing the figure on the site, and that comes from the current run,
   whose text is always kept. Nothing else in the codebase reads the column
   at all — it is written by ingest/run.js and read by a person.

   `staged_facts` from superseded runs are proposals already decided:
   promoted into public tables or rejected in review. ingest/review.js reads
   them only by run_id while a run is being worked, so a decided run's rows
   are history. Runs themselves are kept — ingestion_runs is the log of what
   happened and is tiny.

   The safety rule: a run is only ever touched when a LATER successful run of
   the same adapter and target exists. The newest run of anything is never
   pruned, whatever its age, so a state ingested once years ago keeps its
   evidence. */

import { pool } from '../ingest/lib/db.js';

const apply = process.argv.includes('--apply');

/* The runs whose figures are live: the newest successful run per adapter and
   target. COALESCE because target_key is NULL for adapters that take no
   argument, and NULL never groups with itself. */
const LATEST = `
  SELECT DISTINCT ON (adapter, COALESCE(target_key, '')) id
  FROM ingestion_runs
  WHERE status = 'ok'
  ORDER BY adapter, COALESCE(target_key, ''), started_at DESC
`;

const { rows: [before] } = await pool.query(`
  SELECT pg_size_pretty(pg_total_relation_size('raw_documents')
                      + pg_total_relation_size('staged_facts')) AS scratch,
         pg_size_pretty(pg_database_size(current_database()))   AS db
`);

const { rows: [text] } = await pool.query(`
  WITH latest AS (${LATEST})
  SELECT count(*) AS docs,
         COALESCE(pg_size_pretty(sum(length(extracted_text))::bigint), '0 bytes') AS bytes
  FROM raw_documents
  WHERE extracted_text IS NOT NULL AND run_id NOT IN (SELECT id FROM latest)
`);

const { rows: [facts] } = await pool.query(`
  WITH latest AS (${LATEST})
  SELECT count(*) AS rows,
         COALESCE(pg_size_pretty(sum(pg_column_size(payload)
           + pg_column_size(COALESCE(previous_payload, '{}'::jsonb)))::bigint), '0 bytes') AS bytes
  FROM staged_facts
  WHERE run_id NOT IN (SELECT id FROM latest)
`);

console.log(`database ${before.db}, of which ${before.scratch} is pipeline scratch`);
console.log(`superseded document text : ${text.docs} document(s), ${text.bytes}`);
console.log(`superseded staged facts  : ${facts.rows} row(s), ${facts.bytes}`);

if (!apply) {
  console.log('\nnothing written. re-run with --apply to free it.');
  await pool.end();
  process.exit(0);
}

/* One transaction, and the facts go before the text. Both are independent,
   but a half-done prune that had dropped evidence while leaving the
   proposals it explains is the more confusing of the two states to land in. */
const freed = await (async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const f = await client.query(
      `WITH latest AS (${LATEST})
       DELETE FROM staged_facts WHERE run_id NOT IN (SELECT id FROM latest)`
    );
    const t = await client.query(
      `WITH latest AS (${LATEST})
       UPDATE raw_documents SET extracted_text = NULL
       WHERE extracted_text IS NOT NULL AND run_id NOT IN (SELECT id FROM latest)`
    );
    await client.query('COMMIT');
    return { facts: f.rowCount, docs: t.rowCount };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
})();

/* VACUUM cannot run inside a transaction, and without it the pages the
   delete freed stay allocated to the table — the row count falls and the
   size does not, which looks exactly like the prune having failed. */
await pool.query('VACUUM (ANALYZE) staged_facts');
await pool.query('VACUUM (ANALYZE) raw_documents');

const { rows: [after] } = await pool.query(`
  SELECT pg_size_pretty(pg_total_relation_size('raw_documents')
                      + pg_total_relation_size('staged_facts')) AS scratch,
         pg_size_pretty(pg_database_size(current_database()))   AS db
`);

console.log(`\ncleared text on ${freed.docs} document(s), deleted ${freed.facts} staged fact(s)`);
console.log(`pipeline scratch ${before.scratch} → ${after.scratch}; database ${before.db} → ${after.db}`);

await pool.end();
