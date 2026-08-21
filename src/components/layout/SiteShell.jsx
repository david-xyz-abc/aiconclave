import { useState } from 'react'
import { PATHS } from '../../config/routes.js'

function Header({ active }) {
  const [open, setOpen] = useState(false)
  const closeMenu = () => setOpen(false)
  const linkClass = (page) => (active === page ? 'is-active' : undefined)
  const registrationActive = active.startsWith('register') || active === 'my-registration'

  return <header id="site-header" className="site-header">
    <div className="container header-bar">
      <a className="site-logo" href={PATHS.home} onClick={closeMenu}>AI CONCLAVE <span className="logo-year">2026 · AJCE KANJIRAPPALLY</span></a>
      <button id="nav-toggle" className="nav-toggle" type="button" aria-expanded={open} aria-controls="main-nav" onClick={() => setOpen((value) => !value)}>
        <span className="sr-only">Menu</span><span className="nav-toggle-bar"></span><span className="nav-toggle-bar"></span><span className="nav-toggle-bar"></span>
      </button>
      <nav className={`main-nav${open ? ' is-open' : ''}`} id="main-nav" aria-label="Primary">
        <ul className="main-nav-list">
          <li><a href={PATHS.home} className={linkClass('home')} aria-current={active === 'home' ? 'page' : undefined} onClick={closeMenu}>Home</a></li>
          <li><a href={PATHS.about} className={linkClass('about')} aria-current={active === 'about' ? 'page' : undefined} onClick={closeMenu}>About</a></li>
          <li><a href={PATHS.schedule} className={linkClass('schedule')} aria-current={active === 'schedule' ? 'page' : undefined} onClick={closeMenu}>Schedule</a></li>
          <li><a href={PATHS.participate} className={linkClass('participate')} aria-current={active === 'participate' ? 'page' : undefined} onClick={closeMenu}>Participate</a></li>
          <li><a href={PATHS.myRegistration} className={linkClass('my-registration')} aria-current={active === 'my-registration' ? 'page' : undefined} onClick={closeMenu}>My registrations</a></li>
          <li><a href={PATHS.register} className={`btn btn-primary nav-cta${registrationActive ? ' is-active' : ''}`} aria-current={registrationActive ? 'page' : undefined} onClick={closeMenu}>Register</a></li>
        </ul>
      </nav>
    </div>
  </header>
}

function Footer() {
  return <footer id="footer"><div className="container footer-grid">
    <div className="footer-org"><span className="site-logo">AI CONCLAVE <span className="logo-year">2026</span></span><p className="footer-departments">Organised by AI Club, Student Council – AJCE · CA · CSE · AI · ECE · EEE</p></div>
    <div className="footer-meta"><p>Amal Jyothi College of Engineering<br />Kanjirappally, Kerala</p><p>© 2026 AI Conclave</p></div>
  </div></footer>
}

export function SiteShell({ active, children }) {
  return <><a className="skip-link" href="#main">Skip to main content</a><div className="scroll-progress" id="scroll-progress" aria-hidden="true"></div><Header active={active} />{children}<Footer /></>
}
