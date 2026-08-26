import { useEffect, useRef, useState } from 'react'

export function IntroScreen() {
  const [visible, setVisible] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [splitting, setSplitting] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const screenRef = useRef(null)

  useEffect(() => {
    if (!visible) return undefined
    document.body.classList.add('intro-active')
    const mobileIntro = window.matchMedia('(max-width: 620px)').matches
    const splitTimer = mobileIntro ? window.setTimeout(() => setSplitting(true), 1650) : undefined
    const leaveTimer = window.setTimeout(() => setLeaving(true), mobileIntro ? 2020 : 1650)
    const finishTimer = window.setTimeout(() => setVisible(false), mobileIntro ? 2800 : 2500)
    return () => {
      window.clearTimeout(splitTimer)
      window.clearTimeout(leaveTimer)
      window.clearTimeout(finishTimer)
      document.body.classList.remove('intro-active')
    }
  }, [visible])

  const finishExit = (event) => {
    if (!leaving || event.target !== screenRef.current || event.propertyName !== 'transform') return
    setVisible(false)
  }

  if (!visible) return null
  return <div ref={screenRef} className={`intro-screen${splitting ? ' is-splitting' : ''}${leaving ? ' is-leaving' : ''}`} aria-hidden="true" onTransitionEnd={finishExit}>
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
