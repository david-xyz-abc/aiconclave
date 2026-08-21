import { PATHS } from '../../config/routes.js'

export function HomePage() {
  return (
    <main id="main">
      <section id="hero" className="dot-field">
        <div className="container">
          <div className="hero-ticket" data-reveal>
            <div className="hero-inner">
              <div className="hero-top">
                <span className="hero-eyebrow">Two-Day AI Event · Kerala</span>
                <span className="hero-badge-no">DELEGATE PASS<br />NO. AIC26</span>
              </div>
              <h1 className="hero-title">AI Conclave<br />2026</h1>
              <p className="hero-tagline">A two-day celebration of Artificial Intelligence — talks, workshops, industry panel discussions and a ₹1,00,000 hackathon at AJCE.</p>
              <div className="hero-actions">
                <a className="btn btn-primary" href={PATHS.register}>Register Now <span className="btn-arrow" aria-hidden="true">→</span></a>
                <a className="btn btn-outline" href={PATHS.schedule}>View Schedule</a>
              </div>
              <div className="hero-perforation"></div>
              <div className="hero-strip">
                <div className="hero-strip-item"><span className="hero-strip-label">Dates</span><span className="hero-strip-value">15–16 September 2026</span></div>
                <div className="hero-strip-item"><span className="hero-strip-label">Venue</span><span className="hero-strip-value">AJCE, Kanjirappally, Kerala</span></div>
                <div className="hero-strip-item"><span className="hero-strip-label">Organised By</span><span className="hero-strip-value">AI Club / Student Council</span></div>
              </div>
              <div className="hero-key">
                <div className="sector-key">
                  <span className="stamp stamp-agri">Agriculture</span>
                  <span className="stamp stamp-health">Health</span>
                  <span className="stamp stamp-edu">Education</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="hackathon" className="section">
        <div className="container">
          <div className="section-head hackathon-intro" data-reveal>
            <h2 className="section-heading">Hackathon</h2>
            <p className="section-lede">Open to internal and external school and college students. Build a technical or non-technical solution, present it to external evaluators, and take the stage at the closing ceremony.</p>
          </div>
          <div className="hackathon-grid">
            <div className="hackathon-track"><span className="hackathon-track-label">Track 01</span><h3>Technical</h3><p>For students building AI-driven solutions with code — open to school &amp; college participants.</p></div>
            <div className="hackathon-track"><span className="hackathon-track-label">Track 02</span><h3>Non-Technical</h3><p>For students tackling AI problem statements through ideation, strategy and design — open to school &amp; college participants.</p></div>
            <div className="hackathon-prize"><span className="hackathon-prize-label">Prize Pool</span><span className="hackathon-prize-figure mono-figure" data-count-to="100000" data-prefix="₹" data-format="indian">₹1,00,000</span></div>
          </div>
        </div>
      </section>

      <section id="explore" className="section">
        <div className="container">
          <div className="section-head" data-reveal><p className="eyebrow">Explore</p><h2 className="section-heading">Everything about the conclave, one page at a time.</h2></div>
          <div className="page-links-grid">
            <a className="page-link-card" href={PATHS.about} data-reveal><span className="page-link-title">About</span><span className="page-link-desc">What AI Conclave 2026 is, and who's organising it.</span><span className="page-link-arrow" aria-hidden="true">→</span></a>
            <a className="page-link-card" href={PATHS.schedule} data-reveal><span className="page-link-title">Schedule</span><span className="page-link-desc">The full Day 1 and Day 2 programme, including the panel discussion speakers.</span><span className="page-link-arrow" aria-hidden="true">→</span></a>
            <a className="page-link-card" href={PATHS.participate} data-reveal><span className="page-link-title">Who Should Attend</span><span className="page-link-desc">The audience across Agriculture, Health &amp; Education.</span><span className="page-link-arrow" aria-hidden="true">→</span></a>
            <a className="page-link-card page-link-card-cta" href={PATHS.register} data-reveal><span className="page-link-title">Register</span><span className="page-link-desc">Claim your delegate pass.</span><span className="page-link-arrow" aria-hidden="true">→</span></a>
          </div>
        </div>
      </section>
    </main>
  )
}

