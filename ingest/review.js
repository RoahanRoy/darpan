/* The human gate. Nothing an adapter produces reaches a reader without
   passing through here.

   Usage:
     npm run ingest:review -- list                  runs awaiting review
     npm run ingest:review -- show <runId>          proposals, with diffs
     npm run ingest:review -- note <factId> "text"  write the provision gloss
     npm run ingest:review -- approve <runId> [--key "uttarakhand|Police"]
     npm run ingest:review -- reject  <runId> [--key ...] [--note "why"]
     npm run ingest:review -- promote <runId>       approved rows go live
*/

import { execSync } from 'node:child_process';
import { pool, withTransaction } from './lib/db.js';
import { promoterFor } from './promoters/index.js';

const [command, ...rest] = process.argv.slice(2);
const positional = rest.filter((a) => !a.startsWith('--'));
const flags = {};
for (let i = 0; i < rest.length; i++) {
  if (rest[i].startsWith('--')) flags[rest[i].slice(2)] = rest[i + 1];
}

function reviewer() {
  if (flags.by) return flags.by;
  try {
    return execSync('git config user.email', { encoding: 'utf8' }).trim();
  } catch {
    return process.env.USER ?? 'unknown';
  }
}

const money = (v) => (v == null ? '—' : Number(v).toLocaleString('en-IN'));

async function list() {
  const { rows } = await pool.query(`
    SELECT r.id, r.adapter, r.status, r.started_at, r.counts, r.error,
           count(f.id) FILTER (WHERE f.status = 'pending')  AS pending,
           count(f.id) FILTER (WHERE f.status = 'approved') AS approved
    FROM ingestion_runs r
    LEFT JOIN staged_facts f ON f.run_id = r.id
    GROUP BY r.id
    ORDER BY r.id DESC
    LIMIT 20
  `);

  if (!rows.length) return console.log('no runs yet');

  for (const r of rows) {
    const when = new Date(r.started_at).toISOString().slice(0, 16).replace('T', ' ');
    console.log(
      `${String(r.id).padStart(4)}  ${when}  ${r.adapter.padEnd(20)} ${r.status.padEnd(7)}` +
        ` ${r.pending} pending, ${r.approved} approved`
    );
    if (r.error) console.log(`      ! ${r.error.split('\n')[0]}`);
  }
}

async function show(runId) {
  const { rows: docs } = await pool.query(
    `SELECT url, source_slug, source_title, source_publisher,
            document_date::text, document_date_is_inferred, sha256, byte_size
     FROM raw_documents WHERE run_id = $1`,
    [runId]
  );

  for (const d of docs) {
    console.log(`\n${d.source_title}`);
    console.log(`  ${d.source_publisher} · ${d.url}`);
    console.log(
      `  document date: ${d.document_date ?? 'NOT FOUND — must be set before promotion'}` +
        `${d.document_date_is_inferred ? ' (inferred)' : ''}`
    );
    console.log(`  ${d.byte_size} bytes · sha256 ${d.sha256.slice(0, 16)}…`);
  }

  const { rows } = await pool.query(
    `SELECT id, target_table, natural_key, payload, previous_payload, diff_kind, status
     FROM staged_facts
     WHERE run_id = $1 AND status IN ('pending', 'approved')
     ORDER BY target_table, id`,
    [runId]
  );

  if (!rows.length) return console.log('\nnothing awaiting review in this run');

  console.log('');
  for (const f of rows) {
    const p = f.payload;
    const mark = f.status === 'approved' ? '✓' : f.diff_kind === 'new' ? '+' : '~';
    console.log(`${mark} [${f.id}] ${f.natural_key}  (${f.diff_kind})`);
    console.log(
      `      actuals ${money(p.actuals_prev_cr)} · BE ${money(p.budgeted_cr)} · ` +
        `RE ${money(p.revised_cr)} · next BE ${money(p.next_budget_cr)}`
    );

    if (f.previous_payload) {
      const q = f.previous_payload;
      for (const k of Object.keys(p)) {
        if (k.startsWith('_') || !(k in q)) continue;
        if (String(q[k]) !== String(p[k])) {
          console.log(`      changed ${k}: ${q[k] ?? '—'} → ${p[k] ?? '—'}`);
        }
      }
    }

    if (p._provision_fragments) {
      console.log(`      source text: ${p._provision_fragments}`);
    }
    if (!p.provision_note) {
      console.log(`      provision_note: unset — npm run ingest:review -- note ${f.id} "…"`);
    } else {
      console.log(`      provision_note: ${p.provision_note}`);
    }
  }

  console.log(`\napprove all: npm run ingest:review -- approve ${runId}`);
}

/* The provision gloss is written here, by hand, from the source text printed
   above. The adapter deliberately does not compose it: see the note in
   ingest/adapters/prs-state-budget.js. */
async function note(factId, text) {
  if (!text) throw new Error('usage: note <factId> "the one-line gloss"');
  const { rowCount } = await pool.query(
    `UPDATE staged_facts
     SET payload = jsonb_set(payload, '{provision_note}', to_jsonb($2::text))
     WHERE id = $1 AND status = 'pending'`,
    [factId, text]
  );
  console.log(rowCount ? `set provision_note on ${factId}` : `no pending fact ${factId}`);
}

async function decide(runId, status) {
  const { rowCount } = await pool.query(
    `UPDATE staged_facts
     SET status = $2, reviewed_by = $3, reviewed_at = now(), review_note = $4
     WHERE run_id = $1 AND status = 'pending'
       AND ($5::text IS NULL OR natural_key = $5)`,
    [runId, status, reviewer(), flags.note ?? null, flags.key ?? null]
  );
  console.log(`${status} ${rowCount} row(s)`);
}

async function promote(runId) {
  const promoted = await withTransaction(async (client) => {
    const { rows: facts } = await client.query(
      `SELECT f.id, f.target_table, f.natural_key, f.payload, f.raw_document_id
       FROM staged_facts f
       WHERE f.run_id = $1 AND f.status = 'approved'
       ORDER BY f.id
       FOR UPDATE`,
      [runId]
    );

    if (!facts.length) {
      console.log('nothing approved in this run');
      return 0;
    }

    // One `sources` row per raw document, created on first use. This is where
    // the schema's rule — no figure without a document behind it — is
    // actually enforced: a fact cannot be landed except with a source_id, and
    // a source_id cannot exist without a document date.
    const sourceIds = new Map();

    for (const fact of facts) {
      let sourceId = sourceIds.get(fact.raw_document_id);

      if (!sourceId) {
        const { rows: docs } = await client.query(
          `SELECT * FROM raw_documents WHERE id = $1`,
          [fact.raw_document_id]
        );
        const doc = docs[0];
        if (!doc) throw new Error(`fact ${fact.id} has no raw document`);
        if (!doc.document_date) {
          throw new Error(
            `raw document ${doc.id} (${doc.url}) has no document_date. ` +
              'Set it by hand before promoting — fetched_at is not a substitute.'
          );
        }

        const { rows: src } = await client.query(
          `INSERT INTO sources
             (slug, title, publisher, url, document_date,
              document_date_is_inferred, retrieved_on, note)
           VALUES ($1,$2,$3,$4,$5,$6,$7::date,$8)
           ON CONFLICT (slug) DO UPDATE SET
             title = EXCLUDED.title, publisher = EXCLUDED.publisher,
             url = EXCLUDED.url, document_date = EXCLUDED.document_date,
             document_date_is_inferred = EXCLUDED.document_date_is_inferred,
             retrieved_on = EXCLUDED.retrieved_on, note = EXCLUDED.note
           RETURNING id`,
          [
            doc.source_slug, doc.source_title, doc.source_publisher, doc.url,
            doc.document_date, doc.document_date_is_inferred,
            doc.fetched_at, doc.source_note,
          ]
        );
        sourceId = src[0].id;
        sourceIds.set(fact.raw_document_id, sourceId);
      }

      await promoterFor(fact.target_table).promote(client, {
        payload: fact.payload,
        sourceId,
      });

      await client.query(
        `UPDATE staged_facts SET status = 'promoted', promoted_at = now() WHERE id = $1`,
        [fact.id]
      );
    }

    return facts.length;
  });

  if (promoted) console.log(`promoted ${promoted} row(s) — they are now on the page`);
}

try {
  switch (command) {
    case 'list': await list(); break;
    case 'show': await show(Number(positional[0])); break;
    case 'note': await note(Number(positional[0]), positional[1]); break;
    case 'approve': await decide(Number(positional[0]), 'approved'); break;
    case 'reject': await decide(Number(positional[0]), 'rejected'); break;
    case 'promote': await promote(Number(positional[0])); break;
    default:
      console.error(
        'commands: list | show <runId> | note <factId> "text" | ' +
          'approve <runId> | reject <runId> | promote <runId>'
      );
      process.exitCode = 1;
  }
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
