import { navLinks } from '../data/homeContent.js';

export default function NavBar() {
  return (
    <header className="nav">
      <div className="wrap nav-inner">
        <div className="nav-brand nav-brand-lg">YOJANA&nbsp;DARPAN</div>
        <nav className="nav-links">
          {navLinks.map((link) => (
            <a key={link.label} href={link.href} aria-current={link.current ? 'page' : undefined}>
              {link.label}
            </a>
          ))}
        </nav>
        {/* The comp said "Refreshed weekly". Nothing refreshes weekly: the
            budget documents are annual and the delivery annexure is from
            2023. Claiming a cadence the data does not have is the same
            failure as inventing the figures. */}
        <span className="tag tag-neutral">Sourced documents</span>
      </div>
    </header>
  );
}
