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

/* Not every row under this heading is an established leak, and the row has to
   say which it is rather than let the heading say it for all of them
   (migration 009). Four labels, written the way a reader would ask the
   question, not the way the column spells it:

     confirmed  the default and the majority — nothing to explain.
     alleged    claimed, and never established either way.
     suspected  the conducting body acted on its own doubt.
     denied     investigated and found not to have happened. "No leak found"
                rather than "Denied", because "denied" reads as the accused
                party's position when it is in fact the investigator's
                conclusion.

   The meaning is carried by the words, not the colour: this palette has no
   red, and a status a reader can only get from a border is a status a
   colourblind reader does not get at all. */
const STATUS_LABEL = {
  confirmed: 'Confirmed',
  alleged: 'Alleged',
  suspected: 'Suspected',
  denied: 'No leak found',
};

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
      <p className="text-muted section-note">
        Every row carries what its report established. Some of these leaks were
        confirmed by investigators or a court; others were alleged and never proved,
        and a few were investigated and found not to have happened at all. Those last
        are kept rather than dropped, because an exam called off on a false alarm
        cost the people who sat it the same year a real leak would have.
      </p>

      <div className="leak-list">
        {leaks.map((leak) => (
          <article
            key={leak.href + leak.exam + leak.year}
            className={`leak-item leak-item--${leak.status}`}
          >
            <div className="leak-head">
              <span className="leak-year tnum">{leak.year}</span>
              <h4 className="leak-exam">{leak.exam}</h4>
            </div>

            <div className="leak-facts">
              <span className={`leak-status leak-status--${leak.status}`}>
                {STATUS_LABEL[leak.status] ?? leak.status}
              </span>
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
