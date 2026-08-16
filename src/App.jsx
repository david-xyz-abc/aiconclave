import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

const PATHS = {
  home: '/',
  about: '/about',
  schedule: '/schedule',
  participate: '/participate',
  register: '/register',
  registerHackathon: '/register/hackathon',
  registerPanel: '/register/panel',
  myRegistration: '/my-registration',
}

const HACKATHON_REGISTRATION_OPEN = false
const PANEL_EVENT = Object.freeze({
  name: 'Panel Discussion',
  day: 'Day 1',
  date: '15 September 2026',
  time: '10:30 AM',
})
const HACKATHON_EVENT = Object.freeze({
  name: 'Hackathon',
  day: 'Day 2',
  date: '16 September 2026',
})

const hackathonCategories = [
  'Student',
  'Faculty',
  'Professional / Industry Delegate',
  'Researcher',
  'Other',
]

const hackathonTrackOptions = [
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
]

const participantTypes = ['Student', 'Faculty / Academic', 'Professional / Industry Delegate', 'Researcher', 'Other']
const panelOptions = ['AI in Agriculture', 'AI in Education', 'AI in Healthcare']
const industrySectors = ['Agriculture', 'Education', 'Healthcare', 'IT / Technology', 'Government', 'Other']
const organisationTypes = ['Startup', 'MSME', 'Corporate', 'Government', 'Academic Institution', 'Research Organization', 'NGO', 'Other']

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

const initialHackathonForm = {
  name: '',
  email: '',
  phone: '',
  organisation: '',
  category: '',
  tracks: [],
}

const initialPanelForm = {
  name: '',
  email: '',
  phone: '',
  participantType: '',
  organisation: '',
  department: '',
  panelSelection: '',
  industrySector: '',
  industrySectorOther: '',
  organisationType: '',
  organisationTypeOther: '',
  informationConfirmed: false,
  updatesOptIn: false,
}

function validatePanelForm(form) {
  const errors = {}
  const phoneDigits = form.phone.replace(/\D/g, '')

  if (!form.name.trim()) errors.name = 'Enter your full name.'
  if (!form.email.trim()) errors.email = 'Enter your email address.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Enter a valid email address, for example name@example.com.'
  if (!form.phone.trim()) errors.phone = 'Enter your phone number.'
  else if (!/^[+\d\s().-]+$/.test(form.phone) || phoneDigits.length < 7 || phoneDigits.length > 15) errors.phone = 'Enter a valid phone number containing 7 to 15 digits.'
  if (!form.participantType) errors.participantType = 'Choose your participant type.'
  if (!form.organisation.trim()) errors.organisation = 'Enter your college, institution or organization name.'
  if (!form.panelSelection) errors.panelSelection = 'Choose the panel discussion you want to attend.'
  if (form.industrySector === 'Other' && !form.industrySectorOther.trim()) errors.industrySectorOther = 'Specify your industry sector.'
  if (form.organisationType === 'Other' && !form.organisationTypeOther.trim()) errors.organisationTypeOther = 'Specify your organization type.'
  if (!form.informationConfirmed) errors.informationConfirmed = 'Confirm that the information provided is accurate.'

  return errors
}

function FieldError({ id, message }) {
  return message ? <p className="field-error" id={id} role="alert">{message}</p> : null
}

function currentPage() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (path === '/about') return 'about'
  if (path === '/schedule') return 'schedule'
  if (path === '/participate') return 'participate'
  if (path === '/register/hackathon') return 'register-hackathon'
  if (path === '/register/panel') return 'register-panel'
  if (path === '/register') return 'register'
  if (path === '/my-registration') return 'my-registration'
  return 'home'
}

function useSiteEnhancements(pageKey) {
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const progressBar = document.getElementById('scroll-progress')

    const updateProgress = () => {
      if (!progressBar) return
      const doc = document.documentElement
      const maximum = doc.scrollHeight - doc.clientHeight
      progressBar.style.width = `${maximum > 0 ? (window.scrollY / maximum) * 100 : 0}%`
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

    const observers = []
    const supportsIntersectionObserver = 'IntersectionObserver' in window
    const revealObserver = !reduceMotion && supportsIntersectionObserver
      ? new IntersectionObserver(
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
      : null
    const countObserver = supportsIntersectionObserver
      ? new IntersectionObserver(
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
      : null

    if (revealObserver) observers.push(revealObserver)
    if (countObserver) observers.push(countObserver)

    const enhanceNode = (node) => {
      if (!(node instanceof Element)) return
      const revealNodes = node.matches('[data-reveal]') ? [node] : node.querySelectorAll('[data-reveal]')
      revealNodes.forEach((revealNode) => {
        if (reduceMotion || !revealObserver) revealNode.classList.add('is-revealed')
        else revealObserver.observe(revealNode)
      })
      const countNodes = node.matches('[data-count-to]') ? [node] : node.querySelectorAll('[data-count-to]')
      countNodes.forEach((countNode) => {
        if (countObserver) countObserver.observe(countNode)
        else animateCount(countNode)
      })
    }

    enhanceNode(document.body)
    const contentObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => mutation.addedNodes.forEach(enhanceNode))
    })
    contentObserver.observe(document.body, { childList: true, subtree: true })
    observers.push(contentObserver)

    window.addEventListener('scroll', updateProgress, { passive: true })
    window.addEventListener('resize', updateProgress)
    updateProgress()

    return () => {
      window.removeEventListener('scroll', updateProgress)
      window.removeEventListener('resize', updateProgress)
      observers.forEach((observer) => observer.disconnect())
    }
  }, [pageKey])
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
  const registrationActive = active.startsWith('register') || active === 'my-registration'

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
            <li><a href={PATHS.myRegistration} className={linkClass('my-registration')} aria-current={active === 'my-registration' ? 'page' : undefined} onClick={closeMenu}>My registrations</a></li>
            <li><a href={PATHS.register} className={`btn btn-primary nav-cta${registrationActive ? ' is-active' : ''}`} aria-current={registrationActive ? 'page' : undefined} onClick={closeMenu}>Register</a></li>
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
        <p className="section-lede">Organised by the AI Club and Student Council of Amal Jyothi College of Engineering, in association with the Departments of Computer Applications, Computer Science &amp; Engineering, Artificial Intelligence &amp; Data Science, Electronics &amp; Communication Engineering, and Electrical &amp; Electronics Engineering.</p>
      </div>
      <div data-reveal><div className="about-stats">
        <div className="about-stat"><span className="about-stat-figure mono-figure" data-count-to="2">2</span><span className="about-stat-label">Days</span></div>
        <div className="about-stat"><span className="about-stat-figure mono-figure" data-count-to="2">2</span><span className="about-stat-label">Hackathon tracks</span></div>
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
        ['1:00 PM – 4:00 PM', 'Workshops', 'Parallel workshops organised by departments and clubs of AJCE'],
      ]
    : [
        ['9:00 AM', 'Registration', 'Participant check-in'],
        ['9:30 AM – 2:30 PM', 'Hackathon', 'Technical and Non-Technical tracks for school & college students. Prize pool ₹1,00,000'],
        ['2:30 PM', 'Evaluation', 'Judging and assessment of hackathon projects'],
        ['4:00 PM', 'Valedictory Function', 'Closing ceremony and prize distribution'],
      ]
  return <table className="schedule-table"><caption>Day {day} schedule</caption><thead><tr><th scope="col">Time</th><th scope="col">Event</th><th scope="col">Details</th></tr></thead><tbody>{rows.map(([time, event, details]) => <tr key={`${time}-${event}`}><td className="schedule-time mono-figure">{time}</td><td className="schedule-event">{event}</td><td className="schedule-desc">{details}</td></tr>)}</tbody></table>
}

function PanelTracks() {
  const panels = [
    ['panel-agriculture', 'stamp-agri', 'Agriculture', 'Dr. Nikki', [['Alexy Binu', 'Founder & CEO, AetherSphere Ecosystem'], ['Prasad GopalaKrishnan', 'Retired Professor, TNAU']]],
    ['panel-health', 'stamp-health', 'Health', 'Dr. S.N. Kumar', [['Vivek V. George', 'MD, Trivia Innovations'], ['Thomas Paulose Nechupadam', 'Doctorepreneur, PalluDoctor'], ['Robin Tomy', '—'], ['Berin Pathrose', 'Professor (Pathology), KAU']]],
    ['panel-education', 'stamp-edu', 'Education', 'Dr. Soney C. George', [['Dr. Jagathy Raj V.P.', 'Vice Chancellor, Sree Narayana Open University'], ['Dr. M.V. Rajesh', 'Director, IHRD'], ['Dr. Shailesh Sivan', 'Speaker']]],
  ]
  return <div className="panel-grid">{panels.map(([id, stamp, name, moderator, speakers]) => <section id={id} className="panel-track" aria-labelledby={`${id}-heading`} key={id}><div className="panel-track-head"><span className={`stamp ${stamp}`}>{name}</span><h3 id={`${id}-heading`}>{name}</h3></div><p className="panel-moderator"><span className="panel-role-label">Moderator</span><span className="panel-moderator-name">{moderator}</span></p><ul className="speaker-list">{speakers.map(([speaker, role]) => <li key={speaker}><span className="speaker-kicker">Expert</span><span className="speaker-name">{speaker}</span><span className="speaker-role">{role}</span></li>)}</ul></section>)}</div>
}

function SchedulePage() {
  const [day, setDay] = useState(() => new URLSearchParams(window.location.search).get('day') === '2' ? 2 : 1)

  const selectDay = (selectedDay) => {
    setDay(selectedDay)
    const url = new URL(window.location.href)
    if (selectedDay === 1) url.searchParams.delete('day')
    else url.searchParams.set('day', String(selectedDay))
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  }

  return <main id="main">
    <section className="page-header"><div className="container"><p className="eyebrow">Programme</p><h1 className="section-heading">Schedule</h1><p className="section-lede">Two days, laid out end to end — registration through valedictory. Times and venues are fixed by the organisers.</p></div></section>
    <div className="container day-toggle-wrap"><div className="day-toggle" role="tablist" aria-label="Select schedule day"><button type="button" id="day-1-tab" role="tab" className={`day-toggle-btn${day === 1 ? ' is-active' : ''}`} aria-selected={day === 1} aria-controls="day-1-content" tabIndex={day === 1 ? 0 : -1} onClick={() => selectDay(1)}>Day 1</button><button type="button" id="day-2-tab" role="tab" className={`day-toggle-btn${day === 2 ? ' is-active' : ''}`} aria-selected={day === 2} aria-controls="day-2-content" tabIndex={day === 2 ? 0 : -1} onClick={() => selectDay(2)}>Day 2</button></div><span className="day-toggle-status" aria-live="polite">Showing Day {day}</span></div>
    <div key={day} className="schedule-day-content">
      {day === 1 && <div id="day-1-content" role="tabpanel" aria-labelledby="day-1-tab"><section id="schedule-day1" className="section"><div className="container"><div className="section-head"><p className="eyebrow">{PANEL_EVENT.date}</p><h2 className="section-heading">Day 1 <span className="mono-figure">— Inauguration, Panel &amp; Workshops</span></h2></div><ScheduleTable day={1} /></div></section><section id="panel" className="section"><div className="container"><div className="section-head"><p className="eyebrow">{PANEL_EVENT.day} · {PANEL_EVENT.date} · {PANEL_EVENT.time}</p><h2 className="section-heading">Panel Discussion: AI Across Sectors</h2><p className="section-lede">Industry leaders and academic experts come together to discuss how Artificial Intelligence is transforming Kerala's agriculture, healthcare and education sectors.</p></div><PanelTracks /></div></section></div>}
      {day === 2 && <div id="day-2-content" role="tabpanel" aria-labelledby="day-2-tab"><section id="schedule-day2" className="section"><div className="container"><div className="section-head"><p className="eyebrow">{HACKATHON_EVENT.date}</p><h2 className="section-heading">Day 2 <span className="mono-figure">— Hackathon &amp; Valedictory</span></h2></div><ScheduleTable day={2} /></div></section></div>}
    </div>
  </main>
}

function IntroScreen() {
  const [visible, setVisible] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (!visible) return undefined
    document.body.classList.add('intro-active')
    const leaveTimer = window.setTimeout(() => setLeaving(true), 1700)
    const finishTimer = window.setTimeout(() => setVisible(false), 2475)
    return () => {
      window.clearTimeout(leaveTimer)
      window.clearTimeout(finishTimer)
      document.body.classList.remove('intro-active')
    }
  }, [visible])

  if (!visible) return null
  return <div className={`intro-screen${leaving ? ' is-leaving' : ''}`} aria-hidden="true">
    <div className="intro-grid"></div>
    <div className="intro-meta"><span>AI Club · Student Council</span><span>AJCE / Kanjirappally</span></div>
    <div className="intro-type-stage">
      <div className="intro-band intro-band-primary"><span>AI CONCLAVE</span><span>AI CONCLAVE</span></div>
      <div className="intro-band intro-band-outline"><span>AJCE</span><span>AJCE</span><span>AJCE</span></div>
    </div>
    <div className="intro-footer"><span>Two days · Three sectors · One conversation</span><strong>2026</strong></div>
    <div className="intro-scan"><i></i></div>
  </div>
}

function ParticipatePage() {
  return <main id="main"><section id="participants" className="section"><div className="container"><div className="section-head" data-reveal><p className="eyebrow">Who Should Attend</p><h1 className="section-heading">Built for people working across all three sectors.</h1><p className="section-lede">AI Conclave 2026 is open to anyone with a stake in how AI touches Agriculture, Health or Education — students, practitioners and decision-makers alike.</p></div><div className="participants-grid">{participantGroups.map((group) => <div id={group.id} className="participant-group" data-reveal key={group.id}><span className={`stamp ${group.stamp}`}>{group.name}</span><h2>{group.name}</h2><ul className="participant-list">{group.items.map((item) => <li key={item}>{item}</li>)}</ul></div>)}</div></div></section></main>
}

let googleScriptPromise
let googleConfigPromise
let googleConfigCreatedAt = 0

function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google)
  if (googleScriptPromise) return googleScriptPromise
  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-identity]')
    const script = existing || document.createElement('script')
    script.addEventListener('load', () => window.google?.accounts?.id ? resolve(window.google) : reject(new Error('Google Sign-In did not load.')), { once: true })
    script.addEventListener('error', () => reject(new Error('Google Sign-In could not be loaded.')), { once: true })
    if (!existing) {
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.dataset.googleIdentity = 'true'
      document.head.appendChild(script)
    }
  }).catch((error) => {
    googleScriptPromise = undefined
    throw error
  })
  return googleScriptPromise
}

function getGoogleConfig(force = false) {
  if (force || Date.now() - googleConfigCreatedAt > 4 * 60 * 1000) googleConfigPromise = undefined
  if (!googleConfigPromise) {
    googleConfigCreatedAt = Date.now()
    googleConfigPromise = fetch('/api/auth/config', { headers: { accept: 'application/json' } })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}))
        if (!response.ok || !data.ok) throw new Error(data.error || 'Google Sign-In is unavailable right now.')
        return data
      })
      .catch((error) => {
        googleConfigPromise = undefined
        throw error
      })
  }
  return googleConfigPromise
}

function GoogleSignInButton({ onSignedIn }) {
  const hostRef = useRef(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(true)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    setBusy(true)
    setError('')
    Promise.all([loadGoogleIdentity(), getGoogleConfig(attempt > 0)]).then(([google, config]) => {
      if (!active || !hostRef.current) return
      hostRef.current.replaceChildren()
      google.accounts.id.initialize({
        client_id: config.clientId,
        nonce: config.nonce,
        auto_select: false,
        cancel_on_tap_outside: true,
        callback: async ({ credential }) => {
          if (!credential || !active) return
          setBusy(true)
          setError('')
          try {
            const response = await fetch('/api/auth/google', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ credential }),
            })
            const data = await response.json().catch(() => ({}))
            if (!response.ok || !data.ok) throw new Error(data.error || 'Google Sign-In could not be completed.')
            googleConfigPromise = undefined
            onSignedIn(data.participant)
          } catch (signInError) {
            googleConfigPromise = undefined
            if (active) {
              setError(signInError.message || 'Google Sign-In could not be completed. Please try again.')
            }
          } finally {
            if (active) setBusy(false)
          }
        },
      })
      google.accounts.id.renderButton(hostRef.current, {
        type: 'standard', theme: 'outline', size: 'large', shape: 'rectangular', text: 'continue_with',
        width: Math.min(360, Math.max(240, hostRef.current.clientWidth)),
      })
      setBusy(false)
    }).catch((loadError) => {
      if (!active) return
      setBusy(false)
      setError(loadError.message || 'Google Sign-In is unavailable right now.')
    })
    return () => { active = false }
  }, [attempt, onSignedIn])

  return <div className="google-sign-in-control">
    <div ref={hostRef} className="google-button-host" aria-busy={busy}></div>
    {busy && <p className="account-state"><span className="account-spinner" aria-hidden="true"></span> Preparing secure sign-in…</p>}
    {error && <div className="account-error" role="alert"><p>{error}</p><button type="button" className="text-button" onClick={() => setAttempt((value) => value + 1)}>Try again</button></div>}
  </div>
}

function SignInCard({ onSignedIn }) {
  return <main id="main" className="registration-login-page">
    <section className="page-header"><div className="container"><p className="eyebrow">Registration access</p><h1 className="section-heading">Sign in before choosing an event.</h1><p className="section-lede">Use your Gmail or Google Workspace account. It securely links your registration to you, so you can return and view it later.</p></div></section>
    <section className="section"><div className="container register-layout"><div className="participant-login-card">
      <div className="participant-login-copy"><span className="stamp">Participant sign-in</span><h2>Continue with Google</h2><p>Your verified Google email will be used for registration. We never receive or store your Google password.</p></div>
      <div className="participant-login-action"><span className="participant-login-kicker"><i aria-hidden="true"></i> Secure participant access</span><GoogleSignInButton onSignedIn={onSignedIn} /><small>Sign in once to register and return to your details later.</small></div>
    </div></div></section>
  </main>
}

function useParticipantSession() {
  const [state, setState] = useState({ status: 'loading', participant: null, error: '' })
  useEffect(() => {
    let active = true
    fetch('/api/auth/session', { headers: { accept: 'application/json' } }).then(async (response) => {
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.ok) throw new Error(data.error || 'We could not check your sign-in status.')
      if (active) setState({ status: data.signedIn ? 'signed-in' : 'signed-out', participant: data.participant || null, error: '' })
    }).catch((error) => {
      if (active) setState({ status: 'error', participant: null, error: error.message || 'We could not check your sign-in status.' })
    })
    return () => { active = false }
  }, [])
  return [state, setState]
}

function RegistrationGate({ children }) {
  const [session, setSession] = useParticipantSession()
  if (session.status === 'loading') return <main id="main"><section className="account-loading"><span className="account-spinner" aria-hidden="true"></span><p>Checking your sign-in…</p></section></main>
  if (session.status === 'error') return <main id="main"><section className="section"><div className="container register-layout"><div className="account-error account-error-page" role="alert"><h1>Sign-in could not be checked.</h1><p>{session.error}</p><button type="button" className="btn btn-outline" onClick={() => window.location.reload()}>Try again</button></div></div></section></main>
  if (session.status !== 'signed-in') return <SignInCard onSignedIn={(participant) => setSession({ status: 'signed-in', participant, error: '' })} />
  return children(session.participant)
}

function ParticipantBar({ participant }) {
  return <div className="participant-bar"><span className="participant-status-dot" aria-hidden="true"></span><div><small>Signed in as</small><strong>{participant.displayName || participant.email}</strong><span>{participant.email}</span></div><a href={PATHS.myRegistration}>My registrations <span aria-hidden="true">→</span></a></div>
}

function RegistrationChoicePage({ participant }) {
  return <main id="main">
    <section className="page-header"><div className="container"><p className="eyebrow">Registration</p><h1 className="section-heading">Choose your experience</h1><p className="section-lede">Start with Day 1 panel discussions or register for the Day 2 hackathon.</p></div></section>
    <section className="section"><div className="container"><ParticipantBar participant={participant} /><div className="registration-choice-grid">
      <a className="registration-choice registration-choice-panel" href={PATHS.registerPanel} data-reveal><span className="choice-number" aria-hidden="true">01</span><span className="stamp">Day 1 · Industry Panels</span><h2>Panel Discussion Registration</h2><p>For students, educators, researchers, professionals and delegates attending the Agriculture, Education or Healthcare panels.</p><span className="choice-action">Register for Panel Discussion <span aria-hidden="true">→</span></span></a>
      {HACKATHON_REGISTRATION_OPEN ? <a className="registration-choice registration-choice-hackathon" href={PATHS.registerHackathon} data-reveal><span className="choice-number" aria-hidden="true">02</span><span className="stamp">Day 2 · Hackathon</span><h2>Hackathon Registration</h2><p>For school and college students joining the Technical or Non-Technical hackathon.</p><span className="choice-action">Register for Hackathon <span aria-hidden="true">→</span></span></a> : <div className="registration-choice registration-choice-hackathon is-registration-closed" aria-disabled="true" data-reveal><span className="choice-number" aria-hidden="true">02</span><span className="stamp">Day 2 · Hackathon</span><h2>Hackathon Registration</h2><p>For school and college students joining the Technical or Non-Technical hackathon.</p><span className="choice-action choice-action-disabled">Registration Not Started</span><div className="registration-closed-layer"><span className="closed-status"><i aria-hidden="true"></i> Registration update</span><strong>Opening Soon</strong><small>Hackathon registration has not started yet.</small></div></div>}
    </div></div></section>
  </main>
}

function HackathonRegisterPage() {
  const [form, setForm] = useState(initialHackathonForm)
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
    if (required.some((field) => !String(form[field]).trim()) || !form.tracks.length) {
      setError('Please fill in all required fields and select a hackathon track.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const response = await fetch('/api/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...form, registrationType: 'hackathon' }) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.ok) {
        setError(data.error || 'Could not save registration. Please try again.')
        return
      }
      setConfirmation({ ...(data.registration || form), id: data.id, type: PANEL_EVENT.name, status: 'Received' })
      setSubmitted(true)
    } catch {
      setError('Network error. Check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setForm(initialHackathonForm)
    setConfirmation(null)
    setSubmitted(false)
    setError('')
    window.setTimeout(() => nameRef.current?.focus(), 0)
  }

  return <main id="main"><section className="page-header"><div className="container"><a className="back-link" href={PATHS.register}>← All registrations</a><p className="eyebrow">Hackathon Registration</p><h1 className="section-heading">AI Conclave 2026 Hackathon</h1><p className="section-lede">Choose the Technical or Non-Technical track for Day 2.</p></div></section><section id="registration-form" className="section"><div className="container register-layout">
    <form id="register-form" noValidate hidden={submitted} onSubmit={submit}>
      <div className="form-row"><div className="form-field"><label htmlFor="field-name">Full Name</label><input ref={nameRef} type="text" id="field-name" name="name" autoComplete="name" required value={form.name} onChange={updateField} /></div><div className="form-field"><label htmlFor="field-email">Email</label><input type="email" id="field-email" name="email" autoComplete="email" required value={form.email} onChange={updateField} /></div></div>
      <div className="form-row"><div className="form-field"><label htmlFor="field-phone">Phone</label><input type="tel" id="field-phone" name="phone" autoComplete="tel" required value={form.phone} onChange={updateField} /></div><div className="form-field"><label htmlFor="field-org">College / Organisation</label><input type="text" id="field-org" name="organisation" autoComplete="organization" required value={form.organisation} onChange={updateField} /></div></div>
      <div className="form-field"><label htmlFor="field-category">Participant Type</label><select id="field-category" name="category" required value={form.category} onChange={updateField}><option value="" disabled>Select one</option>{hackathonCategories.map((category) => <option value={category} key={category}>{category}</option>)}</select></div>
      <fieldset className="form-fieldset"><legend className="form-legend">Hackathon Track</legend><p className="form-hint">Select at least one track.</p><div className="track-options">{hackathonTrackOptions.map((track) => <div className="track-option" key={track.id}><label htmlFor={track.id}><span className="track-option-title">{track.title}</span><span className="track-option-desc">{track.description}</span></label><input type="checkbox" id={track.id} name="tracks" value={track.value} checked={form.tracks.includes(track.value)} onChange={toggleTrack} /></div>)}</div></fieldset>
      <div className="form-submit-row"><button type="submit" className="btn btn-primary" id="register-submit" disabled={submitting} aria-busy={submitting}>{submitting ? 'Submitting…' : <>Submit Registration <span className="btn-arrow" aria-hidden="true">→</span></>}</button><p className={`form-error${error ? ' is-visible' : ''}`} role="alert" aria-live="polite">{error || 'Please fill in all required fields.'}</p></div>
    </form>
    <div className={`confirmation-panel${submitted ? ' is-visible' : ''}`} id="confirmation-panel" role="status" aria-live="polite" tabIndex={submitted ? -1 : undefined}><span className="stamp">Hackathon Registration Received</span><h2>You're on the list.</h2><p>Thanks for registering for the AI Conclave 2026 Hackathon.</p>{confirmation && <dl className="confirmation-summary"><dt>Name</dt><dd>{confirmation.name}</dd><dt>Email</dt><dd>{confirmation.email}</dd><dt>Participant</dt><dd>{confirmation.category}</dd><dt>Tracks</dt><dd>{confirmation.tracks?.join(', ')}</dd></dl>}<button type="button" className="btn btn-outline" id="register-again" onClick={reset}>Register Another Person</button></div>
  </div></section></main>
}

function HackathonRegistrationClosedPage() {
  return <main id="main"><section className="page-header"><div className="container"><a className="back-link" href={PATHS.register}>← All registrations</a><p className="eyebrow">Day 2 · Hackathon</p><h1 className="section-heading">Hackathon Registration</h1><p className="section-lede">Technical and Non-Technical tracks for school and college students.</p></div></section><section className="section"><div className="container register-layout"><div className="registration-closed-notice"><span className="stamp">Coming Soon</span><h2>Registration has not started.</h2><p>Hackathon registration is temporarily closed. Please check back soon for the opening announcement.</p><a className="btn btn-primary" href={PATHS.registerPanel}>Register for Panel Discussion <span aria-hidden="true">→</span></a></div></div></section></main>
}

function RadioOptions({ name, options, value, onChange, required = false, errorId, invalid = false }) {
  return <div className="radio-options" role="radiogroup" aria-invalid={invalid} aria-describedby={invalid ? errorId : undefined}>{options.map((option) => <label className="radio-option" key={option}><input type="radio" name={name} value={option} checked={value === option} onChange={onChange} required={required} /><span className="radio-option-label">{option}</span><span className="radio-option-check" aria-hidden="true">✓</span></label>)}</div>
}

function PanelRegisterPage({ participant }) {
  const freshPanelForm = () => ({ ...initialPanelForm, name: participant.displayName || '', email: participant.email })
  const [form, setForm] = useState(freshPanelForm)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const nameRef = useRef(null)
  const updateField = (event) => {
    const { name, value, type, checked } = event.target
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
    setFieldErrors((current) => {
      if (!current[name]) return current
      const next = { ...current }
      delete next[name]
      return next
    })
  }
  const focusFirstInvalidField = (errors) => window.setTimeout(() => document.querySelector(`[name="${Object.keys(errors)[0]}"]`)?.focus(), 0)
  const submit = async (event) => {
    event.preventDefault()
    if (submitting) return
    const validationErrors = validatePanelForm(form)
    if (Object.keys(validationErrors).length) {
      setFieldErrors(validationErrors)
      setError('Please review the highlighted fields below.')
      focusFirstInvalidField(validationErrors)
      return
    }
    setFieldErrors({})
    setError('')
    setSubmitting(true)
    try {
      const response = await fetch('/api/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...form, registrationType: 'panel' }) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.ok) {
        const serverErrors = data.fields && typeof data.fields === 'object' ? data.fields : {}
        setFieldErrors(serverErrors)
        setError(data.error || 'We could not save your registration. Please try again.')
        if (Object.keys(serverErrors).length) focusFirstInvalidField(serverErrors)
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
    setForm(freshPanelForm())
    setConfirmation(null)
    setSubmitted(false)
    setError('')
    setFieldErrors({})
    window.setTimeout(() => nameRef.current?.focus(), 0)
  }
  return <main id="main">
    <section className="page-header panel-register-header"><div className="container"><a className="back-link" href={PATHS.register}>← All registrations</a><p className="eyebrow">Industry Panel Discussions</p><h1 className="section-heading">Panel Discussion Registration</h1><p className="panel-theme-line">Agriculture <span>•</span> Education <span>•</span> Healthcare</p><p className="section-lede">Join experts, professionals, educators, researchers and students to discuss the role and future of AI across key sectors.</p></div></section>
    <section className="section"><div className="container register-layout">
      <form id="panel-register-form" className="sectioned-form" noValidate hidden={submitted} onSubmit={submit}>
        <fieldset className="form-section" data-reveal><legend><span>01</span> Participant Details</legend>
          <div className="form-row"><div className="form-field"><label htmlFor="panel-name">Full Name *</label><input ref={nameRef} id="panel-name" name="name" type="text" autoComplete="name" required value={form.name} onChange={updateField} aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? 'panel-name-error' : undefined} /><FieldError id="panel-name-error" message={fieldErrors.name} /></div><div className="form-field"><label htmlFor="panel-email">Verified Google Email</label><input className="verified-email-input" id="panel-email" name="email" type="email" autoComplete="email" readOnly value={form.email} aria-describedby="panel-email-hint" /><p className="field-hint" id="panel-email-hint">Connected securely through Google Sign-In.</p></div></div>
          <div className="form-field"><label htmlFor="panel-phone">Phone Number *</label><input id="panel-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={24} placeholder="+91 98765 43210" required value={form.phone} onChange={updateField} aria-invalid={Boolean(fieldErrors.phone)} aria-describedby={fieldErrors.phone ? 'panel-phone-error' : 'panel-phone-hint'} /><p className="field-hint" id="panel-phone-hint">Use 7 to 15 digits. Spaces, +, hyphens and brackets are allowed.</p><FieldError id="panel-phone-error" message={fieldErrors.phone} /></div>
          <div className="form-field"><span className="form-legend">Participant Type *</span><RadioOptions name="participantType" options={participantTypes} value={form.participantType} onChange={updateField} required invalid={Boolean(fieldErrors.participantType)} errorId="participant-type-error" /><FieldError id="participant-type-error" message={fieldErrors.participantType} /></div>
          <div className="form-row"><div className="form-field"><label htmlFor="panel-organisation">College / Institution / Organization Name *</label><input id="panel-organisation" name="organisation" type="text" autoComplete="organization" required value={form.organisation} onChange={updateField} aria-invalid={Boolean(fieldErrors.organisation)} aria-describedby={fieldErrors.organisation ? 'panel-organisation-error' : undefined} /><FieldError id="panel-organisation-error" message={fieldErrors.organisation} /></div><div className="form-field"><label htmlFor="panel-department">Department / Branch</label><input id="panel-department" name="department" type="text" value={form.department} onChange={updateField} /></div></div>
        </fieldset>
        <fieldset className="form-section" data-reveal><legend><span>02</span> Panel Selection</legend><div className="form-field"><span className="form-legend">Which panel discussion would you like to attend? *</span><RadioOptions name="panelSelection" options={panelOptions} value={form.panelSelection} onChange={updateField} required invalid={Boolean(fieldErrors.panelSelection)} errorId="panel-selection-error" /><FieldError id="panel-selection-error" message={fieldErrors.panelSelection} /></div><p className="form-note">Select one panel. The panel discussions run concurrently, and students are welcome to attend.</p></fieldset>
        <fieldset className="form-section" data-reveal><legend><span>03</span> Professional / Delegate Details</legend>
          <div className="form-field"><span className="form-legend">Industry Sector</span><RadioOptions name="industrySector" options={industrySectors} value={form.industrySector} onChange={updateField} /></div>{form.industrySector === 'Other' && <div className="form-field conditional-field"><label htmlFor="industry-other">Please specify industry sector *</label><input id="industry-other" name="industrySectorOther" type="text" required value={form.industrySectorOther} onChange={updateField} aria-invalid={Boolean(fieldErrors.industrySectorOther)} aria-describedby={fieldErrors.industrySectorOther ? 'industry-other-error' : undefined} /><FieldError id="industry-other-error" message={fieldErrors.industrySectorOther} /></div>}
          <div className="form-field"><span className="form-legend">Organization Type</span><RadioOptions name="organisationType" options={organisationTypes} value={form.organisationType} onChange={updateField} /></div>{form.organisationType === 'Other' && <div className="form-field conditional-field"><label htmlFor="organisation-other">Please specify organization type *</label><input id="organisation-other" name="organisationTypeOther" type="text" required value={form.organisationTypeOther} onChange={updateField} aria-invalid={Boolean(fieldErrors.organisationTypeOther)} aria-describedby={fieldErrors.organisationTypeOther ? 'organisation-other-error' : undefined} /><FieldError id="organisation-other-error" message={fieldErrors.organisationTypeOther} /></div>}
        </fieldset>
        <fieldset className="form-section" data-reveal><legend><span>04</span> Confirmation</legend><label className={`confirmation-check${fieldErrors.informationConfirmed ? ' has-error' : ''}`}><input type="checkbox" name="informationConfirmed" checked={form.informationConfirmed} onChange={updateField} required aria-invalid={Boolean(fieldErrors.informationConfirmed)} aria-describedby={fieldErrors.informationConfirmed ? 'confirmation-error' : undefined} /><span>I confirm that the information provided above is accurate. *</span></label><FieldError id="confirmation-error" message={fieldErrors.informationConfirmed} /><label className="confirmation-check"><input type="checkbox" name="updatesOptIn" checked={form.updatesOptIn} onChange={updateField} /><span>I agree to receive official AI Conclave updates regarding the panel discussion.</span></label></fieldset>
        <div className="form-submit-row"><button type="submit" className="btn btn-primary" disabled={submitting} aria-busy={submitting}>{submitting ? 'Submitting…' : <>Submit Panel Registration <span aria-hidden="true">→</span></>}</button><p className={`form-error${error ? ' is-visible' : ''}`} role="alert" aria-live="polite">{error}</p></div>
      </form>
      <div className={`confirmation-panel${submitted ? ' is-visible' : ''}`} role="status" aria-live="polite" tabIndex={submitted ? -1 : undefined}><span className="stamp">Panel Registration Received</span><h2>Your seat request is recorded.</h2><p>Thanks for registering for the AI Conclave 2026 Industry Panel Discussions.</p>{confirmation && <><RegistrationTicket registration={confirmation} /><dl className="confirmation-summary"><dt>Name</dt><dd>{confirmation.name}</dd><dt>Email</dt><dd>{confirmation.email}</dd><dt>Participant</dt><dd>{confirmation.participantType}</dd><dt>Panel</dt><dd>{confirmation.panelSelection}</dd></dl></>}<div className="confirmation-actions"><a className="btn btn-primary" href={PATHS.myRegistration}>View My Registrations <span className="btn-arrow" aria-hidden="true">→</span></a><button type="button" className="btn btn-outline" onClick={reset}>Register for Another Panel</button></div></div>
    </div></section>
  </main>
}

function ticketReference(registration) {
  const identifier = registration.id == null ? 'PENDING' : String(registration.id).padStart(5, '0')
  return `AIC26-P-${identifier}`
}

function ticketFileName(registration) {
  const safeName = String(registration.name || 'participant').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'participant'
  return `ai-conclave-2026-${safeName}-ticket.png`
}

function wrapCanvasText(context, value, maximumWidth, maximumLines = 2) {
  const words = String(value || '—').split(/\s+/)
  const lines = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (!line || context.measureText(candidate).width <= maximumWidth) line = candidate
    else {
      lines.push(line)
      line = word
      if (lines.length === maximumLines - 1) break
    }
  }
  if (line && lines.length < maximumLines) lines.push(line)
  if (lines.length === maximumLines && words.join(' ').length > lines.join(' ').length) {
    let last = lines[maximumLines - 1]
    while (last.length && context.measureText(`${last}…`).width > maximumWidth) last = last.slice(0, -1)
    lines[maximumLines - 1] = `${last.trim()}…`
  }
  return lines
}

function drawTicketField(context, label, value, x, y, width) {
  context.fillStyle = '#6b6b65'
  context.font = '600 20px monospace'
  context.fillText(label.toUpperCase(), x, y)
  context.fillStyle = '#0a0a0a'
  context.font = '700 34px Arial, sans-serif'
  wrapCanvasText(context, value, width).forEach((line, index) => context.fillText(line, x, y + 48 + index * 40))
}

function downloadRegistrationTicket(registration) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.width = 1600
    canvas.height = 1000
    const context = canvas.getContext('2d')
    if (!context) {
      reject(new Error('Ticket download is not supported in this browser.'))
      return
    }

    context.fillStyle = '#f7f7f4'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#fff'
    context.fillRect(55, 55, 1490, 890)
    context.strokeStyle = '#0a0a0a'
    context.lineWidth = 3
    context.strokeRect(55, 55, 1490, 890)
    context.fillStyle = '#ff1e1e'
    context.fillRect(55, 55, 1490, 18)

    context.fillStyle = '#ff1e1e'
    context.fillRect(105, 115, 86, 86)
    context.fillStyle = '#0a0a0a'
    context.font = '700 30px monospace'
    context.fillText('AC', 128, 169)
    context.font = '700 34px monospace'
    context.fillText('AI CONCLAVE 2026', 225, 151)
    context.fillStyle = '#6b6b65'
    context.font = '600 20px monospace'
    context.fillText('AJCE · KANJIRAPPALLY', 225, 187)

    context.strokeStyle = '#1a6b3c'
    context.lineWidth = 2
    context.strokeRect(1158, 123, 287, 62)
    context.fillStyle = '#1a6b3c'
    context.beginPath()
    context.arc(1190, 154, 8, 0, Math.PI * 2)
    context.fill()
    context.font = '700 18px monospace'
    context.fillText('REGISTRATION RECEIVED', 1212, 161)

    context.fillStyle = '#6b6b65'
    context.font = '600 22px monospace'
    context.fillText(`${PANEL_EVENT.day.toUpperCase()} · ${PANEL_EVENT.name.toUpperCase()}`, 105, 275)
    context.fillStyle = '#0a0a0a'
    context.font = '700 66px monospace'
    context.fillText(registration.panelSelection || PANEL_EVENT.name, 105, 355)
    context.strokeStyle = '#deded8'
    context.lineWidth = 2
    context.beginPath()
    context.moveTo(105, 405)
    context.lineTo(1495, 405)
    context.stroke()

    drawTicketField(context, 'Name', registration.name, 105, 470, 610)
    drawTicketField(context, 'Participant type', registration.participantType, 835, 470, 560)
    drawTicketField(context, 'Organisation', registration.organisation, 105, 630, 610)
    drawTicketField(context, 'Panel selection', registration.panelSelection, 835, 630, 560)
    drawTicketField(context, 'Event date', `${PANEL_EVENT.date} · ${PANEL_EVENT.time}`, 105, 790, 610)
    drawTicketField(context, 'Ticket reference', ticketReference(registration), 835, 790, 560)

    context.fillStyle = '#1a6b3c'
    context.fillRect(55, 915, 1490, 30)
    context.fillStyle = '#6b6b65'
    context.font = '600 17px monospace'
    context.fillText('Present this ticket at the event registration desk.', 105, 900)

    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('The ticket could not be generated.'))
        return
      }
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = ticketFileName(registration)
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      resolve()
    }, 'image/png')
  })
}

function TicketDownloadButton({ registration }) {
  const [state, setState] = useState('idle')
  const download = async () => {
    if (state === 'working') return
    setState('working')
    try {
      await downloadRegistrationTicket(registration)
      setState('idle')
    } catch {
      setState('error')
    }
  }
  return <div className="ticket-download-control"><button type="button" className="btn btn-primary ticket-download-button" onClick={download} disabled={state === 'working'}>{state === 'working' ? 'Preparing Ticket…' : <>Download Ticket <span aria-hidden="true">↓</span></>}</button>{state === 'error' && <small role="alert">Ticket download failed. Please try again.</small>}</div>
}

function RegistrationTicket({ registration }) {
  return <section className="event-ticket" aria-label={`Ticket for ${registration.panelSelection}`}>
    <header className="event-ticket-header"><div className="event-ticket-brand"><span>AC</span><div><strong>AI CONCLAVE 2026</strong><small>AJCE · Kanjirappally</small></div></div><span className="event-ticket-status"><i aria-hidden="true"></i> Registered</span></header>
    <div className="event-ticket-title"><small>{PANEL_EVENT.day} · {PANEL_EVENT.name}</small><h3>{registration.panelSelection}</h3></div>
    <dl className="event-ticket-grid"><div><dt>Name</dt><dd>{registration.name}</dd></div><div><dt>Participant type</dt><dd>{registration.participantType}</dd></div><div><dt>Organisation</dt><dd>{registration.organisation}</dd></div><div><dt>Panel selection</dt><dd>{registration.panelSelection}</dd></div><div><dt>Event date</dt><dd>{PANEL_EVENT.date} · {PANEL_EVENT.time}</dd></div><div><dt>Ticket reference</dt><dd>{ticketReference(registration)}</dd></div></dl>
    <footer><span>Present this ticket at the event registration desk.</span><strong>{ticketReference(registration)}</strong></footer>
    <div className="event-ticket-actions"><TicketDownloadButton registration={registration} /><small>Downloads as a high-quality PNG.</small></div>
  </section>
}

function RegistrationDetail({ registration }) {
  const details = [
    ['Name', registration.name],
    ['Verified email', registration.email],
    ['Phone', registration.phone],
    ['Participant type', registration.participantType],
    ['Organisation', registration.organisation],
    ['Department / branch', registration.department],
    ['Panel selection', registration.panelSelection],
    ['Industry sector', registration.industrySector === 'Other' ? registration.industrySectorOther : registration.industrySector],
    ['Organisation type', registration.organisationType === 'Other' ? registration.organisationTypeOther : registration.organisationType],
    ['Official updates', registration.updatesOptIn ? 'Yes' : 'No'],
  ].filter(([, value]) => value)
  const submitted = registration.createdAt ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(registration.createdAt)) : ''
  return <details className="registration-record">
    <summary className="registration-record-summary"><div><span className="stamp">{registration.type}</span><h2>{registration.panelSelection}</h2><p>Submitted {submitted}</p></div><div className="registration-record-action"><span className="registration-status"><i aria-hidden="true"></i>{registration.status}</span><span className="registration-toggle"><span className="registration-toggle-closed">View details</span><span className="registration-toggle-open">Hide details</span><i aria-hidden="true"></i></span></div></summary>
    <div className="registration-record-body"><RegistrationTicket registration={registration} /><dl className="registration-record-grid">{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></div>
  </details>
}

function MyRegistrationPage() {
  const [refresh, setRefresh] = useState(0)
  const [state, setState] = useState({ status: 'loading', participant: null, registrations: [], error: '' })

  useEffect(() => {
    let active = true
    setState((current) => ({ ...current, status: 'loading', error: '' }))
    fetch('/api/my-registration', { headers: { accept: 'application/json' } }).then(async (response) => {
      const data = await response.json().catch(() => ({}))
      if (response.status === 401) {
        if (active) setState({ status: 'signed-out', participant: null, registrations: [], error: '' })
        return
      }
      if (!response.ok || !data.ok) throw new Error(data.error || 'We could not load your registrations.')
      if (active) setState({ status: 'ready', participant: data.participant, registrations: data.registrations || [], error: '' })
    }).catch((error) => {
      if (active) setState({ status: 'error', participant: null, registrations: [], error: error.message || 'We could not load your registrations.' })
    })
    return () => { active = false }
  }, [refresh])

  const signOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', headers: { accept: 'application/json' } })
    } finally {
      window.google?.accounts?.id?.disableAutoSelect()
      setState({ status: 'signed-out', participant: null, registrations: [], error: '' })
    }
  }

  if (state.status === 'signed-out') return <SignInCard onSignedIn={() => setRefresh((value) => value + 1)} />
  if (state.status === 'loading') return <main id="main"><section className="account-loading"><span className="account-spinner" aria-hidden="true"></span><p>Loading your registrations…</p></section></main>
  if (state.status === 'error') return <main id="main"><section className="section"><div className="container register-layout"><div className="account-error account-error-page" role="alert"><h1>Registrations could not be loaded.</h1><p>{state.error}</p><button type="button" className="btn btn-outline" onClick={() => setRefresh((value) => value + 1)}>Try again</button></div></div></section></main>

  return <main id="main"><section className="page-header"><div className="container"><p className="eyebrow">Participant portal</p><h1 className="section-heading">My registrations</h1><p className="section-lede">Review the event details recorded for your verified Google account.</p></div></section><section className="section"><div className="container">
    <div className="participant-bar participant-portal-bar"><span className="participant-status-dot" aria-hidden="true"></span><div><small>Signed in as</small><strong>{state.participant.displayName || state.participant.email}</strong><span>{state.participant.email}</span></div><button type="button" className="text-button" onClick={signOut}>Sign out</button></div>
    {state.registrations.length ? <div className="registration-records">{state.registrations.map((registration) => <RegistrationDetail registration={registration} key={`${registration.type}-${registration.id}`} />)}</div> : <div className="empty-registration"><span className="stamp">No registrations yet</span><h2>Choose your first event.</h2><p>Once you submit a registration, its complete details will appear here.</p><a className="btn btn-primary" href={PATHS.register}>Choose an event <span aria-hidden="true">→</span></a></div>}
  </div></section></main>
}

function App() {
  const [page, setPage] = useState(currentPage)
  useSiteEnhancements(page)

  useEffect(() => {
    const commitNavigation = (destination, push) => {
      if (push) window.history.pushState({}, '', destination)
      flushSync(() => setPage(currentPage()))
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }

    const navigate = (destination, push = true) => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const commit = () => commitNavigation(destination, push)
      if (document.startViewTransition && !reduceMotion) document.startViewTransition(commit)
      else commit()
    }

    const handleClick = (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = event.target.closest('a[href]')
      if (!anchor || anchor.target || anchor.hasAttribute('download')) return
      const destination = new URL(anchor.href, window.location.href)
      if (destination.origin !== window.location.origin) return
      if (destination.pathname === window.location.pathname && destination.search === window.location.search && destination.hash) return
      if (destination.href === window.location.href) return
      event.preventDefault()
      navigate(`${destination.pathname}${destination.search}${destination.hash}`)
    }

    const handlePopState = () => navigate(`${window.location.pathname}${window.location.search}${window.location.hash}`, false)
    document.addEventListener('click', handleClick)
    window.addEventListener('popstate', handlePopState)
    return () => {
      document.removeEventListener('click', handleClick)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  useEffect(() => {
    document.title = page === 'home' ? 'AI Conclave 2026' : `${page[0].toUpperCase()}${page.slice(1)} — AI Conclave 2026`
  }, [page])

  const content = page === 'about' ? <AboutPage />
    : page === 'schedule' ? <SchedulePage />
      : page === 'participate' ? <ParticipatePage />
        : page === 'register' ? <RegistrationGate>{(participant) => <RegistrationChoicePage participant={participant} />}</RegistrationGate>
          : page === 'register-hackathon' ? <RegistrationGate>{() => HACKATHON_REGISTRATION_OPEN ? <HackathonRegisterPage /> : <HackathonRegistrationClosedPage />}</RegistrationGate>
            : page === 'register-panel' ? <RegistrationGate>{(participant) => <PanelRegisterPage participant={participant} />}</RegistrationGate>
              : page === 'my-registration' ? <MyRegistrationPage />
                : <HomePage />
  return <><IntroScreen /><Shell active={page}>{content}</Shell></>
}

export default App
