/* The registry of the stores that live in git, and the pure half of applying
   one.

   These hold what no adapter can regenerate — a reviewer's gloss, a one-line
   summary of somebody else's reporting, a table read off a PDF and typed in —
   so the file is authoritative and the database is the copy (db/README.md,
   "Prose that lives in git"). Each arrived with its own script, and by the
   third the second one opened by explaining how it was like the first. Three
   instances of a pattern is where the pattern gets a name.

   Two strategies, because the stores are genuinely two shapes and pretending
   otherwise would cost more than it saved:

     rows    the store owns every row a scope has in some table, so applying it
             means replacing that scope's rows. findings and budget news both
             work this way — neither has a natural key beyond the sentence
             itself, so there is nothing to update in place.

     column  the store owns one column of rows that exist for other reasons.
             Glosses work this way: the sector row is the adapter's, and only
             provision_note is ours. Nothing is ever deleted, and a key that
             matches no row is a defect rather than a no-op.

   A scope is a state for most of them. It is the centre for the paper leaks,
   the country for the roundup, and a ministry for the spending breakdown — a
   distinction sync.js handles with `unscopedKey`, `scopeColumn` and
   `scopeTable`, and which nothing in this file needs to know about beyond
   declaring it.

   Everything here is pure — given a store and the rows that are live, it says
   what differs. The database half lives in scripts/sync.js, which is what
   makes the comparison testable without one. */

/** Groups live rows by the scope slug they carry. */
export function groupBySlug(rows) {
  const out = new Map();
  for (const r of rows) {
    if (!out.has(r.slug)) out.set(r.slug, []);
    out.get(r.slug).push(r);
  }
  return out;
}

/** The fields that decide whether two rows say the same thing, as a string. */
export const shapeOf = (fields) => (item) =>
  JSON.stringify(fields.map((f) => item[f] ?? null));

/* Compares a whole scope at a time rather than row by row. A row-level diff
   would have to answer which live row a store entry corresponds to, and the
   answer is "none in particular" — that is what having no natural key means.
   So a scope whose list differs in any way is rewritten entirely, and a scope
   the store does not name is never touched at all.

   A scope is a state for most stores, the centre for one, the country for
   another and a ministry for the last. All this needs to know is that live
   rows carry the slug of whichever it is. */
export function changedScopes({ store, live, fields, sort }) {
  const shape = shapeOf(fields);
  const byScope = groupBySlug(live);
  const changed = [];

  for (const [slug, list] of Object.entries(store)) {
    const now = (byScope.get(slug) ?? []).map(shape).join('\n');
    const want = sort(list).map(shape).join('\n');
    if (now !== want) changed.push(slug);
  }
  return changed;
}

/* For the column strategy. Returns three lists, and the distinction between
   the second and third is the whole point:

     toWrite    the row exists and the text differs — apply fixes it.
     unmatched  the store has a key no row answers to. PRS renames sectors —
                an Oxford comma added to "Education, Sports, Arts, and Culture"
                stranded a row once already — so this is reported loudly and
                never silently skipped.
     ungiven    the row exists and the store says nothing about it. Not an
                error: three states publish no provision text at all. Worth
                counting so the gap is a number somebody watches. */
export function columnDiff({ store, live, column }) {
  const byKey = new Map(live.map((r) => [r.key, r]));
  const toWrite = [];
  const unmatched = [];

  for (const [key, text] of Object.entries(store)) {
    const row = byKey.get(key);
    if (!row) unmatched.push(key);
    else if (row[column] !== text) toWrite.push({ id: row.id, key, text });
  }

  const ungiven = live.filter((r) => !store[r.key]).map((r) => r.key);
  return { toWrite, unmatched, ungiven };
}

const newestFirst = (list) =>
  [...list].sort((a, b) => b.published_on.localeCompare(a.published_on));

/* Leaks are dated to the year, so year alone does not order them. Exam name
   breaks the tie, which makes the order total and therefore stable — without
   it two incidents from the same year could swap places between runs and the
   diff would report a change nobody made. */
const byYearThenName = (list) =>
  [...list].sort(
    (a, b) => b.occurred_year - a.occurred_year || a.exam_name.localeCompare(b.exam_name)
  );

/* What a leak row is allowed to claim about itself. Mirrors the CHECK in
   migration 009, which is the authority; this copy is here so the store can
   refuse a bad value before the transaction has deleted anything. Exported so
   the API and the test can spell the four values once. */
export const LEAK_STATUSES = new Set(['confirmed', 'alleged', 'suspected', 'denied']);

export const STORES = [
  {
    id: 'glosses',
    strategy: 'column',
    file: 'ingest/glosses.json',
    jsonKey: 'glosses',
    noun: 'gloss',
    plural: 'glosses',

    // Keyed by state slug and sector name, never by row id: ids are assigned
    // by whichever promote ran first and change whenever a state is
    // re-ingested.
    table: 'state_sector_budgets',
    column: 'provision_note',
    unmatchedHint: 'sector renamed?',
    liveSql: `
      SELECT b.id, s.slug || '|' || b.sector AS key, b.provision_note
      FROM state_sector_budgets b
      JOIN states s ON s.id = b.state_id
    `,
  },

  {
    id: 'findings',
    strategy: 'rows',
    file: 'ingest/findings.json',
    jsonKey: 'findings',
    noun: 'finding',
    plural: 'findings',

    table: 'findings',
    refs: ['states', 'sources'],
    fields: ['kind', 'tag_label', 'headline', 'body', 'source_slug'],
    sort: (list) => list,

    /* The delete is bounded to computed_from_source, and that bound is the
       only thing standing between a re-run and the loss of prose nobody can
       regenerate. Rows marked TRUE are arithmetic this project did on
       published figures — derive-findings.js rebuilds any of them from the
       sector table, so deleting one costs nothing. Rows marked FALSE are
       quoted from a document's own summary, exist nowhere but db/seed.sql,
       and are never this script's to touch whatever the store says. */
    deleteWhere: 'AND computed_from_source',

    /* Hand-written findings keep their display_order and computed rows are
       appended after them: a quoted CAG observation should lead a state's
       feed and our arithmetic should follow it. */
    appendAfterExisting: true,

    liveSql: `
      SELECT st.slug, f.kind, f.tag_label, f.headline, f.body, src.slug AS source_slug
      FROM findings f
      JOIN states st ON st.id = f.state_id
      JOIN sources src ON src.id = f.source_id
      WHERE f.computed_from_source AND st.slug = ANY($1)
      ORDER BY st.slug, f.display_order
    `,

    columns: ['kind', 'tag_label', 'headline', 'body', 'computed_from_source', 'source_id'],
    values: (f, refs) => [
      f.kind, f.tag_label, f.headline, f.body, true, refs.sources.get(f.source_slug),
    ],

    /* Checked before anything is written, across the whole store: a bad
       source slug should refuse the run, not land the states that happen to
       resolve. A half-applied store is harder to reason about than one that
       did not apply at all. */
    validate: (list, slug, refs) =>
      list
        .filter((f) => !refs.sources.has(f.source_slug))
        .map((f) => `${slug}: no such source: ${f.source_slug}`),

    describe: (f) => `[${f.kind}] ${f.headline}`,
  },

  {
    id: 'news',
    strategy: 'rows',
    file: 'ingest/budget-news.json',
    jsonKey: 'news',
    noun: 'news item',
    plural: 'news items',

    table: 'state_budget_news',
    refs: ['states'],
    fields: [
      'category', 'scheme_name', 'reported_amount',
      'headline', 'summary', 'outlet', 'url', 'published_on',
    ],

    /* The store may list items in any order; sorting here means the
       display_order written to the table is the dated order, so the API can
       ORDER BY it without re-sorting. */
    sort: newestFirst,

    /* Unlike findings there is no second class of rows to protect. No adapter
       writes this table, so a re-apply cannot clobber anything the file does
       not already hold. */
    deleteWhere: '',
    appendAfterExisting: false,

    liveSql: `
      SELECT st.slug, n.category, n.scheme_name, n.reported_amount,
             n.headline, n.summary, n.outlet, n.url, n.published_on::text
      FROM state_budget_news n
      JOIN states st ON st.id = n.state_id
      WHERE st.slug = ANY($1)
      ORDER BY st.slug, n.display_order
    `,

    columns: [
      'category', 'scheme_name', 'reported_amount',
      'headline', 'summary', 'outlet', 'url', 'published_on',
    ],

    /* `category` is written from the store rather than left to the column
       default, so an item that forgot to declare one fails the insert instead
       of silently filing a reported loss as ordinary budget coverage. The two
       optional fields coalesce to NULL, which is what the database holds for
       a story that names no scheme or carries no figure. */
    values: (n) => [
      n.category, n.scheme_name ?? null, n.reported_amount ?? null,
      n.headline, n.summary, n.outlet, n.url, n.published_on,
    ],

    /* The CHECK constraint would catch this too, but only on the insert, by
       which point the state's existing rows have already been deleted inside
       the transaction. Refusing the whole run up front says which item is
       wrong instead of which constraint failed. */
    validate: (list, slug) =>
      list
        .filter((n) => n.category !== 'budget' && n.category !== 'loss')
        .map((n) => `${slug}: category must be 'budget' or 'loss': ${n.url}`),

    describe: (n) =>
      `${n.published_on}  [${n.category}] ${n.headline}` +
      (n.reported_amount ? ` (${n.reported_amount})` : ''),
  },

  {
    id: 'leaks',
    strategy: 'rows',
    file: 'ingest/paper-leaks.json',
    jsonKey: 'leaks',
    noun: 'paper leak',
    plural: 'paper leaks',

    table: 'exam_paper_leaks',
    refs: ['states'],

    /* The one store whose scopes are not all states. A nationally conducted
       exam belongs to no state — see migration 006 — so it is filed under
       this key and written with state_id NULL. The rest of the machinery is
       unchanged: 'union' is just another scope whose rows are replaced
       wholesale. */
    unscopedKey: 'union',

    fields: [
      'exam_name', 'conducting_body', 'occurred_year', 'leak_status',
      'candidates_affected', 'outcome', 'summary', 'outlet', 'url',
    ],
    sort: byYearThenName,

    // No adapter writes this table either, so there is nothing to protect.
    deleteWhere: '',
    appendAfterExisting: false,

    liveSql: `
      SELECT COALESCE(st.slug, 'union') AS slug,
             l.exam_name, l.conducting_body, l.occurred_year, l.leak_status,
             l.candidates_affected, l.outcome, l.summary, l.outlet, l.url
      FROM exam_paper_leaks l
      LEFT JOIN states st ON st.id = l.state_id
      WHERE COALESCE(st.slug, 'union') = ANY($1)
      ORDER BY 1, l.display_order
    `,

    columns: [
      'exam_name', 'conducting_body', 'occurred_year', 'leak_status',
      'candidates_affected', 'outcome', 'summary', 'outlet', 'url',
    ],
    values: (l) => [
      l.exam_name, l.conducting_body, l.occurred_year, l.leak_status,
      l.candidates_affected ?? null, l.outcome, l.summary, l.outlet, l.url,
    ],

    /* Two checks, both of which exist because the failure is silent rather
       than loud.

       A year typed as a string would compare unequal to the integer the
       column returns forever, and the store would report the scope changed on
       every single run without ever converging. Cheap to check, tedious to
       diagnose.

       `leak_status` is checked here as well as by the CHECK constraint
       (migration 009) for the reason the news store checks `category`: the
       constraint only fires on the insert, by which point the scope's rows
       have already been deleted inside the transaction, and the error it
       raises names a constraint rather than an incident. More to the point,
       the column has no default any more — an item that omits it would fail
       on NOT NULL, and "null value in column leak_status" is a worse thing to
       read than the name of the exam that forgot to say whether it leaked. */
    validate: (list, slug) => [
      ...list
        .filter((l) => !Number.isInteger(l.occurred_year))
        .map((l) => `${slug}: occurred_year must be an integer: ${l.exam_name}`),
      ...list
        .filter((l) => !LEAK_STATUSES.has(l.leak_status))
        .map(
          (l) =>
            `${slug}: leak_status must be one of ${[...LEAK_STATUSES].join(', ')}: ` +
            `${l.exam_name} (${l.occurred_year})`
        ),
    ],

    describe: (l) =>
      `${l.occurred_year}  [${l.leak_status}] ${l.exam_name}` +
      (l.conducting_body ? ` (${l.conducting_body})` : '') +
      (l.candidates_affected ? ` · ${l.candidates_affected}` : ''),
  },

  {
    id: 'roundup',
    strategy: 'rows',
    file: 'ingest/policy-roundup.json',
    jsonKey: 'roundup',
    noun: 'roundup item',
    plural: 'roundup items',

    table: 'policy_roundup',
    refs: ['states'],

    /* One scope, and it is not a state: this is the national digest on the
       front page. `refs: ['states']` is still declared because sync.js
       resolves it before checking anything, and an empty list would be a
       stranger thing to explain than an unused map. */
    unscopedKey: 'india',

    /* The table has no scope column at all — it holds one list and always
       will. Saying so is what stops sync.js reaching for `state_id`, which
       here does not exist. A nullable state_id kept only to satisfy the
       apply machinery would be a column that describes nothing. */
    scopeColumn: null,

    fields: ['happened_on', 'region_label', 'headline', 'summary', 'impact', 'outlet', 'url'],
    sort: (list) => [...list].sort((a, b) => b.happened_on.localeCompare(a.happened_on)),

    deleteWhere: '',
    appendAfterExisting: false,

    /* No state join at all — the table has no state_id. The literal keeps the
       shape sync.js expects, where every live row says which scope it is in. */
    liveSql: `
      SELECT 'india' AS slug, r.happened_on::text, r.region_label,
             r.headline, r.summary, r.impact, r.outlet, r.url
      FROM policy_roundup r
      WHERE 'india' = ANY($1)
      ORDER BY r.display_order
    `,

    columns: ['happened_on', 'region_label', 'headline', 'summary', 'impact', 'outlet', 'url'],
    values: (r) => [
      r.happened_on, r.region_label, r.headline, r.summary, r.impact, r.outlet, r.url,
    ],

    describe: (r) => `${r.happened_on}  [${r.region_label}] ${r.headline}`,
  },

  {
    id: 'ministry-lines',
    strategy: 'rows',
    file: 'ingest/ministry-spending.json',
    jsonKey: 'ministryLines',
    noun: 'ministry line',
    plural: 'ministry lines',

    table: 'union_ministry_lines',

    /* The first store whose scopes are not states at all. A scope key here is
       a ministry slug, so the id the rows are written against comes from
       union_ministry_budgets rather than from states — which is all
       `scopeTable` says. Everything else is the ordinary rows strategy:
       a ministry's lines are replaced wholesale. */
    refs: ['union_ministry_budgets'],
    scopeTable: 'union_ministry_budgets',
    scopeNoun: 'ministry',
    scopeColumn: 'ministry_id',

    fields: [
      'label', 'parent_label',
      'actuals_prev_cr', 'budgeted_cr', 'revised_cr', 'next_budget_cr',
      'basis', 'document_title', 'document_url', 'document_date',
    ],

    /* The file's order IS the order: a ministry's lines are its departments
       in the sequence the analysis prints them, each followed by whatever
       sits under it. Sorting by size would break a parent away from its
       children, and sorting alphabetically would throw away the ranking the
       source spent its own judgement on. */
    sort: (list) => list,

    deleteWhere: '',
    appendAfterExisting: false,

    liveSql: `
      SELECT m.slug, l.label, l.parent_label,
             l.actuals_prev_cr::text, l.budgeted_cr::text,
             l.revised_cr::text, l.next_budget_cr::text,
             l.basis, l.document_title, l.document_url, l.document_date::text
      FROM union_ministry_lines l
      JOIN union_ministry_budgets m ON m.id = l.ministry_id
      WHERE m.slug = ANY($1)
      ORDER BY m.slug, l.display_order
    `,

    columns: [
      'label', 'parent_label',
      'actuals_prev_cr', 'budgeted_cr', 'revised_cr', 'next_budget_cr',
      'basis', 'document_title', 'document_url', 'document_date',
    ],
    values: (l) => [
      l.label, l.parent_label ?? null,
      l.actuals_prev_cr ?? null, l.budgeted_cr ?? null,
      l.revised_cr ?? null, l.next_budget_cr ?? null,
      l.basis, l.document_title, l.document_url, l.document_date,
    ],

    /* Three checks, and the first is the one that earns its keep.

       `basis` and the three document fields are repeated on every line of a
       ministry (migration 010), because the store is a flat list per scope
       and has nowhere else to put them. Repetition invites drift: an editor
       who rewrites the basis sentence and misses two rows leaves a ministry
       that says two different things about what its own figures mean. So the
       store refuses to apply unless a ministry's lines agree, which converts
       the denormalisation from a hazard into an invariant.

       A parent_label that matches no top-level label in the same ministry
       would render as a line under a heading that is not there — visible to
       nobody until a reader wondered where a scheme went.

       And a money field arrives as a string, because that is what NUMERIC
       comes back as and the diff compares them as text. A number in the file
       would report the ministry changed on every run and never converge —
       the same trap `occurred_year` sets in the leaks store, from the
       opposite direction. */
    validate: (list, slug) => {
      const problems = [];

      for (const field of ['basis', 'document_title', 'document_url', 'document_date']) {
        const distinct = new Set(list.map((l) => l[field]));
        if (distinct.size > 1) {
          problems.push(`${slug}: lines disagree about ${field} (${distinct.size} values)`);
        }
      }

      const heads = new Set(list.filter((l) => !l.parent_label).map((l) => l.label));
      for (const l of list) {
        if (l.parent_label && !heads.has(l.parent_label)) {
          problems.push(`${slug}: ${l.label} sits under "${l.parent_label}", which is not a head here`);
        }
      }

      for (const l of list) {
        for (const f of ['actuals_prev_cr', 'budgeted_cr', 'revised_cr', 'next_budget_cr']) {
          if (l[f] != null && typeof l[f] !== 'string') {
            problems.push(`${slug}: ${l.label}.${f} must be a string, not ${typeof l[f]}`);
          }
        }
      }

      return problems;
    },

    describe: (l) =>
      `${l.parent_label ? '  ' : ''}${l.label} · ${l.next_budget_cr ?? '—'}`,
  },

  {
    id: 'scheme-ministries',
    strategy: 'column',
    file: 'ingest/ministry-spending.json',
    jsonKey: 'schemeMinistries',
    noun: 'scheme attribution',
    plural: 'scheme attributions',

    /* Keyed by scheme name, which is the column the union table already
       enforces as UNIQUE — so unlike the glosses, whose sector names PRS has
       renamed under us, an unmatched key here means the scheme table changed
       and this file did not.

       The same file as the lines above, under a different key. The two answer
       one question between them — where does a ministry's money go, and whose
       money is a scheme — and splitting them across two files would mean
       editing one and forgetting the other. */
    table: 'union_scheme_allocations',
    column: 'ministry',
    unmatchedHint: 'scheme renamed, or a new budget seeded?',
    liveSql: `
      SELECT id, scheme_name AS key, ministry
      FROM union_scheme_allocations
    `,
  },
];

export const storeById = (id) => STORES.find((s) => s.id === id);
