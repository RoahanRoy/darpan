/* Runs the prs-state-budget adapter once per state in ingest/prs-targets.json.

   Usage:
     npm run ingest:states                 every state in the manifest
     npm run ingest:states -- --state bihar   just one
     npm run ingest:states -- --dry        say what would run, fetch nothing

   This changes nothing about the gate. Each state is a separate ingestion run
   with its own staged rows, its own diff and its own review, exactly as if it
   had been invoked by hand — this only spares somebody typing thirty
   commands. Nothing here approves or promotes anything.

   One state failing does not stop the others. These are thirty independently
   authored PDFs and a layout change in one says nothing about the other
   twenty-nine; aborting the batch would mean a single odd paper blocks every
   state's update. Failures are collected and reported at the end, and the
   exit code is non-zero if there were any, so CI still notices. */

import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './lib/db.js';

const here = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const dryRun = args.includes('--dry');
const only = args.includes('--state') ? args[args.indexOf('--state') + 1] : null;

const manifest = JSON.parse(await readFile(join(here, 'prs-targets.json'), 'utf8'));

let targets = manifest.targets;
if (only) {
  targets = targets.filter((t) => t.state === only);
  if (!targets.length) {
    console.error(`no target for "${only}" in prs-targets.json`);
    process.exit(1);
  }
}

/* The adapter's promoter refuses a state it cannot find, but it refuses at
   promotion time — after the PDF has been fetched, parsed and staged. Since
   PRS's slugs and ours are both derived from the same names but by different
   people, checking up front turns a confusing late failure into an obvious
   early one. */
const { rows: known } = await pool.query(`SELECT slug, kind FROM states`);
const bySlug = new Map(known.map((r) => [r.slug, r.kind]));
await pool.end();

const unknown = targets.filter((t) => !bySlug.has(t.state));
if (unknown.length) {
  console.error(
    `these PRS slugs match no row in states:\n` +
      unknown.map((t) => `  ${t.state}`).join('\n') +
      `\nLoad the geography first (npm run db:geography), or add a mapping.`
  );
  process.exit(1);
}

function runOne({ state, fiscalYear, url }) {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [join(here, 'run.js'), 'prs-state-budget',
       '--state', state, '--fiscal-year', fiscalYear, '--url', url],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );

    let out = '';
    child.stdout.on('data', (b) => (out += b));
    child.stderr.on('data', (b) => (out += b));
    child.on('close', (code) => resolve({ code, out: out.trim() }));
  });
}

const failed = [];
const nothingToIngest = [];

for (const target of targets) {
  const label = `${target.state} ${target.fiscalYear}`;

  if (dryRun) {
    console.log(`would run ${label}\n  ${target.url}`);
    continue;
  }

  process.stdout.write(`${label}\n`);
  const { code, out } = await runOne(target);

  for (const line of out.split('\n')) {
    if (/^◇ injected env/.test(line)) continue;
    console.log(`  ${line}`);
  }

  // 2 is the adapter saying the document holds no sector table — see the
  // note in ingest/run.js. It is reported but does not fail the batch, so a
  // state whose paper got shorter this year does not leave CI permanently
  // red and thereby train everyone to ignore it.
  if (code === 2) nothingToIngest.push(label);
  else if (code !== 0) failed.push(label);
}

if (dryRun) process.exit(0);

const staged = targets.length - failed.length - nothingToIngest.length;
console.log(`\n${staged}/${targets.length} states staged.`);

if (nothingToIngest.length) {
  console.log(`no sector table published: ${nothingToIngest.join(', ')}`);
}
if (failed.length) {
  console.log(`FAILED: ${failed.join(', ')}`);
}
console.log('nothing is public yet — review with: npm run ingest:review -- list');

if (failed.length) process.exitCode = 1;
