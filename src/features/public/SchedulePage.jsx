import { useState } from 'react'
import { HACKATHON_EVENT, PANEL_EVENT } from '../../config/events.js'

function ScheduleTable({ day }) {
  const rows = day === 1
    ? [
        ['9:00 AM', 'Registration', 'Participant check-in'],
        ['9:30 AM', 'Inauguration', 'Inauguration by Shri Dean Kuriakose'],
        ['10:00 AM', 'Panel Discussions', 'AI Across Sectors: Agriculture, Healthcare & Education'],
        ['12:30 PM', 'Lunch Break', 'Morning panel sessions conclude'],
        ['1:30 PM', 'Workshop Registration', 'Registration for afternoon industry workshops'],
        ['2:00 PM – 4:40 PM', 'Industry Workshops', 'Parallel workshops open to internal and external students'],
      ]
    : [
        ['8:30 AM', 'Registration', 'Hackathon registration and team verification'],
        ['9:30 AM – 2:30 PM', 'Hackathon', 'Technical and Non-Technical tracks for school & college students. Prize pool ₹1,00,000'],
        ['2:30 PM – 4:30 PM', 'Project Evaluation', 'Project presentation and assessment by external evaluators'],
        ['5:00 PM', 'Closing Ceremony', 'Closing ceremony and announcement of results'],
      ]
  return <table className="schedule-table"><caption>Day {day} schedule</caption><thead><tr><th scope="col">Time</th><th scope="col">Event</th><th scope="col">Details</th></tr></thead><tbody>{rows.map(([time, event, details]) => <tr key={`${time}-${event}`}><td className="schedule-time mono-figure">{time}</td><td className="schedule-event">{event}</td><td className="schedule-desc">{details}</td></tr>)}</tbody></table>
}

function PanelTracks() {
  const panels = [
    ['panel-agriculture', 'stamp-agri', 'Agriculture', [['Mr. Alexy Binu', 'CEO, AetherSphere'], ['Dr. Berin Pathrose', 'Director of Planning, Kerala Agricultural University'], ['Dr. Leena Mary', 'Professor, IIIT Kottayam; Former Principal, Government Engineering College, Kozhikode']]],
    ['panel-health', 'stamp-health', 'Healthcare', [['Mr. Vivek V. George', 'CEO, Trivia Innovations'], ['Dr. Thomas Paul', 'Chief Orthodontist and Cosmetic Dental Surgeon'], ['Mr. Robin Tomy', 'Technology Innovator and Social Innovation Leader, TCS and K-DISC']]],
    ['panel-education', 'stamp-edu', 'Education / Academic', [['Dr. M. V. Rajesh', 'Director, IHRD'], ['Dr. Shailesh S.', 'Principal AI Architect, Laennec AI India Pvt. Ltd.'], ['Dr. Ajith Kumar R.', 'Director, Centre for Digital Innovation and Product Development'], ['Dr. Sunil T. T.', 'Director, ICFOSS']]],
  ]
  return <div className="panel-grid">{panels.map(([id, stamp, name, speakers]) => <section id={id} className="panel-track" aria-labelledby={`${id}-heading`} key={id}><div className="panel-track-head"><span className={`stamp ${stamp}`}>{name}</span><h3 id={`${id}-heading`}>{name}</h3></div><ul className="speaker-list">{speakers.map(([speaker, role]) => <li key={speaker}><span className="speaker-kicker">Expert</span><span className="speaker-name">{speaker}</span><span className="speaker-role">{role}</span></li>)}</ul></section>)}</div>
}

function HackathonProgrammeDetails() {
  return <section id="hackathon-details" className="section programme-detail-section"><div className="container"><div className="section-head"><p className="eyebrow">Day 2 · Student Hackathon</p><h2 className="section-heading">Participation &amp; Evaluation</h2><p className="section-lede">An open five-hour hackathon for internal and external school and college students, followed by project presentation and evaluation.</p></div><div className="programme-detail-grid"><article className="programme-detail-card"><span className="stamp">Team format</span><h3>2–4 students</h3><p>School and college teams will be considered separately. Each team selects one sector: Education, Agriculture or Healthcare.</p></article><article className="programme-detail-card"><span className="stamp">Accepted solutions</span><h3>Technical or non-technical</h3><p>Applications, AI models, hardware, robotics, prototypes, process improvements, service models, strategies and policy ideas are accepted.</p></article><article className="programme-detail-card"><span className="stamp">Project preparation</span><h3>Build before or during the event</h3><p>Teams may prepare projects at home, present completed work, or continue improving it during the five-hour session. No preliminary shortlisting is required.</p></article><article className="programme-detail-card"><span className="stamp">Evaluation</span><h3>External evaluators</h3><p>Teams will present or demonstrate their work from 2:30 PM to 4:30 PM. Assessment may consider relevance, originality, quality, feasibility, impact and presentation.</p></article></div></div></section>
}

export function SchedulePage() {
  const [day, setDay] = useState(() => new URLSearchParams(window.location.search).get('day') === '2' ? 2 : 1)

  const selectDay = (selectedDay) => {
    setDay(selectedDay)
    const url = new URL(window.location.href)
    if (selectedDay === 1) url.searchParams.delete('day')
    else url.searchParams.set('day', String(selectedDay))
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  }

  return <main id="main">
    <section className="page-header"><div className="container"><p className="eyebrow">Programme</p><h1 className="section-heading">Schedule</h1><p className="section-lede">The proposed two-day programme, from registration through the closing ceremony. Speaker and workshop details may be updated after confirmation.</p></div></section>
    <div className="container day-toggle-wrap"><div className="day-toggle" role="tablist" aria-label="Select schedule day"><button type="button" id="day-1-tab" role="tab" className={`day-toggle-btn${day === 1 ? ' is-active' : ''}`} aria-selected={day === 1} aria-controls="day-1-content" tabIndex={day === 1 ? 0 : -1} onClick={() => selectDay(1)}>Day 1</button><button type="button" id="day-2-tab" role="tab" className={`day-toggle-btn${day === 2 ? ' is-active' : ''}`} aria-selected={day === 2} aria-controls="day-2-content" tabIndex={day === 2 ? 0 : -1} onClick={() => selectDay(2)}>Day 2</button></div><span className="day-toggle-status" aria-live="polite">Showing Day {day}</span></div>
    <div key={day} className="schedule-day-content">
      {day === 1 && <div id="day-1-content" role="tabpanel" aria-labelledby="day-1-tab"><section id="schedule-day1" className="section"><div className="container"><div className="section-head"><p className="eyebrow">{PANEL_EVENT.date}</p><h2 className="section-heading">Day 1 <span className="mono-figure">— Inauguration, Panel &amp; Workshops</span></h2></div><ScheduleTable day={1} /></div></section><section id="panel" className="section"><div className="container"><div className="section-head"><p className="eyebrow">{PANEL_EVENT.day} · {PANEL_EVENT.date} · {PANEL_EVENT.time}</p><h2 className="section-heading">Panel Discussion: AI Across Sectors</h2><p className="section-lede">Industry leaders and academic experts come together to discuss how Artificial Intelligence is transforming Kerala's agriculture, healthcare and education sectors. Panellists remain subject to final confirmation.</p></div><PanelTracks /></div></section></div>}
      {day === 2 && <div id="day-2-content" role="tabpanel" aria-labelledby="day-2-tab"><section id="schedule-day2" className="section"><div className="container"><div className="section-head"><p className="eyebrow">{HACKATHON_EVENT.date}</p><h2 className="section-heading">Day 2 <span className="mono-figure">— Hackathon &amp; Closing Ceremony</span></h2></div><ScheduleTable day={2} /></div></section><HackathonProgrammeDetails /></div>}
    </div>
  </main>
}
