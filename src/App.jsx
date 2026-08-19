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

const HACKATHON_REGISTRATION_OPEN = true
const GOOGLE_SIGN_IN_ENABLED = false
const DEV_PREVIEW_PARTICIPANT = Object.freeze({ displayName: '', email: '', isPreview: true })
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

const hackathonChallengeAreas = Object.freeze({
  Agriculture: {
    'Smart Farming': ['IoT-based crop monitoring', 'Smart irrigation', 'Automated farming'],
    'Crop Disease Detection': ['Image-based disease identification', 'Early warning systems'],
    'Pest Management': ['Pest detection', 'Pest prediction', 'Eco-friendly pest control'],
    'Precision Agriculture': ['Soil analysis', 'Crop-specific fertilizer recommendations'],
    'Water Management': ['Irrigation optimization', 'Water-level monitoring', 'Drought prediction'],
    'Weather & Climate': ['Weather-based crop advisory', 'Climate-risk prediction'],
    'Soil Health': ['Soil quality monitoring', 'Nutrient recommendation'],
    'Crop Yield Prediction': ['AI-based yield forecasting'],
    'Farmer Support': ['Farmer advisory apps', 'Multilingual voice assistants'],
    'Market & Price Prediction': ['Crop price forecasting', 'Direct farmer-to-consumer platforms'],
    'Supply Chain': ['Cold-chain monitoring', 'Post-harvest tracking'],
    'Post-Harvest Management': ['Food spoilage detection', 'Storage optimization'],
    'Livestock & Dairy': ['Animal health monitoring', 'Milk-production prediction'],
    'Sustainable Agriculture': ['Organic farming', 'Carbon footprint reduction'],
    'Agri-FinTech': ['Crop insurance', 'Agricultural loans', 'Financial planning'],
    'Agri-Robotics': ['Autonomous harvesting', 'Weed detection and removal'],
  },
  Health: {
    'Disease Detection': ['AI-assisted early detection and screening'],
    'Medical Imaging': ['X-ray, CT or MRI image analysis'],
    'Remote Healthcare': ['Telemedicine', 'Remote consultation'],
    'Health Monitoring': ['IoT-based monitoring', 'Wearable-based monitoring'],
    'Maternal & Child Health': ['Pregnancy monitoring', 'Child nutrition'],
    'Elderly Care': ['Fall detection', 'Medication reminders', 'Emergency alerts'],
    'Mental Wellness': ['Stress-management applications', 'Wellness-support applications'],
    'Nutrition': ['Personalized diet recommendations', 'Personalized nutrition recommendations'],
    'Medicine Management': ['Medication reminders', 'Prescription management'],
    'Emergency Healthcare': ['Ambulance coordination', 'Emergency response'],
    'Hospital Management': ['Queue management', 'Bed allocation', 'Resource optimization'],
    'Public Health': ['Disease outbreak monitoring', 'Disease outbreak prediction'],
    'Accessibility': ['Assistive technologies for people with disabilities'],
    'Healthcare NLP': ['Medical document summarization', 'Multilingual health assistants'],
    'Health Records': ['Secure digital health records'],
    'Rural Healthcare': ['Low-bandwidth healthcare solutions', 'Community health support'],
    'Preventive Healthcare': ['Risk prediction', 'Personalized preventive recommendations'],
  },
  Education: {
    'Personalized Learning': ['AI-generated personalized learning paths'],
    'AI Tutor': ['Intelligent tutoring', 'Doubt-clearing systems'],
    'Learning Analytics': ['Student performance prediction', 'Learning-gap identification'],
    'Accessibility': ['Tools for visually impaired learners', 'Tools for hearing impaired learners'],
    'Language Learning': ['AI-based language learning', 'Pronunciation systems'],
    'Multilingual Education': ['Translation in regional languages', 'Voice-based learning in regional languages'],
    'Digital Assessment': ['Automated evaluation', 'Question generation'],
    'Skill Development': ['Personalized skill-gap analysis'],
    'Career Guidance': ['AI-based career recommendations', 'AI-based course recommendations'],
    'Dropout Prediction': ['Identifying students at risk of dropping out'],
    'Teacher Support': ['Lesson planning', 'Content generation', 'Assessment assistance'],
    'AR/VR Education': ['Virtual laboratories', 'Immersive learning'],
    'STEM Education': ['Interactive science learning', 'Interactive engineering learning'],
    'Rural Education': ['Offline learning platforms', 'Low-bandwidth learning platforms'],
    'Special Education': ['Assistive learning for children with special needs'],
    'Academic Integrity': ['Plagiarism detection', 'AI-generated content detection'],
    'Gamification': ['Game-based learning', 'Learner engagement'],
    'Digital Library': ['Intelligent search systems', 'Intelligent recommendation systems'],
  },
})

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
  tracks: [],
  challengeArea: '',
  subcategory: '',
  problemArea: '',
  ideaSummary: '',
  informationConfirmed: false,
}

function validateHackathonForm(form) {
  const errors = {}

  if (!form.name.trim()) errors.name = 'Enter your full name.'
  if (!form.email.trim()) errors.email = 'Enter your email address.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Enter a valid email address, for example name@example.com.'
  if (!form.phone.trim()) errors.phone = 'Enter your phone number.'
  else if (!/^\d{10}$/.test(form.phone)) errors.phone = 'Enter exactly 10 digits after +91.'
  if (!form.organisation.trim()) errors.organisation = 'Enter your school, college or organization name.'
  if (form.tracks.length !== 1) errors.tracks = 'Choose one hackathon track.'
  if (!hackathonChallengeAreas[form.challengeArea]) errors.challengeArea = 'Choose a challenge sector.'
  else if (!hackathonChallengeAreas[form.challengeArea][form.subcategory]) errors.subcategory = 'Choose a subcategory.'
  else if (!hackathonChallengeAreas[form.challengeArea][form.subcategory].includes(form.problemArea)) errors.problemArea = 'Choose a suggested problem area.'
  if (!form.informationConfirmed) errors.informationConfirmed = 'Confirm that the information provided is accurate.'

  return errors
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
  const [state, setState] = useState(() => GOOGLE_SIGN_IN_ENABLED
    ? { status: 'loading', participant: null, error: '' }
    : { status: 'preview', participant: DEV_PREVIEW_PARTICIPANT, error: '' })
  useEffect(() => {
    if (!GOOGLE_SIGN_IN_ENABLED) return undefined
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
  if (session.status === 'preview') return children(session.participant)
  if (session.status === 'loading') return <main id="main"><section className="account-loading"><span className="account-spinner" aria-hidden="true"></span><p>Checking your sign-in…</p></section></main>
  if (session.status === 'error') return <main id="main"><section className="section"><div className="container register-layout"><div className="account-error account-error-page" role="alert"><h1>Sign-in could not be checked.</h1><p>{session.error}</p><button type="button" className="btn btn-outline" onClick={() => window.location.reload()}>Try again</button></div></div></section></main>
  if (session.status !== 'signed-in') return <SignInCard onSignedIn={(participant) => setSession({ status: 'signed-in', participant, error: '' })} />
  return children(session.participant)
}

function ParticipantBar({ participant }) {
  if (participant.isPreview) return <div className="participant-bar participant-preview-bar"><span className="participant-status-dot" aria-hidden="true"></span><div><small>Development mode</small><strong>Google sign-in disabled</strong><span>Participant details can be entered directly in each form.</span></div></div>
  return <div className="participant-bar"><span className="participant-status-dot" aria-hidden="true"></span><div><small>Signed in as</small><strong>{participant.displayName || participant.email}</strong><span>{participant.email}</span></div><a href={PATHS.myRegistration}>My registrations <span aria-hidden="true">→</span></a></div>
}

function RegistrationChoicePage({ participant }) {
  return <main id="main">
    <section className="page-header"><div className="container"><p className="eyebrow">Registration</p><h1 className="section-heading">Choose your experience</h1><p className="section-lede">Start with Day 1 panel discussions or register for the Day 2 hackathon.</p></div></section>
    <section className="section"><div className="container"><ParticipantBar participant={participant} /><div className="registration-choice-grid">
      <a className="registration-choice registration-choice-panel" href={PATHS.registerPanel} data-reveal><span className="choice-number" aria-hidden="true">01</span><span className="stamp">Day 1 · Industry Panels</span><h2>Panel Discussion Registration</h2><p>For students, educators, researchers, professionals and delegates attending the Agriculture, Education or Healthcare panels.</p><span className="choice-action">Register for Panel Discussion <span aria-hidden="true">→</span></span></a>
      {HACKATHON_REGISTRATION_OPEN ? <a className="registration-choice registration-choice-hackathon" href={PATHS.registerHackathon} data-reveal><span className="choice-number" aria-hidden="true">02</span><span className="stamp">Day 2 · Hackathon</span><h2>Hackathon Registration</h2><p>For school and college students joining either the Technical or Non-Technical track.</p><div className="hackathon-instruction-preview"><strong>Before you register</strong><ul><li>The on-campus hackathon session runs for 5 hours.</li><li>Students may build their project at home in advance and demonstrate it at the event.</li></ul></div><span className="choice-action">Register for Hackathon <span aria-hidden="true">→</span></span></a> : <div className="registration-choice registration-choice-hackathon is-registration-closed" aria-disabled="true" data-reveal><span className="choice-number" aria-hidden="true">02</span><span className="stamp">Day 2 · Hackathon</span><h2>Hackathon Registration</h2><p>For school and college students joining the Technical or Non-Technical hackathon.</p><span className="choice-action choice-action-disabled">Registration Not Started</span><div className="registration-closed-layer"><span className="closed-status"><i aria-hidden="true"></i> Registration update</span><strong>Opening Soon</strong><small>Hackathon registration has not started yet.</small></div></div>}
    </div></div></section>
  </main>
}

function HackathonRegisterPage({ participant }) {
  const freshHackathonForm = () => ({ ...initialHackathonForm, tracks: [], name: participant.displayName || '', email: participant.email })
  const [form, setForm] = useState(freshHackathonForm)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const nameRef = useRef(null)

  const updateField = (event) => {
    const { name, value, type, checked } = event.target
    setForm((current) => {
      const normalizedValue = name === 'phone' ? value.replace(/\D/g, '').slice(0, 10) : value
      const next = { ...current, [name]: type === 'checkbox' ? checked : normalizedValue }
      if (name === 'challengeArea') return { ...next, subcategory: '', problemArea: '' }
      if (name === 'subcategory') return { ...next, problemArea: '' }
      return next
    })
    setFieldErrors((current) => {
      if (!current[name]) return current
      const next = { ...current }
      delete next[name]
      return next
    })
  }

  const selectTrack = (event) => {
    const { value } = event.target
    setForm((current) => ({ ...current, tracks: [value] }))
    setFieldErrors((current) => {
      if (!current.tracks) return current
      const next = { ...current }
      delete next.tracks
      return next
    })
  }

  const submit = async (event) => {
    event.preventDefault()
    if (submitting) return
    const validationErrors = validateHackathonForm(form)
    if (Object.keys(validationErrors).length) {
      setFieldErrors(validationErrors)
      setError('Please review the highlighted fields below.')
      window.setTimeout(() => document.querySelector(`[name="${Object.keys(validationErrors)[0]}"]`)?.focus(), 0)
      return
    }
    setFieldErrors({})
    setError('')
    setSubmitting(true)
    try {
      const response = await fetch('/api/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...form, registrationType: 'hackathon' }) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.ok) {
        if (data.fields && typeof data.fields === 'object') setFieldErrors(data.fields)
        setError(data.error || 'Could not save registration. Please try again.')
        return
      }
      setConfirmation(data.registration)
      setSubmitted(true)
      window.setTimeout(() => document.querySelector('.hackathon-confirmation-panel')?.focus(), 0)
    } catch {
      setError('Network error. Check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const subcategories = form.challengeArea ? Object.keys(hackathonChallengeAreas[form.challengeArea]) : []
  const problemAreas = form.challengeArea && form.subcategory ? hackathonChallengeAreas[form.challengeArea][form.subcategory] : []
  const reset = () => {
    setForm(freshHackathonForm())
    setError('')
    setFieldErrors({})
    setConfirmation(null)
    setSubmitted(false)
    window.setTimeout(() => nameRef.current?.focus(), 0)
  }

  return <main id="main">
    <section className="page-header hackathon-register-header"><div className="container"><a className="back-link" href={PATHS.register}>← All registrations</a><p className="eyebrow">Day 2 · Hackathon</p><h1 className="section-heading">Hackathon Registration</h1><p className="panel-theme-line">Agriculture <span>•</span> Health <span>•</span> Education</p><p className="section-lede">Choose your track and the challenge you want to solve with AI.</p></div></section>
    <section id="registration-form" className="section"><div className="container register-layout">
      <form id="register-form" className="sectioned-form hackathon-register-form" noValidate hidden={submitted} onSubmit={submit}>
        <fieldset className="form-section"><legend><span>01</span> Participant Details</legend>
          <div className="participant-details-grid">
            <div className="form-field participant-name"><label htmlFor="hackathon-name">Full Name *</label><input ref={nameRef} id="hackathon-name" name="name" type="text" autoComplete="name" required value={form.name} onChange={updateField} aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? 'hackathon-name-error' : undefined} /><FieldError id="hackathon-name-error" message={fieldErrors.name} /></div>
            <div className="form-field participant-email"><label htmlFor="hackathon-email">{participant.isPreview ? 'Email Address *' : 'Verified Google Email'}</label><input className={participant.isPreview ? undefined : 'verified-email-input'} id="hackathon-email" name="email" type="email" autoComplete="email" readOnly={!participant.isPreview} required value={form.email} onChange={participant.isPreview ? updateField : undefined} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? 'hackathon-email-error' : participant.isPreview ? undefined : 'hackathon-email-hint'} />{!participant.isPreview && <p className="field-hint" id="hackathon-email-hint">Connected securely through Google Sign-In.</p>}<FieldError id="hackathon-email-error" message={fieldErrors.email} /></div>
            <div className="form-field participant-phone"><label htmlFor="hackathon-phone">Phone Number *</label><div className={`india-phone-input${fieldErrors.phone ? ' has-error' : ''}`}><span aria-hidden="true">+91</span><input id="hackathon-phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} pattern="[0-9]{10}" placeholder="9876543210" required value={form.phone} onChange={updateField} aria-invalid={Boolean(fieldErrors.phone)} aria-describedby={fieldErrors.phone ? 'hackathon-phone-error' : 'hackathon-phone-hint'} /></div><p className="field-hint" id="hackathon-phone-hint">Enter the 10-digit mobile number after +91.</p><FieldError id="hackathon-phone-error" message={fieldErrors.phone} /></div>
            <div className="form-field participant-organisation"><label htmlFor="hackathon-organisation">School / College / Organization *</label><input id="hackathon-organisation" name="organisation" type="text" autoComplete="organization" required value={form.organisation} onChange={updateField} aria-invalid={Boolean(fieldErrors.organisation)} aria-describedby={fieldErrors.organisation ? 'hackathon-organisation-error' : undefined} /><FieldError id="hackathon-organisation-error" message={fieldErrors.organisation} /></div>
          </div>
        </fieldset>

        <fieldset className="form-section"><legend><span>02</span> Hackathon Track</legend><p className="form-hint">Choose exactly one track for your entry.</p><div className={`track-options${fieldErrors.tracks ? ' has-error' : ''}`} role="radiogroup" aria-invalid={Boolean(fieldErrors.tracks)} aria-describedby={fieldErrors.tracks ? 'hackathon-tracks-error' : undefined}>{hackathonTrackOptions.map((track) => <div className="track-option" key={track.id}><label htmlFor={track.id}><span className="track-option-title">{track.title}</span><span className="track-option-desc">{track.description}</span></label><input type="radio" id={track.id} name="tracks" value={track.value} checked={form.tracks[0] === track.value} onChange={selectTrack} /></div>)}</div><FieldError id="hackathon-tracks-error" message={fieldErrors.tracks} /></fieldset>

        <fieldset className="form-section challenge-section"><legend><span>03</span> Challenge Focus</legend>
          <div className="form-field"><span className="form-legend">Choose a sector *</span><div className={`challenge-area-options${form.challengeArea ? ' has-selection' : ''}`} role="radiogroup" aria-invalid={Boolean(fieldErrors.challengeArea)} aria-describedby={fieldErrors.challengeArea ? 'challenge-area-error' : undefined}>{Object.keys(hackathonChallengeAreas).map((area) => <label className={`challenge-area-card challenge-area-${area.toLowerCase()}${form.challengeArea === area ? ' is-selected' : form.challengeArea ? ' is-muted' : ''}`} key={area}><input type="radio" name="challengeArea" value={area} checked={form.challengeArea === area} onChange={updateField} /><span className="challenge-area-index" aria-hidden="true">0{Object.keys(hackathonChallengeAreas).indexOf(area) + 1}</span><strong>{area}</strong><small>{Object.keys(hackathonChallengeAreas[area]).length} subcategories</small></label>)}</div><FieldError id="challenge-area-error" message={fieldErrors.challengeArea} /></div>
          <div className="challenge-dependent-fields" aria-live="polite">
            {!form.challengeArea ? <div className="challenge-waiting-state"><span>Next step</span><p>Choose a sector above to see its subcategories.</p></div> : <>
              <div className="challenge-selection-step"><span className="challenge-step-number" aria-hidden="true">01</span><div className="form-field"><label htmlFor="hackathon-subcategory">Subcategory *</label><select id="hackathon-subcategory" name="subcategory" required value={form.subcategory} onChange={updateField} aria-invalid={Boolean(fieldErrors.subcategory)} aria-describedby={fieldErrors.subcategory ? 'hackathon-subcategory-error' : 'hackathon-subcategory-hint'}><option value="">Select a subcategory</option>{subcategories.map((subcategory) => <option value={subcategory} key={subcategory}>{subcategory}</option>)}</select><p className="field-hint" id="hackathon-subcategory-hint">Showing options for {form.challengeArea}.</p><FieldError id="hackathon-subcategory-error" message={fieldErrors.subcategory} /></div></div>
              {form.subcategory ? <div className="challenge-selection-step"><span className="challenge-step-number" aria-hidden="true">02</span><div className="form-field"><label htmlFor="hackathon-problem-area">Suggested Problem Area / Idea *</label><select id="hackathon-problem-area" name="problemArea" required value={form.problemArea} onChange={updateField} aria-invalid={Boolean(fieldErrors.problemArea)} aria-describedby={fieldErrors.problemArea ? 'hackathon-problem-error' : undefined}><option value="">Select a problem area</option>{problemAreas.map((problemArea) => <option value={problemArea} key={problemArea}>{problemArea}</option>)}</select><FieldError id="hackathon-problem-error" message={fieldErrors.problemArea} /></div></div> : <div className="challenge-waiting-state is-subtle"><span>Then</span><p>Choose a subcategory to reveal its suggested problem areas.</p></div>}
            </>}
          </div>
          <div className="form-field"><label htmlFor="hackathon-idea">Brief Problem Statement / Idea <span className="optional-label">Optional</span></label><textarea id="hackathon-idea" name="ideaSummary" rows="5" maxLength="800" placeholder="Describe the problem, who it affects, and your proposed approach." value={form.ideaSummary} onChange={updateField} /><p className="field-hint">Up to 800 characters. You can refine this later.</p></div>
        </fieldset>

        <fieldset className="form-section"><legend><span>04</span> Confirmation</legend><label className={`confirmation-check${fieldErrors.informationConfirmed ? ' has-error' : ''}`}><input type="checkbox" name="informationConfirmed" checked={form.informationConfirmed} onChange={updateField} required aria-invalid={Boolean(fieldErrors.informationConfirmed)} aria-describedby={fieldErrors.informationConfirmed ? 'hackathon-confirmation-error' : undefined} /><span>I confirm that the information provided above is accurate. *</span></label><FieldError id="hackathon-confirmation-error" message={fieldErrors.informationConfirmed} /></fieldset>
        <div className="form-submit-row"><button type="submit" className="btn btn-primary" disabled={submitting} aria-busy={submitting}>{submitting ? 'Submitting…' : <>Submit Hackathon Registration <span aria-hidden="true">→</span></>}</button><p className={`form-error${error ? ' is-visible' : ''}`} role="alert" aria-live="polite">{error}</p></div>
      </form>
      <div className={`confirmation-panel hackathon-confirmation-panel${submitted ? ' is-visible' : ''}`} role="status" aria-live="polite" tabIndex={submitted ? -1 : undefined}><span className="stamp">Hackathon Registration Received</span><h2>Your entry is recorded.</h2><p>Thanks for registering for the AI Conclave 2026 Hackathon.</p>{confirmation && <dl className="confirmation-summary"><dt>Name</dt><dd>{confirmation.name}</dd><dt>Email</dt><dd>{confirmation.email}</dd><dt>Participant</dt><dd>{confirmation.participantType}</dd><dt>Track</dt><dd>{confirmation.tracks.join(', ')}</dd><dt>Challenge</dt><dd>{confirmation.challengeArea} · {confirmation.subcategory}</dd><dt>Problem area</dt><dd>{confirmation.problemArea}</dd></dl>}<div className="confirmation-actions"><button type="button" className="btn btn-primary" onClick={reset}>Register Another Entry <span aria-hidden="true">→</span></button><a className="btn btn-outline" href={PATHS.register}>Back to Registrations</a></div></div>
    </div></section>
  </main>
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
          <div className="panel-participant-details-grid">
            <div className="form-field participant-name"><label htmlFor="panel-name">Full Name *</label><input ref={nameRef} id="panel-name" name="name" type="text" autoComplete="name" required value={form.name} onChange={updateField} aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? 'panel-name-error' : undefined} /><FieldError id="panel-name-error" message={fieldErrors.name} /></div>
            <div className="form-field participant-email"><label htmlFor="panel-email">{participant.isPreview ? 'Email Address *' : 'Verified Google Email'}</label><input className={participant.isPreview ? undefined : 'verified-email-input'} id="panel-email" name="email" type="email" autoComplete="email" readOnly={!participant.isPreview} required value={form.email} onChange={participant.isPreview ? updateField : undefined} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? 'panel-email-error' : participant.isPreview ? undefined : 'panel-email-hint'} />{!participant.isPreview && <p className="field-hint" id="panel-email-hint">Connected securely through Google Sign-In.</p>}<FieldError id="panel-email-error" message={fieldErrors.email} /></div>
            <div className="form-field participant-phone"><label htmlFor="panel-phone">Phone Number *</label><input id="panel-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={24} placeholder="+91 98765 43210" required value={form.phone} onChange={updateField} aria-invalid={Boolean(fieldErrors.phone)} aria-describedby={fieldErrors.phone ? 'panel-phone-error' : 'panel-phone-hint'} /><p className="field-hint" id="panel-phone-hint">Use 7 to 15 digits.</p><FieldError id="panel-phone-error" message={fieldErrors.phone} /></div>
            <div className="form-field participant-type"><label htmlFor="panel-participant-type">Participant Type *</label><select id="panel-participant-type" name="participantType" required value={form.participantType} onChange={updateField} aria-invalid={Boolean(fieldErrors.participantType)} aria-describedby={fieldErrors.participantType ? 'participant-type-error' : undefined}><option value="" disabled>Select participant type</option>{participantTypes.map((type) => <option value={type} key={type}>{type}</option>)}</select><FieldError id="participant-type-error" message={fieldErrors.participantType} /></div>
            <div className="form-field participant-organisation"><label htmlFor="panel-organisation">College / Institution / Organization *</label><input id="panel-organisation" name="organisation" type="text" autoComplete="organization" required value={form.organisation} onChange={updateField} aria-invalid={Boolean(fieldErrors.organisation)} aria-describedby={fieldErrors.organisation ? 'panel-organisation-error' : undefined} /><FieldError id="panel-organisation-error" message={fieldErrors.organisation} /></div>
            <div className="form-field participant-department"><label htmlFor="panel-department">Department / Branch</label><input id="panel-department" name="department" type="text" value={form.department} onChange={updateField} /></div>
          </div>
        </fieldset>
        <fieldset className="form-section" data-reveal><legend><span>02</span> Panel Selection</legend><div className="form-field"><span className="form-legend">Which panel discussion would you like to attend? *</span><RadioOptions name="panelSelection" options={panelOptions} value={form.panelSelection} onChange={updateField} required invalid={Boolean(fieldErrors.panelSelection)} errorId="panel-selection-error" /><FieldError id="panel-selection-error" message={fieldErrors.panelSelection} /></div><p className="form-note">Select one panel. The panel discussions run concurrently, and students are welcome to attend.</p></fieldset>
        <fieldset className="form-section" data-reveal><legend><span>03</span> Professional / Delegate Details</legend>
          <div className="form-field"><span className="form-legend">Industry Sector</span><RadioOptions name="industrySector" options={industrySectors} value={form.industrySector} onChange={updateField} /></div>{form.industrySector === 'Other' && <div className="form-field conditional-field"><label htmlFor="industry-other">Please specify industry sector *</label><input id="industry-other" name="industrySectorOther" type="text" required value={form.industrySectorOther} onChange={updateField} aria-invalid={Boolean(fieldErrors.industrySectorOther)} aria-describedby={fieldErrors.industrySectorOther ? 'industry-other-error' : undefined} /><FieldError id="industry-other-error" message={fieldErrors.industrySectorOther} /></div>}
          <div className="form-field"><span className="form-legend">Organization Type</span><RadioOptions name="organisationType" options={organisationTypes} value={form.organisationType} onChange={updateField} /></div>{form.organisationType === 'Other' && <div className="form-field conditional-field"><label htmlFor="organisation-other">Please specify organization type *</label><input id="organisation-other" name="organisationTypeOther" type="text" required value={form.organisationTypeOther} onChange={updateField} aria-invalid={Boolean(fieldErrors.organisationTypeOther)} aria-describedby={fieldErrors.organisationTypeOther ? 'organisation-other-error' : undefined} /><FieldError id="organisation-other-error" message={fieldErrors.organisationTypeOther} /></div>}
        </fieldset>
        <fieldset className="form-section" data-reveal><legend><span>04</span> Confirmation</legend><label className={`confirmation-check${fieldErrors.informationConfirmed ? ' has-error' : ''}`}><input type="checkbox" name="informationConfirmed" checked={form.informationConfirmed} onChange={updateField} required aria-invalid={Boolean(fieldErrors.informationConfirmed)} aria-describedby={fieldErrors.informationConfirmed ? 'confirmation-error' : undefined} /><span>I confirm that the information provided above is accurate. *</span></label><FieldError id="confirmation-error" message={fieldErrors.informationConfirmed} /><label className="confirmation-check"><input type="checkbox" name="updatesOptIn" checked={form.updatesOptIn} onChange={updateField} /><span>I agree to receive official AI Conclave updates regarding the panel discussion.</span></label></fieldset>
        <div className="form-submit-row"><button type="submit" className="btn btn-primary" disabled={submitting} aria-busy={submitting}>{submitting ? 'Submitting…' : <>Submit Panel Registration <span aria-hidden="true">→</span></>}</button><p className={`form-error${error ? ' is-visible' : ''}`} role="alert" aria-live="polite">{error}</p></div>
      </form>
      <div className={`confirmation-panel${submitted ? ' is-visible' : ''}`} role="status" aria-live="polite" tabIndex={submitted ? -1 : undefined}><span className="stamp">Panel Registration Received</span><h2>Your seat request is recorded.</h2><p>Thanks for registering for the AI Conclave 2026 Industry Panel Discussions.</p>{confirmation && <><RegistrationTicket registration={confirmation} /><dl className="confirmation-summary"><dt>Name</dt><dd>{confirmation.name}</dd><dt>Email</dt><dd>{confirmation.email}</dd><dt>Participant</dt><dd>{confirmation.participantType}</dd><dt>Panel</dt><dd>{confirmation.panelSelection}</dd></dl></>}<div className="confirmation-actions">{confirmation && <TicketDownloadButton registration={confirmation} />}<a className="btn btn-primary" href={PATHS.myRegistration}>View My Registrations <span className="btn-arrow" aria-hidden="true">→</span></a><button type="button" className="btn btn-outline" onClick={reset}>Register for Another Panel</button></div></div>
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

function drawTicketValue(context, label, value, x, y, width) {
  context.fillStyle = '#6b6b65'
  context.font = '600 17px monospace'
  context.fillText(label.toUpperCase(), x, y)
  context.fillStyle = '#0a0a0a'
  context.font = '700 27px Arial, sans-serif'
  wrapCanvasText(context, value, width, 1).forEach((line) => context.fillText(line, x, y + 36))
}

function downloadRegistrationTicket(registration) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.width = 1600
    canvas.height = 570
    const context = canvas.getContext('2d')
    if (!context) {
      reject(new Error('Ticket download is not supported in this browser.'))
      return
    }

    context.fillStyle = '#f1f1ed'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#fff'
    context.fillRect(40, 40, 1520, 490)
    context.strokeStyle = '#0a0a0a'
    context.lineWidth = 3
    context.strokeRect(40, 40, 1520, 490)
    context.fillStyle = '#ff1e1e'
    context.fillRect(40, 40, 1520, 16)

    context.fillStyle = '#ff1e1e'
    context.fillRect(88, 86, 68, 68)
    context.fillStyle = '#0a0a0a'
    context.font = '700 23px monospace'
    context.fillText('AC', 105, 129)
    context.font = '700 28px monospace'
    context.fillText('AI CONCLAVE 2026', 184, 112)
    context.fillStyle = '#6b6b65'
    context.font = '600 17px monospace'
    context.fillText('AJCE · KANJIRAPPALLY', 184, 143)

    context.fillStyle = '#6b6b65'
    context.font = '600 18px monospace'
    context.fillText(`${PANEL_EVENT.day.toUpperCase()} · ${PANEL_EVENT.name.toUpperCase()}`, 88, 205)
    context.fillStyle = '#0a0a0a'
    context.font = '700 57px monospace'
    context.fillText(registration.panelSelection || PANEL_EVENT.name, 88, 270)
    context.fillStyle = '#1a6b3c'
    context.fillRect(88, 295, 1020, 5)

    drawTicketValue(context, 'Name', registration.name, 88, 342, 410)
    drawTicketValue(context, 'Participant type', registration.participantType, 540, 342, 250)
    drawTicketValue(context, 'Event date', PANEL_EVENT.date, 825, 342, 300)
    drawTicketValue(context, 'Organisation', registration.organisation, 88, 435, 1020)

    context.fillStyle = '#f5f6f3'
    context.fillRect(1200, 56, 360, 474)
    context.strokeStyle = '#0a0a0a'
    context.lineWidth = 2
    context.setLineDash([10, 10])
    context.beginPath()
    context.moveTo(1200, 56)
    context.lineTo(1200, 530)
    context.stroke()
    context.setLineDash([])
    context.fillStyle = '#fff'
    for (const y of [78, 508]) {
      context.beginPath()
      context.arc(1200, y, 18, 0, Math.PI * 2)
      context.fill()
    }
    context.fillStyle = '#1a6b3c'
    context.font = '700 18px monospace'
    context.fillText('ADMIT ONE', 1260, 110)
    context.fillStyle = '#0a0a0a'
    context.font = '700 58px monospace'
    context.fillText('15 SEP', 1255, 185)
    context.fillStyle = '#1a6b3c'
    context.fillRect(1245, 220, 250, 5)
    context.font = '700 14px monospace'
    context.fillText('VENUE', 1245, 252)
    context.fillStyle = '#0a0a0a'
    context.font = '700 25px monospace'
    context.fillText('AMAL JYOTHI', 1245, 286)
    context.font = '700 13px monospace'
    context.fillText('COLLEGE OF ENGINEERING', 1245, 309)
    context.fillStyle = '#6b6b65'
    context.font = '700 11px monospace'
    context.fillText('AUTONOMOUS', 1245, 330)
    context.font = '600 11px monospace'
    context.fillText('KOOVAPPALLY · KANJIRAPPALLY', 1245, 359)
    context.fillText('KOTTAYAM DISTRICT', 1245, 379)
    context.font = '600 17px monospace'
    context.fillText(ticketReference(registration), 1260, 425)
    context.fillStyle = '#ff1e1e'
    context.fillRect(1260, 452, 230, 8)

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

function TicketDownloadButton({ registration, compact = false }) {
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
  return <div className={`ticket-download-control${compact ? ' is-compact' : ''}`}><button type="button" className={compact ? 'registration-download-button' : 'btn btn-primary ticket-download-button'} onClick={download} disabled={state === 'working'}>{state === 'working' ? 'Preparing...' : <>Download ticket <span aria-hidden="true">↓</span></>}</button>{state === 'error' && <small role="alert">Ticket download failed. Please try again.</small>}</div>
}

function RegistrationTicket({ registration }) {
  return <section className="event-ticket" aria-label={`Ticket for ${registration.panelSelection}`}>
    <div className="event-ticket-main">
      <header className="event-ticket-header"><div className="event-ticket-brand"><span>AC</span><div><strong>AI CONCLAVE 2026</strong><small>AJCE · Kanjirappally</small></div></div><span className="event-ticket-status"><i aria-hidden="true"></i> Registered</span></header>
      <div className="event-ticket-title"><small>{PANEL_EVENT.day} · {PANEL_EVENT.name}</small><h3>{registration.panelSelection}</h3></div>
      <dl className="event-ticket-grid"><div><dt>Name</dt><dd>{registration.name}</dd></div><div><dt>Participant type</dt><dd>{registration.participantType}</dd></div><div><dt>Event date</dt><dd>{PANEL_EVENT.date}</dd></div><div className="event-ticket-organisation"><dt>Organisation</dt><dd>{registration.organisation}</dd></div></dl>
    </div>
    <aside className="event-ticket-stub" aria-label="Ticket stub"><small>Admit one</small><strong>15 SEP</strong><div className="event-ticket-pass-mark"><small>Venue</small><strong>Amal Jyothi</strong><b>College of Engineering</b><span>Autonomous</span><address>Koovappally · Kanjirappally<br />Kottayam district</address></div><code>{ticketReference(registration)}</code></aside>
  </section>
}

function RegistrationDetail({ registration }) {
  const [expanded, setExpanded] = useState(false)
  const isHackathon = registration.type === 'Hackathon'
  const panelDetails = [
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
  const hackathonDetails = [
    ['Name', registration.name],
    ['Email', registration.email],
    ['Phone', registration.phone],
    ['Participant type', registration.participantType],
    ['Organisation', registration.organisation],
    ['Track', registration.tracks?.join(', ')],
    ['Challenge sector', registration.challengeArea],
    ['Subcategory', registration.subcategory],
    ['Problem area', registration.problemArea],
    ['Problem statement / idea', registration.ideaSummary],
  ].filter(([, value]) => value)
  const details = isHackathon ? hackathonDetails : panelDetails
  const title = isHackathon ? `${registration.challengeArea} · ${registration.subcategory}` : registration.panelSelection
  const submitted = registration.createdAt ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(registration.createdAt)) : ''
  return <article className={`registration-record${expanded ? ' is-open' : ''}`}>
    <header className="registration-record-summary">
      <button type="button" className="registration-summary-main" onClick={() => setExpanded((current) => !current)} aria-expanded={expanded}><span className="stamp">{registration.type}</span><h2>{title}</h2><p>Submitted {submitted}</p></button>
      <div className="registration-record-action"><span className="registration-status"><i aria-hidden="true"></i>{registration.status}</span><div className="registration-summary-controls">{!isHackathon && <TicketDownloadButton registration={registration} compact />}<button type="button" className="registration-toggle" onClick={() => setExpanded((current) => !current)} aria-expanded={expanded}>{expanded ? 'Hide details' : 'View details'}<i aria-hidden="true"></i></button></div></div>
    </header>
    {expanded && <div className="registration-record-body">{!isHackathon && <RegistrationTicket registration={registration} />}<dl className="registration-record-grid">{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></div>}
  </article>
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

  if (state.status === 'signed-out' && !GOOGLE_SIGN_IN_ENABLED) return <main id="main"><section className="page-header"><div className="container"><p className="eyebrow">Development mode</p><h1 className="section-heading">My registrations is unavailable.</h1><p className="section-lede">Google sign-in is disabled on the dev branch, so registrations cannot be linked to or retrieved for an account.</p></div></section><section className="section"><div className="container register-layout"><a className="btn btn-primary" href={PATHS.register}>Open registration forms <span aria-hidden="true">→</span></a></div></section></main>
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
          : page === 'register-hackathon' ? <RegistrationGate>{(participant) => HACKATHON_REGISTRATION_OPEN ? <HackathonRegisterPage participant={participant} /> : <HackathonRegistrationClosedPage />}</RegistrationGate>
            : page === 'register-panel' ? <RegistrationGate>{(participant) => <PanelRegisterPage participant={participant} />}</RegistrationGate>
              : page === 'my-registration' ? <MyRegistrationPage />
                : <HomePage />
  return <><IntroScreen /><Shell active={page}>{content}</Shell></>
}

export default App
