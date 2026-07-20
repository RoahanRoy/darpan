/* Fetches every state, union territory and district from the Local
   Government Directory and writes db/geography.sql.

   Usage:
     node scripts/fetch-lgd-geography.js          rewrite db/geography.sql
     node scripts/fetch-lgd-geography.js --check  fail if it would change

   Why the output is a checked-in SQL file rather than a staged ingestion
   run: the ingest/ pipeline exists to gate FIGURES, because a figure with no
   document behind it is the failure this project is built to prevent. A
   district list is not a figure. It is the frame the figures hang on, and
   the useful review of a change to it is a diff — "Tripura went from 8
   districts to 9" reads at a glance in git and does not read at all as row
   761 of a staging table. So this generates SQL, the diff is the review, and
   `npm run db:geography` applies it.

   On the source. LGD is the Ministry of Panchayati Raj's directory and is
   the authority every other central system codes against. Its own state and
   district dropdowns are served by the two endpoints used below: the state
   list is inlined in the report page's HTML, and the district list comes
   from the DWR service that page calls when you pick a state. Neither is
   behind the captcha, which only guards the bulk report download. This reads
   exactly what a person clicking through the site reads.

   What LGD does not carry is constitutional status — it lists Chandigarh and
   Kerala the same way — so KIND below is maintained by hand and asserted
   against the fetched list, and the fetch fails rather than guessing if the
   two disagree. */

import { writeFile, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '..', 'db', 'geography.sql');

const REPORT_URL = 'https://lgdirectory.gov.in/districtWiseDetailReport.do';
const DWR_URL =
  'https://lgdirectory.gov.in/dwr/call/plaincall/lgdDwrDistrictService.getDistrictList.dwr';

const checkOnly = process.argv.includes('--check');

/* Constitutional status per region, which is what decides whether a budget
   can exist for it at all. The three UTs with a legislature vote their own
   budgets and PRS analyses them alongside the states; the five without are
   administered by the centre and appear in the Union Budget's Demand for
   Grants instead, so no state_sector_budgets row will ever be written for
   them. Keyed by LGD state code, which does not change when a name does. */
const KIND = {
  1: 'ut_with_legislature',     // Jammu and Kashmir — a UT since Oct 2019
  2: 'state',                   // Himachal Pradesh
  3: 'state',                   // Punjab
  4: 'ut_without_legislature',  // Chandigarh
  5: 'state',                   // Uttarakhand
  6: 'state',                   // Haryana
  7: 'ut_with_legislature',     // Delhi
  8: 'state',                   // Rajasthan
  9: 'state',                   // Uttar Pradesh
  10: 'state',                  // Bihar
  11: 'state',                  // Sikkim
  12: 'state',                  // Arunachal Pradesh
  13: 'state',                  // Nagaland
  14: 'state',                  // Manipur
  15: 'state',                  // Mizoram
  16: 'state',                  // Tripura
  17: 'state',                  // Meghalaya
  18: 'state',                  // Assam
  19: 'state',                  // West Bengal
  20: 'state',                  // Jharkhand
  21: 'state',                  // Odisha
  22: 'state',                  // Chhattisgarh
  23: 'state',                  // Madhya Pradesh
  24: 'state',                  // Gujarat
  27: 'state',                  // Maharashtra
  28: 'state',                  // Andhra Pradesh
  29: 'state',                  // Karnataka
  30: 'state',                  // Goa
  31: 'ut_without_legislature', // Lakshadweep
  32: 'state',                  // Kerala
  33: 'state',                  // Tamil Nadu
  34: 'ut_with_legislature',    // Puducherry
  35: 'ut_without_legislature', // Andaman and Nicobar Islands
  36: 'state',                  // Telangana
  37: 'ut_without_legislature', // Ladakh
  38: 'ut_without_legislature', // Dadra and Nagar Haveli and Daman and Diu
};

/* Places where LGD's district service is known to serve less than the region
   actually has. These are written into the generated file as comments so the
   shortfall is visible to whoever reads it next, rather than being a silence
   that looks like completeness. Nothing is added to make the count up: the
   districts are genuinely not in the source, and inventing two rows to reach
   the number a reader expects is the exact failure this project exists to
   avoid. */
const SOURCE_GAPS = {
  34:
    "LGD's district service returns only Karaikal and Puducherry. The UT's " +
    'other two districts, Mahe and Yanam — exclaves inside Kerala and Andhra ' +
    'Pradesh — are absent from it, and are therefore absent here.',
};

/* LGD title-cases every word, including the ones that should not be. These
   are display names on a public page, so "Andaman And Nicobar Islands" is
   wrong in a way a reader notices. Only the joining words are lowered, and
   only when they are not the first word. */
const MINOR = new Set(['and', 'of', 'the']);

function tidyName(raw) {
  return raw
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((w, i) => (i > 0 && MINOR.has(w.toLowerCase()) ? w.toLowerCase() : w))
    .join(' ')
    // LGD files five regions under a leading "The". Nobody writes it.
    .replace(/^The /, '');
}

function slugify(name) {
  return tidyName(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function fetchStates() {
  const res = await fetch(REPORT_URL, { redirect: 'follow' });
  if (!res.ok) throw new Error(`${REPORT_URL} returned ${res.status}`);
  const html = await res.text();

  // The state <select> is the only one populated server-side; the district
  // one arrives empty and is filled by the DWR call below.
  const block = html.match(/<select[^>]*id="stateList"[\s\S]*?<\/select>/i);
  if (!block) {
    throw new Error(
      'no #stateList <select> in the LGD report page. The page has been ' +
        'rebuilt — check it by hand before touching this parser.'
    );
  }

  const states = [];
  for (const m of block[0].matchAll(/<option[^>]*value="(\d+)"[^>]*>([^<]+)/g)) {
    states.push({ lgdCode: Number(m[1]), name: tidyName(m[2]) });
  }

  if (states.length !== 36) {
    throw new Error(
      `LGD listed ${states.length} states/UTs, expected 36 (28 states + 8 UTs). ` +
        'If a region has genuinely been created or merged, update KIND in this ' +
        'file and this check together — silently accepting the new count would ' +
        'let a parse failure look like a constitutional amendment.'
    );
  }

  for (const s of states) {
    if (!KIND[s.lgdCode]) {
      throw new Error(
        `no constitutional status recorded for LGD state ${s.lgdCode} (${s.name}). ` +
          'Add it to KIND in this file.'
      );
    }
    s.kind = KIND[s.lgdCode];
  }

  return states.sort((a, b) => a.name.localeCompare(b.name));
}

/* DWR's plaincall protocol. The response is a JavaScript fragment, not JSON,
   so the fields are read out with a regex rather than parsed — evaluating a
   remote script to read a district name is not a trade worth making. */
async function fetchDistricts(stateCode) {
  const body =
    `callCount=1\nwindowName=\nc0-scriptName=lgdDwrDistrictService\n` +
    `c0-methodName=getDistrictList\nc0-id=0\nc0-param0=string:${stateCode}\n` +
    `batchId=0\ninstanceId=0\npage=%2FdistrictWiseDetailReport.do\nscriptSessionId=\n`;

  const res = await fetch(DWR_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body,
  });
  if (!res.ok) throw new Error(`district service returned ${res.status} for state ${stateCode}`);

  const text = await res.text();
  if (/handleBatchException/.test(text)) {
    throw new Error(`district service refused state ${stateCode}: ${text.slice(0, 200)}`);
  }

  const districts = [];
  const ROW =
    /districtCode:(\d+),districtNameEnglish:"([^"]+)"[^}]*?effectiveDate:new Date\((\d+)\)/g;

  for (const m of text.matchAll(ROW)) {
    districts.push({
      lgdCode: Number(m[1]),
      name: tidyName(m[2]),
      // LGD's own record of when the district came into existence. Several
      // are younger than the documents this site cites, and the page has to
      // be able to say that rather than showing an empty table.
      effectiveFrom: new Date(Number(m[3])).toISOString().slice(0, 10),
    });
  }

  // A row that matched districtCode but not the full pattern means the
  // service changed shape, and silently dropping it would delete a district.
  const announced = [...text.matchAll(/districtCode:\d+/g)].length;
  if (announced !== districts.length) {
    throw new Error(
      `state ${stateCode}: the district service returned ${announced} rows but ` +
        `only ${districts.length} parsed. Its response shape has changed.`
    );
  }

  return districts.sort((a, b) => a.name.localeCompare(b.name));
}

const quote = (s) => (s == null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);

/** Wraps prose into `-- ` comment lines at 74 columns. */
function wrapComment(text) {
  const out = [];
  let line = '--';
  for (const word of text.split(/\s+/)) {
    if (line.length + word.length + 1 > 74) {
      out.push(line);
      line = '--';
    }
    line += ` ${word}`;
  }
  out.push(line);
  return out;
}

function render(states, fetchedOn) {
  const total = states.reduce((n, s) => n + s.districts.length, 0);

  const lines = [
    '-- GENERATED FILE — do not edit by hand.',
    '--   node scripts/fetch-lgd-geography.js     rewrites it',
    '--   npm run db:geography                    applies it',
    '--',
    '-- Source: Local Government Directory, Ministry of Panchayati Raj.',
    `--   ${REPORT_URL}`,
    `-- Fetched ${fetchedOn}. ${states.length} states and union territories, ` +
      `${total} districts.`,
    '--',
    '-- Upserts keyed on lgd_code, so a district that LGD renames is renamed',
    '-- here rather than duplicated, and nothing is ever deleted: a district',
    '-- that disappears from LGD leaves rows behind it in other tables, and',
    '-- dropping it would take published figures down with it. A merger is a',
    '-- decision for a person, so this file makes it visible and leaves it.',
    '',
    'BEGIN;',
    '',
  ];

  lines.push('-- ------------------------------------------ states and union territories');
  lines.push('');
  lines.push(
    'INSERT INTO states (lgd_code, slug, name, kind) VALUES',
    states
      .map((s) => `  (${s.lgdCode}, ${quote(s.slug)}, ${quote(s.name)}, ${quote(s.kind)})`)
      .join(',\n') + ''
  );
  lines.push(
    // Two seeded states predate lgd_code, so the first run has to find them
    // by slug. After that the lgd_code conflict target does the work.
    'ON CONFLICT (slug) DO UPDATE SET',
    '  lgd_code = EXCLUDED.lgd_code,',
    '  name     = EXCLUDED.name,',
    '  kind     = EXCLUDED.kind;',
    ''
  );

  lines.push('-- ------------------------------------------------------- adopting districts');
  lines.push('');
  lines.push(
    ...wrapComment(
      'The inserts below key on lgd_code, and the districts seeded before this ' +
        'loader existed have none — so without this step Dehradun would be ' +
        'proposed as a new row and collide with itself on (state_id, slug). ' +
        'This attaches the code to a district we already hold, matching on the ' +
        'state and slug that seeded it.'
    ),
    ...wrapComment(
      'It touches only rows whose lgd_code is still NULL, which makes it a ' +
        "no-op on every run after the first, and leaves Delhi's urban local " +
        'bodies alone: they are municipal units rather than LGD districts, they ' +
        'match no slug here, and they are meant to stay codeless.'
    ),
    ...wrapComment(
      'A later rename is NOT handled here and must not be. Once a district ' +
        'carries its code, the insert updates it by that code, which is what ' +
        'lets Allahabad become Prayagraj without becoming a second district.'
    ),
    ''
  );

  const adoptions = states.flatMap((s) =>
    s.districts.map((d) => `  (${s.lgdCode}, ${quote(d.slug)}, ${d.lgdCode})`)
  );

  lines.push(
    'UPDATE districts d SET lgd_code = v.lgd_code',
    'FROM states s, (VALUES',
    adoptions.join(',\n'),
    ') AS v(state_lgd_code, slug, lgd_code)',
    'WHERE s.lgd_code = v.state_lgd_code',
    '  AND d.state_id = s.id',
    '  AND d.slug     = v.slug',
    '  AND d.lgd_code IS NULL;',
    ''
  );

  lines.push('-- --------------------------------------------------------------- districts');
  lines.push('');
  lines.push(
    '-- unit_type is district throughout: every row below is a revenue district',
    "-- as LGD lists it. Delhi's urban local bodies, which the PMAY-U annexure",
    '-- reports against, are seeded separately and are not LGD districts — they',
    '-- carry no lgd_code and this file leaves them alone.',
    ''
  );

  for (const s of states) {
    lines.push(`-- ${s.name} — ${s.districts.length} districts`);

    if (SOURCE_GAPS[s.lgdCode]) {
      for (const line of wrapComment(SOURCE_GAPS[s.lgdCode])) lines.push(line);
    }

    if (!s.districts.length) {
      lines.push('-- LGD lists none.', '');
      continue;
    }

    lines.push(
      'INSERT INTO districts',
      '  (state_id, lgd_code, slug, name, unit_type, effective_from, display_order)'
    );
    lines.push("SELECT s.id, v.lgd_code, v.slug, v.name, 'district', v.effective_from, v.ord");
    lines.push('FROM states s, (VALUES');
    lines.push(
      s.districts
        .map(
          (d, i) =>
            `  (${d.lgdCode}, ${quote(d.slug)}, ${quote(d.name)}, ` +
            `${quote(d.effectiveFrom)}::date, ${i + 1})`
        )
        .join(',\n')
    );
    lines.push(') AS v(lgd_code, slug, name, effective_from, ord)');
    lines.push(`WHERE s.lgd_code = ${s.lgdCode}`);
    lines.push('ON CONFLICT (lgd_code) DO UPDATE SET');
    lines.push('  state_id       = EXCLUDED.state_id,');
    lines.push('  slug           = EXCLUDED.slug,');
    lines.push('  name           = EXCLUDED.name,');
    lines.push('  effective_from = EXCLUDED.effective_from,');
    lines.push('  display_order  = EXCLUDED.display_order;');
    lines.push('');
  }

  lines.push('COMMIT;', '');
  return lines.join('\n');
}

const states = await fetchStates();
process.stderr.write(`${states.length} states and union territories\n`);

for (const s of states) {
  s.slug = slugify(s.name);
  s.districts = await fetchDistricts(s.lgdCode);
  for (const d of s.districts) d.slug = slugify(d.name);

  // Slugs are unique per state now, so a clash inside one state is the only
  // kind left that can lose a row — and it means two districts differ only in
  // punctuation, which needs a person to look at it.
  const seen = new Map();
  for (const d of s.districts) {
    if (seen.has(d.slug)) {
      throw new Error(
        `${s.name}: "${d.name}" and "${seen.get(d.slug)}" both slugify to ` +
          `"${d.slug}". Disambiguate by hand before writing this out.`
      );
    }
    seen.set(d.slug, d.name);
  }

  process.stderr.write(`  ${s.name.padEnd(40)} ${String(s.districts.length).padStart(3)}\n`);
}

const sql = render(states, new Date().toISOString().slice(0, 10));

if (checkOnly) {
  const existing = await readFile(OUT, 'utf8').catch(() => null);
  // The fetch date is on the header line and moves every run, so it is not
  // what "changed" should mean here.
  const strip = (t) => (t ?? '').replace(/^-- Fetched .*$/m, '');
  if (strip(existing) === strip(sql)) {
    console.log('db/geography.sql matches LGD');
  } else {
    console.error(
      'db/geography.sql is out of date with LGD — run ' +
        '`node scripts/fetch-lgd-geography.js` and review the diff.'
    );
    process.exitCode = 1;
  }
} else {
  await writeFile(OUT, sql);
  const total = states.reduce((n, s) => n + s.districts.length, 0);
  console.log(`wrote db/geography.sql — ${states.length} regions, ${total} districts`);
}
