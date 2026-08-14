import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  type MutableRefObject,
} from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import './App.css'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const WebGLStage = lazy(() => import('./components/WebGLStage'))

type ScrollProgressRef = MutableRefObject<number>

const sectors = [
  {
    number: '01',
    name: 'Agriculture',
    copy: 'From climate intelligence to precision farming, practical AI for the systems that sustain us.',
  },
  {
    number: '02',
    name: 'Health',
    copy: 'Responsible tools that support clinicians, improve access and strengthen public health.',
  },
  {
    number: '03',
    name: 'Education',
    copy: 'New learning systems designed around teachers, students and Kerala’s educational future.',
  },
]

const schedule = [
  { day: 'Day 1', time: '09:00', title: 'Registration' },
  { day: 'Day 1', time: '10:00', title: 'Inaugural Function' },
  { day: 'Day 1', time: '10:30', title: 'AI Across Sectors' },
  { day: 'Day 1', time: '13:00', title: 'Parallel Workshops' },
  { day: 'Day 2', time: '09:30', title: 'Hackathon' },
  { day: 'Day 2', time: '14:30', title: 'Evaluation' },
  { day: 'Day 2', time: '16:00', title: 'Valedictory Function' },
]

function useSmoothScroll(progress: ScrollProgressRef) {
  useEffect(() => {
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    const updateProgress = () => {
      const maximum =
        document.documentElement.scrollHeight - window.innerHeight
      progress.current = maximum > 0 ? window.scrollY / maximum : 0
    }

    if (reducedMotion) {
      updateProgress()
      window.addEventListener('scroll', updateProgress, { passive: true })
      return () => window.removeEventListener('scroll', updateProgress)
    }

    const lenis = new Lenis({
      duration: 1.15,
      smoothWheel: true,
      touchMultiplier: 1.1,
    })
    let frameId = 0

    const frame = (time: number) => {
      lenis.raf(time)
      updateProgress()
      ScrollTrigger.update()
      frameId = requestAnimationFrame(frame)
    }

    frameId = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(frameId)
      lenis.destroy()
    }
  }, [progress])
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M14 7l5 5-5 5" />
    </svg>
  )
}

function App() {
  const app = useRef<HTMLDivElement>(null)
  const scrollProgress = useRef(0)

  useSmoothScroll(scrollProgress)

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      gsap.from('[data-intro]', {
        yPercent: 115,
        opacity: 0,
        duration: 1.25,
        stagger: 0.08,
        ease: 'power4.out',
        delay: 0.15,
      })

      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((element) => {
        gsap.from(element, {
          y: 70,
          opacity: 0,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: element,
            start: 'top 84%',
            once: true,
          },
        })
      })
    },
    { scope: app },
  )

  return (
    <div className="app" ref={app}>
      <a className="skip-link" href="#about">
        Skip to content
      </a>

      <header className="site-header">
        <a className="brand" href="#top" aria-label="AI Conclave home">
          <span>AJCE</span>
          <i />
        </a>
        <nav aria-label="Primary navigation">
          <a href="#about">About</a>
          <a href="#sectors">Sectors</a>
          <a href="#schedule">Schedule</a>
          <a href="#panel">Panel</a>
        </nav>
        <a className="header-cta" href="#schedule">
          Explore <ArrowIcon />
        </a>
      </header>

      <div className="scene-shell" aria-hidden="true">
        <Suspense fallback={<div className="scene-fallback" />}>
          <WebGLStage progress={scrollProgress} />
        </Suspense>
      </div>

      <main>
        <section className="hero-section" id="top" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow clip-line">
              <span data-intro>Two days · Three sectors · One dialogue</span>
            </p>
            <h1 id="hero-title" aria-label="AI Conclave 2026">
              <span className="clip-line hero-line">
                <span data-intro>AI Conclave</span>
              </span>
              <span className="clip-line hero-year">
                <span data-intro>2026</span>
              </span>
            </h1>
            <div className="hero-meta" data-intro>
              <p>Intelligence in action</p>
              <p>Kerala · AJCE</p>
            </div>
            <p className="hero-description" data-intro>
              Artificial Intelligence across Agriculture, Health and Education.
              Built around real dialogue and ground-level problems.
            </p>
            <a className="primary-cta" href="#about" data-intro>
              Explore the conclave <ArrowIcon />
            </a>
          </div>

          <div className="scroll-cue" aria-hidden="true">
            <span />
            Scroll to discover
          </div>
        </section>

        <section className="chapter about-section" id="about">
          <div className="section-index" data-reveal>
            01 / About
          </div>
          <div className="about-copy" data-reveal>
            <p className="kicker">A shared intelligence</p>
            <h2>Not another one-way technology conference.</h2>
            <p>
              AI Conclave 2026 brings practitioners, researchers, policymakers
              and students together to examine how AI is transforming three
              sectors central to Kerala’s economy and society.
            </p>
          </div>
          <div className="signal-label" aria-hidden="true">
            <span>Signal active</span>
            <i />
          </div>
        </section>

        <section className="chapter sectors-section" id="sectors">
          <div className="section-heading" data-reveal>
            <div className="section-index">02 / Sectors</div>
            <h2>
              Three systems.<br />One connected future.
            </h2>
          </div>
          <div className="sector-list">
            {sectors.map((sector) => (
              <article className="sector" key={sector.name} data-reveal>
                <span>{sector.number}</span>
                <h3>{sector.name}</h3>
                <p>{sector.copy}</p>
                <ArrowIcon />
              </article>
            ))}
          </div>
        </section>

        <section className="chapter schedule-section" id="schedule">
          <div className="schedule-intro" data-reveal>
            <div className="section-index">03 / Programme</div>
            <p className="kicker">Two days in motion</p>
            <h2>Ideas become conversations. Conversations become action.</h2>
          </div>
          <div className="schedule-list" data-reveal>
            {schedule.map((item) => (
              <div className="schedule-row" key={`${item.day}-${item.time}`}>
                <span>{item.day}</span>
                <time>{item.time}</time>
                <strong>{item.title}</strong>
                <ArrowIcon />
              </div>
            ))}
          </div>
        </section>

        <section className="chapter panel-section" id="panel">
          <div className="panel-card" data-reveal>
            <p className="kicker">Panel discussion</p>
            <h2>AI Across Sectors</h2>
            <p>
              Industry leaders and academic experts explore how artificial
              intelligence is transforming Kerala’s agriculture, healthcare
              and education sectors.
            </p>
            <div className="panel-tags" aria-label="Panel themes">
              <span>Agriculture</span>
              <span>Health</span>
              <span>Education</span>
            </div>
          </div>
          <div className="closing-mark" aria-hidden="true">
            <span>AI</span>
            <span>26</span>
          </div>
        </section>
      </main>

      <footer>
        <span>AI Conclave 2026</span>
        <span>Amal Jyothi College of Engineering</span>
        <a href="#top">Back to top ↑</a>
      </footer>
    </div>
  )
}

export default App
