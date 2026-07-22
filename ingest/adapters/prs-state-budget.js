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

/* ------------------------------------------------------ budget highlights

   Every PRS state analysis opens with a "Budget Highlights" block: five or so
   bullets giving the top-line figures the sector table never carries — total
   expenditure, receipts, the two deficits, and GSDP. db/seed.sql had these
   hand-typed for Delhi and Uttarakhand and nowhere else, so twenty-eight state
   pages rendered a sector table with no headline total above it. This reads
   them off the same paper the sectors come from.

   The bullets are prose, not a table, but they are boilerplate prose: the same
   sentence frames recur verbatim across all thirty papers, which is what makes
   a regex defensible here where it would not be on free text. ingest/verify.js
   pins the output against the figures a human transcribed from the 2025-26
   Delhi and Uttarakhand papers, so a reframing by PRS fails the build rather
   than quietly staging a wrong total. */

// "Rs 3,24,925 crore" or "Rs 13.1 lakh crore" — a few papers give the larger
// aggregates in lakh crore, so the unit has to be read, not assumed.
const RS_AMOUNT = String.raw`Rs\s+([\d,]+(?:\.\d+)?)\s+(lakh\s+crore|crore)`;

function toCroreWithUnit(numStr, unit) {
  const n = Number(String(numStr).replace(/,/g, ''));
  if (!Number.isFinite(n)) return null;
  return /lakh/i.test(unit || '') ? Math.round(n * 100000) : n;
}

/** The fiscal year one before the budget year: '2026-27' → '2025-26'. Used to
    word the qualifier ("up 12% on revised 2025-26") without re-parsing it out
    of the sentence, which states phrase inconsistently. */
function previousFiscalYear(fy) {
  const m = /^(\d{4})-(\d{2})$/.exec(fy || '');
  if (!m) return null;
  const start = Number(m[1]) - 1;
  return `${start}-${String(Number(m[2]) - 1).padStart(2, '0')}`;
}

/* Collapses the Budget Highlights block into one string per bullet. The text
   stream breaks a bullet across lines unpredictably — Kerala emits the whole
   block on one line, others wrap every sentence — so a new bullet starts on
   the ▪ marker OR on a line opening with one of the fixed sentence frames, and
   everything else is joined onto the bullet in progress. */
function highlightBullets(lines) {
  const start = lines.findIndex((l) => /^Budget Highlights\b/i.test(l));
  if (start === -1) return [];
  let end = lines.findIndex(
    (l, i) => i > start && /^(Policy Highlights|Budget Estimates)\b/i.test(l)
  );
  if (end === -1 || end - start > 30) end = start + 20;

  const NEW_BULLET = /^(The Gross|Expenditure|Receipts|Revenue|Fiscal|The state is)/;
  const bullets = [];
  for (const line of lines.slice(start + 1, end)) {
    if (!line) continue;
    if (/^▪/.test(line) || bullets.length === 0) {
      bullets.push(line.replace(/^▪\s*/, '').trim());
    } else if (NEW_BULLET.test(line)) {
      bullets.push(line.trim());
    } else {
      bullets[bullets.length - 1] += ' ' + line.trim();
    }
  }
  return bullets;
}

/** Reads the Budget Highlights bullets into headline rows, in the order and
    with the labels db/seed.sql already established for the two seeded states.
    Any figure the block does not carry is simply omitted — Delhi and Tripura
    publish no GSDP, which is a property of the paper, not a parse failure. */
export function parseHeadlines(lines, fiscalYear) {
  const blob = highlightBullets(lines).join('\n');
  if (!blob) return [];
  const prev = previousFiscalYear(fiscalYear);
  const rows = [];
  let m;

  if ((m = new RegExp(String.raw`Expenditure \(excluding debt repayment\)[^.]*?estimated to be ${RS_AMOUNT}[^.]*?(increase|decrease) of (\d+)%`, 'i').exec(blob))) {
    rows.push({
      label: 'Total expenditure (excluding debt repayment)',
      amount_cr: toCroreWithUnit(m[1], m[2]),
      qualifier: prev ? `${m[3] === 'increase' ? 'up' : 'down'} ${m[4]}% on revised ${prev}` : null,
    });
  } else if ((m = new RegExp(String.raw`Expenditure \(excluding debt repayment\)[^.]*?estimated to be ${RS_AMOUNT}`, 'i').exec(blob))) {
    rows.push({ label: 'Total expenditure (excluding debt repayment)', amount_cr: toCroreWithUnit(m[1], m[2]), qualifier: null });
  }

  if ((m = new RegExp(String.raw`Receipts \(excluding borrowings\)[^.]*?estimated to be ${RS_AMOUNT}`, 'i').exec(blob))) {
    rows.push({ label: 'Receipts (excluding borrowings)', amount_cr: toCroreWithUnit(m[1], m[2]), qualifier: null });
  }

  // Revenue account: a surplus, a deficit, or (Assam) an exact balance. The
  // % of GSDP is captured where the sentence leads with it and left null where
  // the paper gives only a rupee figure (Delhi, Tripura, Madhya Pradesh).
  if ((m = /Revenue (surplus|deficit) (?:in|for) [\d-]+ is estimated to be (?:([\d.]+)% of GSDP \()?Rs ([\d,]+) crore/i.exec(blob))) {
    rows.push({
      label: `Revenue ${m[1]}`,
      amount_cr: toCroreWithUnit(m[3], 'crore'),
      qualifier: m[2] ? `${m[2]}% of GSDP` : null,
    });
  } else if (/revenue balance \(no surplus or deficit\)/i.test(blob)) {
    rows.push({ label: 'Revenue balance', amount_cr: 0, qualifier: 'no surplus or deficit' });
  }

  if ((m = /Fiscal deficit (?:for|in) [\d-]+ is (?:targeted at|estimated (?:at|to be)) (?:([\d.]+)% of GSDP \()?Rs ([\d,]+(?:\.\d+)?) (lakh crore|crore)/i.exec(blob))) {
    rows.push({
      label: 'Fiscal deficit',
      amount_cr: toCroreWithUnit(m[2], m[3]),
      qualifier: m[1] ? `${m[1]}% of GSDP` : null,
    });
  }

  if ((m = new RegExp(String.raw`Gross State Domestic Product \(GSDP\)[^.]*?projected to be ${RS_AMOUNT}[^.]*?growth of ([\d.]+)%`, 'i').exec(blob))) {
    rows.push({
      label: 'GSDP (at current prices)',
      amount_cr: toCroreWithUnit(m[1], m[2]),
      qualifier: `projected ${m[3]}% growth`,
    });
  } else if ((m = new RegExp(String.raw`Gross State Domestic Product \(GSDP\)[^.]*?projected to be ${RS_AMOUNT}`, 'i').exec(blob))) {
    rows.push({ label: 'GSDP (at current prices)', amount_cr: toCroreWithUnit(m[1], m[2]), qualifier: null });
  }

  return rows.map((r, i) => ({ ...r, display_order: i + 1 }));
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
/* The sector heads PRS publishes. These are standard budget heads, not free
   text — the same fourteen appear across every state's paper, which is what
   makes the table comparable between states in the first place.

   They are listed because isNamePrefix cannot be made reliable on its own. It
   decides whether a line is a wrapped sector name or the tail of the previous
   row's provision note, and when a provision sentence runs off the end of a
   line without a full stop its continuation is indistinguishable from a name:
   Title-Case, no digits, no terminator. Maharashtra's paper reads

     "Rs 26,500 crore has been allocated to"
     "Mukhyamantri Mazi Ladaki Bahin Yojana"     <- taken as a name
     "Rural Development 20,798 34,531 ..."

   and the row landed as "Mukhyamantri Mazi Ladaki Bahin Yojana Rural
   Development". Kerala, Tamil Nadu and Telangana each had one too. Every case
   is junk PREFIXED to a real head, because the row line always supplies the
   head's last word, so trimming to the head recovers the name exactly.

   A name matching nothing here is left untouched and warned about rather than
   forced, since PRS adding a fifteenth head is a thing that should be read by
   a person, not silently rewritten into one of the fourteen. */
const SECTOR_HEADS = [
  'Education, Sports, Arts, and Culture',
  'Health and Family Welfare',
  'Social Welfare and Nutrition',
  'Welfare of SC, ST, OBC, and Minorities',
  'Agriculture and Allied Activities',
  'Irrigation and Flood Control',
  'Water Supply and Sanitation',
  'Rural Development',
  'Urban Development',
  'Roads and Bridges',
  'Transport',
  'Housing',
  'Police',
  'Energy',
];

export function repairSectorName(raw) {
  const name = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (SECTOR_HEADS.includes(name)) return { name, trimmed: null };

  const head = SECTOR_HEADS.find(
    (h) => name.length > h.length && name.toLowerCase().endsWith(h.toLowerCase())
  );
  if (!head) return { name, trimmed: null };

  return { name: head, trimmed: name.slice(0, name.length - head.length).trim() };
}

export function isKnownSector(name) {
  return SECTOR_HEADS.includes(String(name ?? '').replace(/\s+/g, ' ').trim());
}

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

    const assembled = [...nameLines, m[1]].join(' ').replace(/\s+/g, ' ').trim().replace(/,$/, '');
    if (!assembled) continue;

    /* Whatever was trimmed off is not discarded — it is the tail of the
       previous row's provision sentence, which is where it goes below. Losing
       it would replace a wrong sector name with a truncated note. */
    const { name: sector, trimmed } = repairSectorName(assembled);

    sectors.push({
      sector,
      _trimmedFromName: trimmed,
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
    /* Text trimmed off the NEXT row's name goes last, not first. It is the
       continuation of the final sentence in this row's gap — the words that
       ran past the end of the line and were mistaken for a heading — so it
       belongs after the tail, not before it. Kerala reads

         "Rs 14,500 crore ... to Kerala Social Security Pension Limited."
         "Rs 1,950 crore has been allocated towards the CM"      <- tail ends here
         "Sthree Suraksha Padhathi"                              <- trimmed

       and putting the trimmed text first opened the note with a dangling
       scheme name while leaving the sentence it completes cut off at "the CM". */
    const trimmed = sectors[i + 1]?._trimmedFromName;
    sectors[i].provision_fragments = [sectors[i].provisionHead, ...tail, trimmed]
      .filter(Boolean)
      .join(' ')
      .replace(/▪/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || null;
    delete sectors[i].provisionHead;
    delete sectors[i]._tailForPrevious;
    delete sectors[i]._trimmedFromName;
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

  /* The top-line figures from the Budget Highlights block. A short count here
     is not fatal the way a short sector table is — a paper can legitimately
     omit GSDP — but total expenditure and the two deficits are universal, so
     fewer than three headlines means the block was reframed and the parse
     should be looked at rather than trusted. */
  const headlines = parseHeadlines(lines, fiscalYear);
  if (headlines.length && headlines.length < 3) {
    throw new Error(
      `Parsed only ${headlines.length} headline figures from ${url}. The Budget ` +
        'Highlights block always carries total expenditure, receipts and the ' +
        'deficits; a short count means PRS reframed it — check before trusting.'
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

    facts: [
      ...sectors.map((s, i) => ({
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

      /* The headline figures land in state_budget_headlines, keyed by state,
         fiscal year and label — the same year the paper's "next budget"
         column describes, so a state on a 2026-27 analysis gets 2026-27
         headlines that sit above its 2026-27 sector figures. */
      ...headlines.map((h) => ({
        targetTable: 'state_budget_headlines',
        naturalKey: `${stateSlug}|${fiscalYear}|${h.label}`,
        payload: {
          state_slug: stateSlug,
          fiscal_year: fiscalYear,
          label: h.label,
          amount_cr: h.amount_cr,
          qualifier: h.qualifier,
          display_order: h.display_order,
        },
      })),
    ],
  };
}
