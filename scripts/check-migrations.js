/* Validates db/migrations without touching a database. Run by CI.

   The migration runner trusts filenames for two things: the order files are
   applied in, and the identity it checksums them against. Both assumptions
   break quietly. Two branches that each add a 003 merge cleanly and then
   apply in an order nobody chose; renaming an applied file makes the runner
   see a new migration whose statements have already run.

   Neither is visible in a diff, and both are only discovered against a real
   database — usually production. This makes them a failed check on the PR. */

import { readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'db', 'migrations');
const NAME = /^(\d{3})_[a-z0-9_]+\.sql$/;

const problems = [];
const files = (await readdir(dir)).filter((n) => n.endsWith('.sql')).sort();

if (files.length === 0) problems.push('db/migrations is empty');

const seen = new Map();
for (const name of files) {
  const match = NAME.exec(name);
  if (!match) {
    problems.push(`${name}: expected NNN_lower_snake_case.sql`);
    continue;
  }
  const number = match[1];
  if (seen.has(number)) {
    problems.push(`${number} is used twice: ${seen.get(number)} and ${name}`);
  }
  seen.set(number, name);
}

// A gap is not a correctness problem — the runner applies what it finds — but
// it almost always means a migration was deleted after being applied
// somewhere, which is exactly the state the checksum guard cannot recover
// from. Worth a look before merge.
const numbers = [...seen.keys()].map(Number).sort((a, b) => a - b);
for (let i = 1; i < numbers.length; i++) {
  if (numbers[i] !== numbers[i - 1] + 1) {
    problems.push(
      `gap between ${String(numbers[i - 1]).padStart(3, '0')} and ` +
        `${String(numbers[i]).padStart(3, '0')} — was a migration deleted?`
    );
  }
}

if (problems.length) {
  console.error('migration check failed:');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

console.log(`migration check passed — ${files.length} file(s), ${files.at(-1)} is latest`);
