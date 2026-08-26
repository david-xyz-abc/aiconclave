import { useEffect, useRef, useState } from 'react'

export function IntroScreen() {
  const [visible, setVisible] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [textLeaving, setTextLeaving] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const screenRef = useRef(null)

  useEffect(() => {
    if (!visible) return undefined
    document.body.classList.add('intro-active')
    const textLeaveTimer = window.setTimeout(() => setTextLeaving(true), 1650)
    const leaveTimer = window.setTimeout(() => setLeaving(true), 2150)
    const finishTimer = window.setTimeout(() => setVisible(false), 3000)
    return () => {
      window.clearTimeout(textLeaveTimer)
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
  return <div ref={screenRef} className={`intro-screen${textLeaving ? ' is-text-leaving' : ''}${leaving ? ' is-leaving' : ''}`} aria-hidden="true" onTransitionEnd={finishExit}>
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
