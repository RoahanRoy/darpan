/* Adapter: PRS Legislative Research state Budget Analysis (PDF).
   Target table: state_sector_budgets.

   PRS is already the cited source for every state sector figure in
   db/seed.sql, so this adapter reproduces work that was previously done by
   hand — which is what makes it testable. `npm run ingest:verify` parses the
   2025-26 Uttarakhand and Delhi papers and asserts the output matches the
   figures a human typed in.

   Cadence: annual, not monthly. A state budget is presented once a year
   (February–March) and PRS publishes its analysis within a few weeks. There
   is nothing to re-read in August.

   On table extraction: pdf-parse's geometric table detection fails on these
   documents because Table 4 has no ruled cells — it returns merged garbage
   like ["1,01,035 38,470"]. So this parses the text stream line by line
   instead. That is more brittle to layout change, which is precisely why
   nothing here writes to a public table. */

import { fetchDocument, extractPdfText } from '../lib/fetch-document.js';

export const name = 'prs-state-budget';
export const cadence = 'annual';

// The row we want looks like:
//   Police 2,323 2,667 2,615 2,856 9% ▪ District police has been...
// Four Rs-crore figures then a percent change. Longer sector names wrap onto
// the line above ("Education, Sports, Arts," / "and Culture 10,268 ...").
const ROW = /^(.*?)\s*([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+(-?\d+)\s*%/;

// "March 30, 2025" in the letterhead. This is the date the paper carries.
const DOC_DATE = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})\b/;

const MONTHS = ['january','february','march','april','may','june','july','august',
  'september','october','november','december'];

function toNumber(s) {
  // Indian grouping: 1,01,035 → 101035.
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** Pulls the date off the letterhead. Returns null rather than guessing. */
function findDocumentDate(lines) {
  // Only the first page's letterhead is trustworthy; later pages repeat it in
  // a running footer, which is the same date, but bounding the search keeps a
  // date quoted in body prose from winning.
  for (const line of lines.slice(0, 40)) {
    const m = DOC_DATE.exec(line);
    if (!m) continue;
    const month = MONTHS.indexOf(m[1].toLowerCase()) + 1;
    return `${m[3]}-${String(month).padStart(2, '0')}-${String(Number(m[2])).padStart(2, '0')}`;
  }
  return null;
}

/** Locates the sector table and returns just its lines.
    Bounding matters: an earlier table (Salaries / Pension / Interest payment)
    also has four figures per row and would otherwise be parsed as sectors. */
function sliceSectorTable(lines) {
  const start = lines.findIndex((l) => /^Table\s+\d+:\s*Sector-wise expenditure/i.test(l));
  if (start === -1) {
    /* Two very different situations reach here and the message has to tell
       them apart, because one is a bug and the other is not.

       If the paper has no numbered tables at all, we could not read it and
       the parser is at fault. If it has tables but none of them is the
       sector-wise one, the paper genuinely does not carry that table — the
       Jammu and Kashmir 2026-27 analysis has five tables and no sector
       breakdown — and there is nothing here to fix. */
    const tables = lines.filter((l) => /^Table\s+\d+:/i.test(l));

    if (tables.length) {
      const err = new Error(
        `This paper carries no sector-wise expenditure table. It has ` +
          `${tables.length}: ${tables.map((t) => t.replace(/\s*\(in Rs crore\)\s*$/i, '')).join('; ')}. ` +
          'That is a property of the document, not a parse failure — there are ' +
          'no sector figures here to ingest.'
      );
      // Lets the batch runner separate "this source has nothing for us" from
      // "this is broken". Both stop the run; only one is worth waking someone.
      err.code = 'NO_SECTOR_TABLE';
      throw err;
    }

    throw new Error(
      'Could not find the "Table N: Sector-wise expenditure" heading, and no ' +
        'numbered tables were found at all. PRS has probably changed the ' +
        "paper's layout — check before touching this regex."
    );
  }

  // The table ends at the "% of total expenditure on all sectors" footer row,
  // or at the Sources line if that footer is absent.
  const rest = lines.slice(start);
  let end = rest.findIndex((l, i) => i > 0 && /^%\s*of total expenditure/i.test(l));
  if (end === -1) end = rest.findIndex((l, i) => i > 0 && /^Sources?:/i.test(l));
  if (end === -1) end = rest.length;

  return rest.slice(0, end);
}

/* Between one numeric row and the next, the text stream interleaves two
   different columns: the tail of the previous row's Budget Provisions note,
   and the start of the next row's wrapped sector name. They arrive in that
   order, because the extractor emits the row band top-to-bottom.

   So the name fragments are the TRAILING lines of that gap, and this test is
   what separates them. A sector name is a Title-Case noun phrase carrying no
   figures and no sentence-ending full stop:

     "Water Supply and"      → name        (taken)
     "Irrigation and Flood"  → name        (taken)
     "Jeevan Mission."       → provision   (ends a sentence)
     "under social security" → provision   (lowercase)
     "Budget Provisions (2025-26)" → header (contains digits)

   Getting this wrong attaches a provision note to the wrong sector, which is
   the failure mode that reads perfectly well and is therefore the dangerous
   one. ingest/verify.js pins all ten Uttarakhand rows against the figures a
   human transcribed, so a drift here fails the build rather than the page. */
function isNamePrefix(line) {
  if (!line) return false;
  if (/[.]$/.test(line)) return false;
  if (/\d/.test(line)) return false;
  if (!/^[A-Z]/.test(line)) return false;
  return true;
}

/** Reads the four-column sector rows, with their provision fragments, out of
    the bounded table region. */
function parseSectors(tableLines) {
  const sectors = [];
  let gap = [];

  for (const line of tableLines) {
    if (!line) continue;

    const m = ROW.exec(line);
    if (!m) {
      gap.push(line);
      continue;
    }

    // Walk back through the gap taking name fragments, so a name wrapped over
    // more than one line still reassembles.
    let split = gap.length;
    while (split > 0 && isNamePrefix(gap[split - 1])) split--;

    const nameLines = gap.slice(split);
    const provisionTail = gap.slice(0, split);
    gap = [];

    const sector = [...nameLines, m[1]].join(' ').replace(/\s+/g, ' ').trim().replace(/,$/, '');
    if (!sector) continue;

    sectors.push({
      sector,
      actuals_prev_cr: toNumber(m[2]),
      budgeted_cr: toNumber(m[3]),
      revised_cr: toNumber(m[4]),
      next_budget_cr: toNumber(m[5]),
      // The published % change, kept only so the reviewer can check our
      // column mapping against the paper's own arithmetic. It is not stored.
      published_pct_change: Number(m[6]),
      // Anything after the % on the row line starts this row's provision note.
      provisionHead: line.slice(m[0].length).trim(),
      // Assigned below: the tail belongs to the PREVIOUS row, not this one.
      _tailForPrevious: provisionTail,
    });
  }

  // Re-attach each gap's provision tail to the row it actually belongs to.
  // The final row's tail is whatever is left over after the last match.
  for (let i = 0; i < sectors.length; i++) {
    const tail = sectors[i + 1]?._tailForPrevious ?? (i === sectors.length - 1 ? gap : []);
    sectors[i].provision_fragments = [sectors[i].provisionHead, ...tail]
      .join(' ')
      .replace(/▪/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || null;
    delete sectors[i].provisionHead;
    delete sectors[i]._tailForPrevious;
  }

  return sectors;
}

/**
 * @param {object} opts
 * @param {string} opts.url        The PRS Budget Analysis PDF.
 * @param {string} opts.stateSlug  Must already exist in `states`.
 * @param {string} opts.fiscalYear e.g. '2025-26', used for the source slug.
 */
export async function run({ url, stateSlug, fiscalYear }) {
  if (!url || !stateSlug || !fiscalYear) {
    throw new Error('prs-state-budget needs --url, --state and --fiscal-year');
  }

  const doc = await fetchDocument(url);
  const { text, lines, pageCount } = await extractPdfText(doc.bytes);

  if (pageCount === 0 || text.trim().length < 500) {
    throw new Error(
      `${url} yielded ${text.length} characters over ${pageCount} pages — ` +
        'likely a scanned or protected PDF, which this adapter cannot read.'
    );
  }

  const sectors = parseSectors(sliceSectorTable(lines));

  if (sectors.length < 5) {
    throw new Error(
      `Parsed only ${sectors.length} sector rows from ${url}. These papers ` +
        'carry ten or more; treating this as a layout change rather than a ' +
        'short table.'
    );
  }

  const documentDate = findDocumentDate(lines);
  const stateLabel = stateSlug.replace(/(^|-)(\w)/g, (_, s, c) => (s ? ' ' : '') + c.toUpperCase());

  return {
    targetKey: `${stateSlug}:${fiscalYear}`,

    document: {
      ...doc,
      extractedText: text,
      sourceSlug: `prs-${stateSlug}-${fiscalYear}`,
      sourceTitle: `${stateLabel} Budget Analysis ${fiscalYear}`,
      sourcePublisher: 'PRS Legislative Research',
      sourceNote: `Sector figures are Rs crore. Parsed from the PDF by the ${name} adapter.`,
      // Present on the letterhead or not at all — never substituted.
      documentDate,
      documentDateIsInferred: false,
    },

    facts: sectors.map((s, i) => ({
      targetTable: 'state_sector_budgets',
      naturalKey: `${stateSlug}|${s.sector}`,
      payload: {
        state_slug: stateSlug,
        sector: s.sector,
        actuals_prev_cr: s.actuals_prev_cr,
        budgeted_cr: s.budgeted_cr,
        revised_cr: s.revised_cr,
        next_budget_cr: s.next_budget_cr,
        display_order: i + 1,
        // Written by the reviewer before promotion; see the note above.
        provision_note: null,
        _provision_fragments: s.provision_fragments,
        _published_pct_change: s.published_pct_change,
      },
    })),
  };
}
