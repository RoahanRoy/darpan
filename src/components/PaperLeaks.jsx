/* Examinations whose question papers leaked — the one block on this site that
   is not about money.

   It earns its place next to the budget because it records the same thing the
   budget tables do from the other side: something a government undertook to
   deliver, and did not. A cancelled recruitment exam is not an underspend,
   but for the 48 lakh people who sat it, it is the same failure to deliver.

   Every row is a pointer to reporting, never a claim of this site's own, and
   the note says so before the reader reaches the first figure. Used by both
   the state page and the Parliament page: a state's page lists the exams that
   state conducted, Parliament lists the ones no state did (migration 006).

   The candidate counts are strings, not numbers, and are deliberately never
   totalled — see the block note. */

export default function PaperLeaks({ leaks = [], scopeName, scopeNote }) {
  if (leaks.length === 0) return null;

  return (
    <section id="paper-leaks" className="section-block">
      <h3 className="section-title">Question papers leaked · {scopeName}</h3>
      <p className="text-muted section-note">
        {scopeNote} Each entry is limited to what the report it cites actually says:
        where an outlet named no conducting body, gave no figure, or never said what
        happened afterwards, the row leaves that blank rather than filling it in.
        The counts are the outlets’ own wording and are not added up — a candidate
        who sat a re-held exam appears in two rows and is one person.
      </p>

      <div className="leak-list">
        {leaks.map((leak) => (
          <article key={leak.href + leak.exam + leak.year} className="leak-item">
            <div className="leak-head">
              <span className="leak-year tnum">{leak.year}</span>
              <h4 className="leak-exam">{leak.exam}</h4>
            </div>

            <div className="leak-facts">
              {leak.body && <span className="leak-body-name">{leak.body}</span>}
              {leak.candidatesAffected && (
                <span className="leak-count">{leak.candidatesAffected} candidates</span>
              )}
              <span className="leak-outcome">{leak.outcome}</span>
            </div>

            <p className="text-muted leak-summary">{leak.summary}</p>

            <p className="leak-credit text-muted">
              Reported by{' '}
              <a href={leak.href} target="_blank" rel="noopener noreferrer">
                {leak.outlet}
              </a>
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
