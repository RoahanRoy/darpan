/* The human gate. Nothing an adapter produces reaches a reader without
   passing through here.

   Usage:
     npm run ingest:review -- list                  runs awaiting review
     npm run ingest:review -- show <runId>          proposals, with diffs
     npm run ingest:review -- note <factId> "text"  write the provision gloss
     npm run ingest:review -- approve <runId> [--key "uttarakhand|Police"]
     npm run ingest:review -- reject  <runId> [--key ...] [--note "why"]
     npm run ingest:review -- promote <runId>       approved rows go live
     npm run ingest:review -- gloss <rowId> "text"  the gloss, on a live row
     npm run ingest:review -- orphans <runId>       what the run would strand
     npm run ingest:review -- retire  <runId>       delete those stranded rows

   `promote` refuses a run that would strand a row and explains why; add
   --retire-orphans once you have looked at them and agree they should go.
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

    // Printed before anything else on the row, because it is the reason this
    // row needs a person rather than a glance.
    for (const w of p._warnings ?? []) {
      console.log(`      ⚠ ${w}`);
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

/* The published-row counterpart of `note`. `note` writes the gloss on a fact
   still in staging; this writes it on a row already on the page — needed when
   a sector is renamed and the gloss has to follow the figures to their new
   row, and when a state lands without glosses and someone writes them from
   the paper afterwards. */
async function gloss(rowId, text) {
  if (!text) throw new Error('usage: gloss <rowId> "the one-line gloss"');
  const { rowCount } = await pool.query(
    `UPDATE state_sector_budgets SET provision_note = $2 WHERE id = $1`,
    [rowId, text]
  );
  console.log(rowCount ? `set provision_note on row ${rowId}` : `no such row ${rowId}`);
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

/* Asks each promoter involved in a run what the run would strand.

   Grouped by target table because the question only makes sense per table:
   what counts as a complete set, and therefore what counts as left over, is
   the promoter's judgement and nothing else's. A promoter that does not
   publish sets omits findOrphans and is skipped. */
async function collectOrphans(client, facts) {
  const byTable = new Map();
  for (const f of facts) {
    if (!byTable.has(f.target_table)) byTable.set(f.target_table, []);
    byTable.get(f.target_table).push(f.payload);
  }

  const found = [];
  for (const [table, payloads] of byTable) {
    const promoter = promoterFor(table);
    if (!promoter.findOrphans) continue;
    const rows = await promoter.findOrphans(client, payloads);
    if (rows.length) found.push({ table, promoter, rows });
  }
  return found;
}

/* Carries the listing so the failure names every row rather than saying that
   some exist. A reviewer reading this needs to decide rename-or-departure
   per row, and cannot do it from a count. */
class OrphansFound extends Error {
  constructor(runId, orphans) {
    const lines = orphans.flatMap(({ table, rows }) =>
      rows.map(
        (r) =>
          `  ${r.state_slug} · ${r.sector}` +
          `  (${table}, source ${r.source_slug ?? 'none'}` +
          `${r.provision_note ? ', has a provision note' : ''})`
      )
    );

    super(
      `this run would leave ${lines.length} row(s) behind, so nothing was promoted:\n` +
        lines.join('\n') +
        `\n\nEach is either a sector the publisher renamed — in which case the ` +
        `figures moved to the new name and this row is a duplicate — or one ` +
        `that left the paper, in which case it is a real figure from an older ` +
        `document sitting among newer ones.\n\n` +
        `Look at them:   npm run ingest:review -- orphans ${runId}\n` +
        `Then promote:   npm run ingest:review -- promote ${runId} --retire-orphans`
    );
    this.name = 'OrphansFound';
  }
}

/* Read-only. Deliberately accepts promoted runs as well as approved ones, so
   a run that landed before this check existed can still be examined. */
async function orphans(runId) {
  const { rows: facts } = await pool.query(
    `SELECT target_table, payload FROM staged_facts
     WHERE run_id = $1 AND status IN ('approved', 'promoted')`,
    [runId]
  );

  if (!facts.length) return console.log(`run ${runId} has no approved or promoted rows`);

  const client = await pool.connect();
  try {
    const found = await collectOrphans(client, facts);
    if (!found.length) return console.log(`run ${runId} strands nothing`);

    for (const { table, rows } of found) {
      console.log(`${table}:`);
      for (const r of rows) {
        console.log(
          `  [${r.id}] ${r.state_slug} · ${r.sector}` +
            `  next ${money(r.next_budget_cr)} cr  source ${r.source_slug ?? 'none'}` +
            `${r.provision_note ? `\n        note: ${r.provision_note}` : ''}`
        );
      }
    }
    console.log(`\nretire them: npm run ingest:review -- retire ${runId}`);
  } finally {
    client.release();
  }
}

/* Retires orphans for a run that is already promoted — the repair path for
   the runs that landed before promote learned to check. */
async function retire(runId) {
  const retired = await withTransaction(async (client) => {
    const { rows: facts } = await client.query(
      `SELECT target_table, payload FROM staged_facts
       WHERE run_id = $1 AND status IN ('approved', 'promoted')`,
      [runId]
    );
    if (!facts.length) throw new Error(`run ${runId} has no approved or promoted rows`);

    const found = await collectOrphans(client, facts);

    /* A provision_note is the one field on these rows that no adapter can
       regenerate — a person read the paper and wrote it. When a sector is
       renamed the note is stranded on the old row while the new one comes up
       null, so a blind delete quietly throws away the only hand-made thing in
       the table. Deleting a figure is recoverable by re-running the adapter;
       this is not. */
    const glossed = found.flatMap(({ rows }) => rows.filter((r) => r.provision_note));

    if (glossed.length && !('drop-notes' in flags)) {
      throw new Error(
        `${glossed.length} of these rows carry a provision note, which only a ` +
          `person can write:\n` +
          glossed
            .map((r) => `  [${r.id}] ${r.state_slug} · ${r.sector}\n        ${r.provision_note}`)
            .join('\n') +
          `\n\nIf the sector was renamed the note belongs on its new row — move ` +
          `it first:\n` +
          `  npm run ingest:review -- gloss <newRowId> "${glossed[0].provision_note}"\n\n` +
          `If it left the paper the note goes with it: re-run with --drop-notes.`
      );
    }

    let n = 0;
    for (const { promoter, rows } of found) {
      n += await promoter.retireOrphans(client, rows.map((r) => r.id));
    }
    return n;
  });

  console.log(retired ? `retired ${retired} row(s)` : 'nothing to retire');
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

    /* The rows landed above are only half of what the run claims. The other
       half is that the state's table contains nothing else — see findOrphans
       in the promoter. A run that would leave a stale row behind stops here,
       and because the whole promote is one transaction, stopping means
       nothing from it lands. That is the point: a half-applied state, with
       this year's Education next to last year's Police, is worse on the page
       than a state that did not update at all. */
    const orphans = await collectOrphans(client, facts);

    if (orphans.length && !('retire-orphans' in flags)) {
      throw new OrphansFound(runId, orphans);
    }

    let retired = 0;
    for (const { promoter, rows } of orphans) {
      retired += await promoter.retireOrphans(client, rows.map((r) => r.id));
    }

    return { promoted: facts.length, retired };
  });

  if (promoted.promoted) {
    console.log(`promoted ${promoted.promoted} row(s) — they are now on the page`);
  }
  if (promoted.retired) {
    console.log(`retired ${promoted.retired} orphaned row(s)`);
  }
}

try {
  switch (command) {
    case 'list': await list(); break;
    case 'show': await show(Number(positional[0])); break;
    case 'note': await note(Number(positional[0]), positional[1]); break;
    case 'approve': await decide(Number(positional[0]), 'approved'); break;
    case 'reject': await decide(Number(positional[0]), 'rejected'); break;
    case 'promote': await promote(Number(positional[0])); break;
    case 'gloss': await gloss(Number(positional[0]), positional[1]); break;
    case 'orphans': await orphans(Number(positional[0])); break;
    case 'retire': await retire(Number(positional[0])); break;
    default:
      console.error(
        'commands: list | show <runId> | note <factId> "text" | ' +
          'approve <runId> | reject <runId> | promote <runId> | ' +
          'orphans <runId> | retire <runId>'
      );
      process.exitCode = 1;
  }
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
