/* Runs one adapter and stages what it finds. Writes nothing a reader can see.

   Usage:
     node ingest/run.js prs-state-budget \
       --state uttarakhand --fiscal-year 2025-26 \
       --url https://prsindia.org/files/budget/.../Uttarakhand_Budget_Analysis_2025-26.pdf

   Exit codes: 0 staged (or nothing changed), 1 the run failed. The failure
   path matters more than the success path — these sources change their
   layout without notice, and a silent no-op would look identical to a
   healthy run. */

import { pool, withTransaction } from './lib/db.js';
import { promoterFor } from './promoters/index.js';

const ADAPTERS = {
  'prs-state-budget': () => import('./adapters/prs-state-budget.js'),
};

function parseArgs(argv) {
  const [adapter, ...rest] = argv;
  const opts = {};
  for (let i = 0; i < rest.length; i += 2) {
    if (!rest[i].startsWith('--')) throw new Error(`unexpected argument: ${rest[i]}`);
    opts[rest[i].slice(2)] = rest[i + 1];
  }
  return { adapter, opts };
}

const { adapter: adapterName, opts } = parseArgs(process.argv.slice(2));

if (!adapterName || !ADAPTERS[adapterName]) {
  console.error(
    `usage: node ingest/run.js <adapter> [--key value ...]\n` +
      `adapters: ${Object.keys(ADAPTERS).join(', ')}`
  );
  process.exit(1);
}

let runId;

try {
  const adapter = await ADAPTERS[adapterName]();

  const { rows: runRows } = await pool.query(
    `INSERT INTO ingestion_runs (adapter) VALUES ($1) RETURNING id`,
    [adapterName]
  );
  runId = runRows[0].id;
  console.log(`run ${runId}: ${adapterName}`);

  const result = await adapter.run({
    url: opts.url,
    stateSlug: opts.state,
    fiscalYear: opts['fiscal-year'],
  });

  const counts = await withTransaction(async (client) => {
    const doc = result.document;

    const { rows: docRows } = await client.query(
      `INSERT INTO raw_documents
         (run_id, url, media_type, byte_size, sha256, extracted_text,
          source_slug, source_title, source_publisher, source_note,
          document_date, document_date_is_inferred)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id`,
      [
        runId, doc.url, doc.mediaType, doc.byteSize, doc.sha256, doc.extractedText,
        doc.sourceSlug, doc.sourceTitle, doc.sourcePublisher, doc.sourceNote,
        doc.documentDate, doc.documentDateIsInferred,
      ]
    );
    const rawDocumentId = docRows[0].id;

    if (!doc.documentDate) {
      // Staged anyway so the reviewer can see what was read and supply the
      // date by hand. The promoter is what refuses to land it.
      console.warn(
        '  ! no document date found on the face of the document. ' +
          'Rows will stage but cannot be promoted until one is set.'
      );
    }

    // Group by target table so each promoter's live rows are fetched once.
    const byTable = new Map();
    for (const fact of result.facts) {
      if (!byTable.has(fact.targetTable)) byTable.set(fact.targetTable, []);
      byTable.get(fact.targetTable).push(fact);
    }

    const tally = { new: 0, changed: 0, unchanged: 0, invalid: 0 };

    for (const [targetTable, facts] of byTable) {
      const promoter = promoterFor(targetTable);
      const live = await promoter.currentRows(client);

      for (const fact of facts) {
        const problems = promoter.validate(fact.payload);
        if (problems.length) {
          tally.invalid++;
          // Refusing the whole run: a validation failure here means the
          // parse is wrong, and the rows that happen to look fine are no
          // more trustworthy than the ones that don't.
          throw new Error(
            `${targetTable} "${fact.naturalKey}" failed validation:\n    - ` +
              problems.join('\n    - ')
          );
        }

        const proposed = promoter.comparable(fact.payload);
        const previous = live.get(fact.naturalKey) ?? null;
        const diffKind = !previous
          ? 'new'
          : JSON.stringify(previous) === JSON.stringify(proposed)
            ? 'unchanged'
            : 'changed';
        tally[diffKind]++;

        await client.query(
          `INSERT INTO staged_facts
             (run_id, raw_document_id, target_table, natural_key, payload,
              diff_kind, previous_payload, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            runId, rawDocumentId, targetTable, fact.naturalKey,
            JSON.stringify(fact.payload), diffKind,
            previous ? JSON.stringify(previous) : null,
            // An unchanged row needs no decision, so it is not put in front
            // of a human. It is recorded because "the source still says what
            // it said" is worth being able to prove.
            diffKind === 'unchanged' ? 'rejected' : 'pending',
          ]
        );
      }
    }

    await client.query(
      `UPDATE ingestion_runs
       SET status = 'ok', finished_at = now(), counts = $2
       WHERE id = $1`,
      [runId, JSON.stringify(tally)]
    );

    return tally;
  });

  console.log(
    `  ${counts.new} new, ${counts.changed} changed, ${counts.unchanged} unchanged`
  );
  if (counts.new + counts.changed > 0) {
    console.log(`  review with: npm run ingest:review -- show ${runId}`);
  }
} catch (err) {
  console.error(`run ${runId ?? '(not started)'} failed: ${err.message}`);
  if (runId) {
    await pool.query(
      `UPDATE ingestion_runs SET status = 'failed', finished_at = now(), error = $2 WHERE id = $1`,
      [runId, err.stack ?? String(err)]
    );
  }
  process.exitCode = 1;
} finally {
  await pool.end();
}
