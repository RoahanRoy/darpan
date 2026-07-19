import { navigate } from '../hooks/useRoute.js';

/* Links starting with '/' are routes and are handled in-app; links starting
   with '#' are in-page anchors and are left entirely to the browser.

   They are also rendered as two groups, because narrow screens drop the
   anchors — a jump list is not worth the width when the page scrolls
   anyway. The routes must survive that: hiding them would leave the other
   page with no way in on a phone. */

export default function NavBar({ links, currentPath }) {
  const anchors = links.filter((l) => l.href.startsWith('#'));
  const routes = links.filter((l) => l.href.startsWith('/'));

  function handleClick(event, href) {
    if (!href.startsWith('/')) return;
    // Modified clicks are the user asking for a new tab or window. Taking
    // those over would break a normal browser affordance.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (event.button !== 0) return;
    event.preventDefault();
    navigate(href);
  }

  return (
    <header className="nav">
      <div className="wrap nav-inner">
        <a
          className="nav-brand nav-brand-lg"
          href="/"
          onClick={(e) => handleClick(e, '/')}
        >
          YOJANA&nbsp;DARPAN
        </a>
        <div className="nav-links">
          <nav className="nav-group nav-anchors" aria-label="On this page">
            {anchors.map((link) => (
              <a key={link.label} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>
          <nav className="nav-group nav-routes" aria-label="Sections">
            {routes.map((link) => (
              <a
                key={link.label}
                href={link.href}
                aria-current={link.href === currentPath ? 'page' : undefined}
                onClick={(e) => handleClick(e, link.href)}
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
        {/* The comp said "Refreshed weekly". Nothing refreshes weekly: the
            budget documents are annual and the delivery annexure is from
            2023. Claiming a cadence the data does not have is the same
            failure as inventing the figures. */}
        <span className="tag tag-neutral">Sourced documents</span>
      </div>
    </header>
  );
}
