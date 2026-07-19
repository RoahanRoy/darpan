import useDocumentMeta from '../hooks/useDocumentMeta.js';
import NavBar from '../components/NavBar.jsx';
import { aboutNavLinks } from '../data/homeContent.js';

/* How the records are chosen, checked and corrected.

   Everything on this page describes machinery that exists in this repository
   — the staging gate, the checksum, the refusal to promote an undated
   document. It claims no editorial process that is not actually enforced,
   because a methodology page that overstates its own rigour is worse than
   none.

   A published contact address for corrections is the one piece of this that
   cannot be derived from the code. Until one is set below, the page says so
   rather than implying a channel that does not exist. */

const CORRECTIONS_CONTACT = null;

export default function About() {
  useDocumentMeta({
    title: 'How these records are made · Yojana Darpan',
    description:
      'Where the figures come from, what is deliberately not shown, how documents are checked before publication, and how to get an error corrected.',
  });

  return (
    <div className="page">
      <NavBar links={aboutNavLinks} currentPath="/about" />

      <div className="wrap">
        <section className="split split-masthead" id="top">
          <div className="split-main">
            <div className="kicker">Method</div>
            <h1 className="masthead-title">How these records are made</h1>
            <p className="text-muted masthead-lede">
              Every figure on this site is copied from a government document that is
              linked beside it. Nothing is estimated, interpolated, modelled or filled
              in. This page explains what that means in practice, and what it costs.
            </p>
          </div>

          <div className="split-rail">
            <div className="kicker kicker-neutral">In one line</div>
            <p className="text-muted spend-sub">
              If a number cannot be traced to a published document, it does not appear
              here — even when its absence leaves an obvious hole in the page.
            </p>
          </div>
        </section>

        <section id="sources" className="section-block">
          <h3 className="section-title">Where the figures come from</h3>
          <div className="prose">
            <p>
              State budget figures come from the budget analyses published by PRS
              Legislative Research, which reproduce the sector tables as presented to
              each state legislature. Union figures come from the Budget at a Glance and
              the expenditure tables laid before Parliament. Scheme delivery counts come
              from answers and annexures tabled in Parliament.
            </p>
            <p>
              Each of those documents is listed at the foot of the page that uses it,
              with its publisher, the date the document itself carries, and the date we
              retrieved it. Where a document states no date of its own, the page says
              the date is inferred rather than asserting one the paper never claimed.
            </p>
            <p>
              A handful of figures are arithmetic rather than transcription — the gap
              between what was budgeted and what was revised, or a ministry's share of
              total expenditure. Those are marked <em>derived from published figures</em>
              , so a reader can tell our subtraction from the document's own sentence.
            </p>
          </div>
        </section>

        <section id="limits" className="section-block">
          <h3 className="section-title">What is deliberately not here</h3>
          <div className="prose">
            <p>
              <strong>District-level budgets.</strong> India does not publish allocation
              or spending at district level. Money is voted and reported by state. So
              the spending figures on a district page describe the state, and are
              labelled as such; there is no district budget table, because there is no
              district budget document.
            </p>
            <p>
              <strong>State totals added into national ones.</strong> The union budget
              is not the states' budgets summed. The two are voted by different houses
              and reported on different heads. Nothing here rolls one into the other.
            </p>
            <p>
              <strong>A refresh cadence.</strong> Budget documents are annual and some
              delivery annexures are years old. The site does not claim to update weekly,
              because it does not.
            </p>
            <p>
              <strong>Most of India.</strong> Coverage is currently two states. The map
              greys out everywhere we hold no records and refuses to respond to a click,
              rather than presenting a fully clickable country that implies data we do
              not have.
            </p>
          </div>
        </section>

        <section id="checks" className="section-block">
          <h3 className="section-title">How a figure gets published</h3>
          <div className="prose">
            <p>
              Documents are parsed by an ingestion script, but a script cannot publish.
              Parsed figures are written to a staging table as proposals, each carrying
              the bytes it was read from and a checksum of the source file. A person
              reviews the difference against what is already live and approves rows
              individually before anything moves into the tables this site reads.
            </p>
            <p>
              That gate is structural rather than a matter of habit: nothing in the
              ingestion code has permission to write to the published tables. A document
              with no date on its face will stage but cannot be promoted, because
              substituting the date we downloaded it would assert something the document
              does not say.
            </p>
            <p>
              The parser is re-run against the documents already published on a schedule.
              If it stops reproducing the figures a human transcribed by hand, the run
              fails and raises an issue rather than quietly writing different numbers.
            </p>
          </div>
        </section>

        <section id="corrections" className="section-block">
          <h3 className="section-title">Corrections</h3>
          <div className="prose">
            <p>
              Transcription errors are the most likely fault here, and the linked source
              document is always the authority. If a figure on this site disagrees with
              the document beside it, the document is right and this site is wrong.
            </p>
            <p>
              {CORRECTIONS_CONTACT ? (
                <>
                  Corrections go to{' '}
                  <a href={`mailto:${CORRECTIONS_CONTACT}`}>{CORRECTIONS_CONTACT}</a>.
                  Please include the page and the source document.
                </>
              ) : (
                <>
                  A public contact address for corrections has not been published yet.
                  Until it is, this site has no way to receive a report of an error —
                  which is a real gap, and it is recorded here rather than papered over.
                </>
              )}
            </p>
          </div>
        </section>

        <section id="reuse" className="section-block">
          <h3 className="section-title">Reuse</h3>
          <div className="prose">
            <p>
              The underlying documents are Indian government publications and the
              analyses are PRS Legislative Research's; both carry their own terms, and
              the links beside each figure go to the originals. The India map geometry is{' '}
              <a
                href="https://github.com/VictorCazanave/svg-maps"
                target="_blank"
                rel="noopener noreferrer"
              >
                @svg-maps/india
              </a>{' '}
              by Victor Cazanave, used under CC-BY-4.0.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
