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
        <span className="tag tag-neutral">Refreshed weekly</span>
      </div>
    </header>
  );
}
