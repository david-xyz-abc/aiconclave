import { useEffect, useRef, useState } from 'react'

const PATHS = {
  home: '/',
  about: '/about',
  schedule: '/schedule',
  participate: '/participate',
  register: '/register',
}

const categories = [
  'Student',
  'Faculty',
  'Farmer',
  'Healthcare Professional',
  'Industry',
  'Other',
]

const trackOptions = [
  {
    id: 'track-workshops',
    value: 'Workshops',
    title: 'Workshops',
    description: 'Day 1 parallel workshops run by AJCE departments & clubs.',
  },
  {
    id: 'track-hackathon-tech',
    value: 'Hackathon (Technical)',
    title: 'Hackathon — Technical',
    description: 'Day 2 technical track, open to school & college students.',
  },
  {
    id: 'track-hackathon-nontech',
    value: 'Hackathon (Non-Technical)',
    title: 'Hackathon — Non-Technical',
    description: 'Day 2 non-technical track, open to school & college students.',
  },
  {
    id: 'track-panel',
    value: 'Panel Discussion',
    title: 'Panel Discussion',
    description: 'Day 1, 10:30 AM — AI Across Sectors.',
  },
]

const participantGroups = [
  {
    id: 'participants-agri',
    stamp: 'stamp-agri',
    name: 'Agriculture',
    items: [
      'Farmers and progressive farmers',
      'Farmer Producer Organisations (FPOs), agricultural cooperatives and self-help groups',
      'Agricultural officers, Krishi Bhavan representatives and local self-government officials',
      'Scientists and extension specialists from KAU, KVK and ICAR institutions',
      'Agri-tech entrepreneurs, start-ups and rural innovators',
      'Drone, IoT, robotics, remote-sensing and AI solution developers',
      'Food-processing, warehousing, cold-chain and agricultural supply-chain representatives',
      'Agricultural equipment manufacturers and input suppliers',
      'Representatives from NABARD, rural banks, agricultural insurance and development agencies',
      'Students, faculty and researchers from Agriculture, Food Technology, Computer Science and related disciplines',
      'NGOs and community organisations working with farmers and rural communities',
    ],
  },
  {
    id: 'participants-health',
    stamp: 'stamp-health',
    name: 'Health',
    items: [
      'Doctors, dentists and medical specialists',
      'Nurses, allied health professionals and community health workers',
      'Hospital administrators, clinic managers and diagnostic-centre representatives',
      'Biomedical engineers and medical equipment manufacturers',
      'Health-tech and AI start-ups',
      'Public health officials and government health-department representatives',
      'Pharmacists and clinical laboratory professionals',
      'Medical, dental, nursing, pharmacy and engineering students',
      'Faculty and researchers working in healthcare, AI and biomedical systems',
      'Patients, caregivers, patient-support groups and disability-support organisations',
      'NGOs working in rural health, rehabilitation and community care',
      'Health insurance and healthcare-finance representatives',
    ],
  },
  {
    id: 'participants-edu',
    stamp: 'stamp-edu',
    name: 'Education',
    items: [
      'School and college students',
      'Teachers, faculty members and academic mentors',
      'Principals, headteachers, department heads and academic administrators',
      'University leaders, curriculum designers and education policymakers',
      'Parents and parent-teacher association representatives',
      'Educational technology and AI start-ups',
      'Instructional-content developers and learning-platform providers',
      'Career counsellors, placement officers and skill-development organisations',
      'Special educators and accessibility experts',
      'Researchers working in education, AI and learning technologies',
      'Representatives from government education departments and institutional managements',
      'Rural and community education representatives',
    ],
  },
]

const initialForm = {
  name: '',
  email: '',
  phone: '',
  organisation: '',
  category: '',
  tracks: [],
}

function currentPage() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (path === '/about') return 'about'
  if (path === '/schedule') return 'schedule'
  if (path === '/participate') return 'participate'
  if (path === '/register') return 'register'
  return 'home'
}

function useSiteEnhancements() {
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const revealNodes = document.querySelectorAll('[data-reveal]')
    const countNodes = document.querySelectorAll('[data-count-to]')
    const progressBar = document.getElementById('scroll-progress')

    const updateProgress = () => {
      if (!progressBar) return
      const doc = document.documentElement
      const maximum = doc.scrollHeight - doc.clientHeight
      progressBar.style.width = `${maximum > 0 ? (window.scrollY / maximum) * 100 : 0}%`
    }

    const observers = []
    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealNodes.forEach((node) => node.classList.add('is-revealed'))
    } else if (revealNodes.length) {
      const revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-revealed')
              revealObserver.unobserve(entry.target)
            }
          })
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
      )
      revealNodes.forEach((node) => revealObserver.observe(node))
      observers.push(revealObserver)
    }

    const formatIndian = (value) => {
      const stringValue = String(Math.round(value))
      const lastThree = stringValue.slice(-3)
      const rest = stringValue.slice(0, -3)
      return rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${lastThree}` : lastThree
    }

    const animateCount = (node) => {
      if (node.dataset.counted === '1') return
      node.dataset.counted = '1'
      const target = Number.parseFloat(node.getAttribute('data-count-to'))
      if (Number.isNaN(target)) return
      const prefix = node.getAttribute('data-prefix') || ''
      const suffix = node.getAttribute('data-suffix') || ''
      const indian = node.getAttribute('data-format') === 'indian'
      const render = (value) => `${prefix}${indian ? formatIndian(value) : Math.round(value)}${suffix}`

      if (reduceMotion) {
        node.textContent = render(target)
        return
      }

      const start = performance.now()
      const frame = (now) => {
        const progress = Math.min(1, (now - start) / 1200)
        const eased = 1 - (1 - progress) ** 3
        node.textContent = render(target * eased)
        if (progress < 1) requestAnimationFrame(frame)
        else node.textContent = render(target)
      }
      requestAnimationFrame(frame)
    }

    if (!('IntersectionObserver' in window)) {
      countNodes.forEach(animateCount)
    } else if (countNodes.length) {
      const countObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              animateCount(entry.target)
              countObserver.unobserve(entry.target)
            }
          })
        },
        { threshold: 0.4 },
      )
      countNodes.forEach((node) => countObserver.observe(node))
      observers.push(countObserver)
    }

    window.addEventListener('scroll', updateProgress, { passive: true })
    window.addEventListener('resize', updateProgress)
    updateProgress()

    return () => {
      window.removeEventListener('scroll', updateProgress)
      window.removeEventListener('resize', updateProgress)
      observers.forEach((observer) => observer.disconnect())
    }
  }, [])
}

function Footer() {
  return (
    <footer id="footer">
      <div className="container footer-grid">
        <div className="footer-org">
          <span className="site-logo">AI CONCLAVE <span className="logo-year">2026</span></span>
          <p className="footer-departments">Organised by AI Club, Student Council – AJCE · CA · CSE · AD · ECE · EEE</p>
        </div>
        <div className="footer-meta">
          <p>Amal Jyothi College of Engineering<br />Kanjirappally, Kerala</p>
          <p>© 2026 AI Conclave</p>
        </div>
      </div>
    </footer>
  )
}

function Header({ active }) {
  const [open, setOpen] = useState(false)
  const closeMenu = () => setOpen(false)
  const linkClass = (page) => (active === page ? 'is-active' : undefined)

  return (
    <header id="site-header" className="site-header">
      <div className="container header-bar">
        <a className="site-logo" href={PATHS.home} onClick={closeMenu}>AI CONCLAVE <span className="logo-year">2026 · AJCE KANJIRAPPALLY</span></a>
        <button id="nav-toggle" className="nav-toggle" type="button" aria-expanded={open} aria-controls="main-nav" onClick={() => setOpen((value) => !value)}>
          <span className="sr-only">Menu</span>
          <span className="nav-toggle-bar"></span>
          <span className="nav-toggle-bar"></span>
          <span className="nav-toggle-bar"></span>
        </button>
        <nav className={`main-nav${open ? ' is-open' : ''}`} id="main-nav" aria-label="Primary">
          <ul className="main-nav-list">
            <li><a href={PATHS.home} className={linkClass('home')} aria-current={active === 'home' ? 'page' : undefined} onClick={closeMenu}>Home</a></li>
            <li><a href={PATHS.about} className={linkClass('about')} aria-current={active === 'about' ? 'page' : undefined} onClick={closeMenu}>About</a></li>
            <li><a href={PATHS.schedule} className={linkClass('schedule')} aria-current={active === 'schedule' ? 'page' : undefined} onClick={closeMenu}>Schedule</a></li>
            <li><a href={PATHS.participate} className={linkClass('participate')} aria-current={active === 'participate' ? 'page' : undefined} onClick={closeMenu}>Participate</a></li>
            <li><a href={PATHS.register} className={`btn btn-primary nav-cta${active === 'register' ? ' is-active' : ''}`} aria-current={active === 'register' ? 'page' : undefined} onClick={closeMenu}>Register</a></li>
          </ul>
        </nav>
      </div>
    </header>
  )
}

function Shell({ active, children }) {
  return (
    <>
      <a className="skip-link" href="#main">Skip to main content</a>
      <div className="scroll-progress" id="scroll-progress" aria-hidden="true"></div>
      <Header active={active} />
      {children}
      <Footer />
    </>
  )
}

function HomePage() {
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
              <p className="hero-tagline">AI Across Sectors — Agriculture, Health &amp; Education. Two days of dialogue-driven sessions, a panel discussion and a ₹1,00,000 hackathon at AJCE.</p>
              <div className="hero-actions">
                <a className="btn btn-primary" href={PATHS.register}>Register Now <span className="btn-arrow" aria-hidden="true">→</span></a>
                <a className="btn btn-outline" href={PATHS.schedule}>View Schedule</a>
              </div>
              <div className="hero-perforation"></div>
              <div className="hero-strip">
                <div className="hero-strip-item"><span className="hero-strip-label">Dates</span><span className="hero-strip-value">To be announced</span></div>
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
            <p className="section-lede">Open to school and college students. Build across two tracks, get evaluated the same day, and take the stage at the valedictory function.</p>
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

function AboutPage() {
  return (
    <main id="main"><section id="about" className="section"><div className="container about-grid">
      <div data-reveal><p className="eyebrow">About the Conclave</p><h1 className="section-heading">A flagship dialogue on AI, not another lecture series.</h1>
        <p className="section-lede">AI Conclave 2026 is a two-day flagship event bringing together practitioners, researchers, policymakers and students to examine how Artificial Intelligence is transforming three sectors central to Kerala's economy and society: Agriculture, Health and Education. The Conclave is built around real dialogue — sessions are designed for participants who can describe genuine ground-level problems, share evidence from practice and stay engaged for follow-up discussions, rather than one-way presentations.</p>
        <p className="section-lede">Participants stand to gain real, sector-specific value from attending. Farmers, FPOs and agri-tech innovators get direct access to AI tools for precision farming and crop advisory, alongside dialogue with KAU, KVK and ICAR scientists. Doctors, health-tech start-ups and public health officials can explore AI-assisted diagnostics and rural healthcare delivery models. Teachers, students and education policymakers gain exposure to AI-enabled learning platforms and direct interaction with industry mentors. Across all three sectors, the Conclave offers a channel to influence policy through dialogue with government officials and invited dignitaries.</p>
        <p className="section-lede">Organised by the AI Club and Student Council of Amal Jyothi College of Engineering, in association with the Departments of Computer Applications, Computer Science &amp; Engineering, Artificial Intelligence &amp; Data Science, Electronics &amp; Communication Engineering, and Electrical &amp; Electronics Engineering.</p>
      </div>
      <div data-reveal><div className="about-stats">
        <div className="about-stat"><span className="about-stat-figure mono-figure" data-count-to="2">2</span><span className="about-stat-label">Days</span></div>
        <div className="about-stat"><span className="about-stat-figure mono-figure" data-count-to="2000" data-suffix="+">2000+</span><span className="about-stat-label">Expected participants</span></div>
        <div className="about-stat"><span className="about-stat-figure mono-figure" data-count-to="3">3</span><span className="about-stat-label">Sectors — Agri, Health, Edu</span></div>
        <div className="about-stat"><span className="about-stat-figure mono-figure" data-count-to="5">5</span><span className="about-stat-label">Departments co-organising</span></div>
      </div><p className="about-principle">Format: dialogue-driven, not one-way talks — panel discussion, parallel workshops, and a hackathon in place of a straight lecture track.</p></div>
    </div></section></main>
  )
}

function ScheduleTable({ day }) {
  const rows = day === 1
    ? [
        ['9:00 AM', 'Registration', 'Participant check-in'],
        ['10:00 AM', 'Inaugural Function', 'Opening ceremony'],
        ['10:30 AM', 'Panel Discussion', 'AI Across Sectors: Agriculture, Health & Education'],
        ['1:00 – 4:00 PM', 'Workshops', 'Parallel workshops organised by departments and clubs of AJCE'],
      ]
    : [
        ['9:00 AM', 'Registration', 'Participant check-in'],
        ['9:30 AM – 2:30 PM', 'Hackathon', 'Technical and Non-Technical tracks for school & college students. Prize pool ₹1,00,000'],
        ['2:30 PM', 'Evaluation', 'Judging and assessment of hackathon projects'],
        ['4:00 PM', 'Valedictory Function', 'Closing ceremony and prize distribution'],
      ]
  return <table className="schedule-table" data-reveal><caption>Day {day} schedule</caption><thead><tr><th scope="col">Time</th><th scope="col">Event</th><th scope="col">Details</th></tr></thead><tbody>{rows.map(([time, event, details]) => <tr key={`${time}-${event}`}><td className="schedule-time mono-figure">{time}</td><td className="schedule-event">{event}</td><td className="schedule-desc">{details}</td></tr>)}</tbody></table>
}

function PanelTracks() {
  const panels = [
    ['panel-agriculture', 'stamp-agri', 'Agriculture', 'Dr. Nikki', [['Alexy Binu', 'Founder & CEO, AetherSphere Ecosystem'], ['Prasad GopalaKrishnan', 'Retired Professor, TNAU']]],
    ['panel-health', 'stamp-health', 'Health', 'Dr. S.N. Kumar', [['Vivek V. George', 'MD, Trivia Innovations'], ['Thomas Paulose Nechupadam', 'Doctorepreneur, PalluDoctor'], ['Robin Tomy', ''], ['Berin Pathrose', 'Professor, Pathology, KAU']]],
    ['panel-education', 'stamp-edu', 'Education', 'Dr. Soney C. George', [['Dr. Jagathy Raj V.P.', 'Vice Chancellor, Sree Narayana Open University'], ['Dr. M.V. Rajesh', 'Director, IHRD'], ['Dr. Shailesh Sivan', 'Speaker']]],
  ]
  return <div className="panel-grid">{panels.map(([id, stamp, name, moderator, speakers]) => <section id={id} className="panel-track" data-reveal aria-labelledby={`${id}-heading`} key={id}><div className="panel-track-head"><span className={`stamp ${stamp}`}>{name}</span><h3 id={`${id}-heading`}>{name}</h3></div><p className="panel-moderator">Moderated by <span className="panel-moderator-name">{moderator}</span></p><ul className="speaker-list">{speakers.map(([speaker, role]) => <li key={speaker}><span className="speaker-name">{speaker}</span>{role && <span className="speaker-role">{role}</span>}</li>)}</ul></section>)}</div>
}

function SchedulePage() {
  const [day, setDay] = useState(1)
  return <main id="main">
    <section className="page-header"><div className="container"><p className="eyebrow">Programme</p><h1 className="section-heading">Schedule</h1><p className="section-lede">Two days, laid out end to end — registration through valedictory. Times and venues are fixed by the organisers.</p></div></section>
    <div className="container day-toggle-wrap"><div className="day-toggle" role="group" aria-label="Select schedule day"><button type="button" className={`day-toggle-btn${day === 1 ? ' is-active' : ''}`} aria-pressed={day === 1} onClick={() => setDay(1)}>Day 1</button><button type="button" className={`day-toggle-btn${day === 2 ? ' is-active' : ''}`} aria-pressed={day === 2} onClick={() => setDay(2)}>Day 2</button></div></div>
    {day === 1 && <><section id="schedule-day1" className="section"><div className="container"><div className="section-head" data-reveal><h2 className="section-heading">Day 1 <span className="mono-figure">— Inauguration, Panel &amp; Workshops</span></h2></div><ScheduleTable day={1} /></div></section><section id="panel" className="section"><div className="container"><div className="section-head" data-reveal><p className="eyebrow">Day 1 · 10:30 AM</p><h2 className="section-heading">Panel Discussion: AI Across Sectors</h2><p className="section-lede">Industry leaders and academic experts come together to discuss how Artificial Intelligence is transforming Kerala's agriculture, healthcare and education sectors — three tracks, three conversations, each looking at where AI is already changing the sector and where it should go next.</p></div><PanelTracks /></div></section></>}
    {day === 2 && <section id="schedule-day2" className="section"><div className="container"><div className="section-head" data-reveal><h2 className="section-heading">Day 2 <span className="mono-figure">— Hackathon &amp; Valedictory</span></h2></div><ScheduleTable day={2} /></div></section>}
  </main>
}

function ParticipatePage() {
  return <main id="main"><section id="participants" className="section"><div className="container"><div className="section-head" data-reveal><p className="eyebrow">Who Should Attend</p><h1 className="section-heading">Built for people working across all three sectors.</h1><p className="section-lede">AI Conclave 2026 is open to anyone with a stake in how AI touches Agriculture, Health or Education — students, practitioners and decision-makers alike.</p></div><div className="participants-grid">{participantGroups.map((group) => <div id={group.id} className="participant-group" data-reveal key={group.id}><span className={`stamp ${group.stamp}`}>{group.name}</span><h2>{group.name}</h2><ul className="participant-list">{group.items.map((item) => <li key={item}>{item}</li>)}</ul></div>)}</div></div></section></main>
}

function RegisterPage() {
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const nameRef = useRef(null)

  const updateField = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const toggleTrack = (event) => {
    const { checked, value } = event.target
    setForm((current) => ({ ...current, tracks: checked ? [...current.tracks, value] : current.tracks.filter((track) => track !== value) }))
  }

  const submit = async (event) => {
    event.preventDefault()
    if (submitting) return
    const required = ['name', 'email', 'phone', 'organisation', 'category']
    if (required.some((field) => !String(form[field]).trim())) {
      setError('Please fill in all required fields.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const response = await fetch('/api/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.ok) {
        setError(data.error || 'Could not save registration. Please try again.')
        return
      }
      setConfirmation(data.registration || form)
      setSubmitted(true)
    } catch {
      setError('Network error. Check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setForm(initialForm)
    setConfirmation(null)
    setSubmitted(false)
    setError('')
    window.setTimeout(() => nameRef.current?.focus(), 0)
  }

  return <main id="main"><section className="page-header"><div className="container"><p className="eyebrow">Delegate Registration</p><h1 className="section-heading">Register for AI Conclave 2026</h1><p className="section-lede">Fill in your details and pick the tracks you'd like to attend.</p></div></section><section id="registration-form" className="section"><div className="container register-layout">
    <form id="register-form" noValidate hidden={submitted} onSubmit={submit}>
      <div className="form-row"><div className="form-field"><label htmlFor="field-name">Full Name</label><input ref={nameRef} type="text" id="field-name" name="name" autoComplete="name" required value={form.name} onChange={updateField} /></div><div className="form-field"><label htmlFor="field-email">Email</label><input type="email" id="field-email" name="email" autoComplete="email" required value={form.email} onChange={updateField} /></div></div>
      <div className="form-row"><div className="form-field"><label htmlFor="field-phone">Phone</label><input type="tel" id="field-phone" name="phone" autoComplete="tel" required value={form.phone} onChange={updateField} /></div><div className="form-field"><label htmlFor="field-org">College / Organisation</label><input type="text" id="field-org" name="organisation" autoComplete="organization" required value={form.organisation} onChange={updateField} /></div></div>
      <div className="form-field"><label htmlFor="field-category">Category</label><select id="field-category" name="category" required value={form.category} onChange={updateField}><option value="" disabled>Select one</option>{categories.map((category) => <option value={category} key={category}>{category}</option>)}</select></div>
      <fieldset className="form-fieldset"><legend className="form-legend">Tracks You'd Like to Attend</legend><p className="form-hint">Select all that apply.</p><div className="track-options">{trackOptions.map((track) => <div className="track-option" key={track.id}><label htmlFor={track.id}><span className="track-option-title">{track.title}</span><span className="track-option-desc">{track.description}</span></label><input type="checkbox" id={track.id} name="tracks" value={track.value} checked={form.tracks.includes(track.value)} onChange={toggleTrack} /></div>)}</div></fieldset>
      <div className="form-submit-row"><button type="submit" className="btn btn-primary" id="register-submit" disabled={submitting} aria-busy={submitting}>{submitting ? 'Submitting…' : <>Submit Registration <span className="btn-arrow" aria-hidden="true">→</span></>}</button><p className={`form-error${error ? ' is-visible' : ''}`} role="alert" aria-live="polite">{error || 'Please fill in all required fields.'}</p></div>
    </form>
    <div className={`confirmation-panel${submitted ? ' is-visible' : ''}`} id="confirmation-panel" role="status" aria-live="polite" tabIndex={submitted ? -1 : undefined}><span className="stamp">Registration Received</span><h2>You're on the list.</h2><p>Thanks for registering for AI Conclave 2026. A confirmation with further details will be sent to your email closer to the event.</p>{confirmation && <dl className="confirmation-summary"><dt>Name</dt><dd>{confirmation.name}</dd><dt>Email</dt><dd>{confirmation.email}</dd><dt>Category</dt><dd>{confirmation.category}</dd><dt>Tracks</dt><dd>{confirmation.tracks?.length ? confirmation.tracks.join(', ') : 'None selected'}</dd></dl>}<button type="button" className="btn btn-outline" id="register-again" onClick={reset}>Register Another Person</button></div>
  </div></section></main>
}

function App() {
  const page = currentPage()
  useSiteEnhancements()
  useEffect(() => {
    document.title = page === 'home' ? 'AI Conclave 2026' : `${page[0].toUpperCase()}${page.slice(1)} — AI Conclave 2026`
  }, [page])

  const content = page === 'about' ? <AboutPage /> : page === 'schedule' ? <SchedulePage /> : page === 'participate' ? <ParticipatePage /> : page === 'register' ? <RegisterPage /> : <HomePage />
  return <Shell active={page}>{content}</Shell>
}

export default App
