/* Applies schema.sql then seed.sql to DATABASE_URL.
   Usage: npm run db:migrate  (reads .env.local) */

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neonConfig, Pool } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

// .env.local first (that's where the real credential lives), .env as fallback.
dotenv.config({ path: '.env.local' });
dotenv.config();

// The HTTP driver is single-statement; these files are multi-statement, so
// they go over a real pooled connection instead.
neonConfig.webSocketConstructor = ws;

const here = dirname(fileURLToPath(import.meta.url));
const url = process.env.DATABASE_URL;

if (!url) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env.local first.');
  process.exit(1);
}

const pool = new Pool({ connectionString: url });

try {
  for (const file of ['schema.sql', 'seed.sql']) {
    const sql = await readFile(join(here, file), 'utf8');
    await pool.query(sql);
    console.log(`applied ${file}`);
  }
  const { rows } = await pool.query(
    `SELECT (SELECT count(*) FROM districts) AS districts,
            (SELECT count(*) FROM schemes) AS schemes,
            (SELECT count(*) FROM feed_items) AS feed_items`
  );
  console.log('row counts:', rows[0]);
} finally {
  await pool.end();
}
