import { useEffect, useState } from 'react'
import { PATHS } from '../../config/routes.js'
import { PANEL_EVENT } from '../../config/events.js'
import { ApiError, authApi, registrationApi } from '../../services/api.js'
import { GOOGLE_SIGN_IN_ENABLED, SignInCard } from '../auth/AuthComponents.jsx'
import { RegistrationEnquiryDirectory } from './RegistrationEnquiries.jsx'

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

export function TicketDownloadButton({ registration, compact = false }) {
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

export function RegistrationTicket({ registration }) {
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
  const isHackathon = registration.type.startsWith('Hackathon')
  const isHackathonTeam = registration.type === 'Hackathon Team'
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
  const teamDetails = [
    ['Team code', registration.teamCode],
    ['Category', registration.participantCategory],
    ['Team size', `${registration.teamSize} students`],
    ['Sector', registration.sectorTrack],
    ['Solution type', registration.solutionType],
  ].filter(([, value]) => value)
  const details = isHackathonTeam ? teamDetails : isHackathon ? hackathonDetails : panelDetails
  const title = isHackathonTeam ? registration.teamName : isHackathon ? `${registration.challengeArea} · ${registration.subcategory}` : registration.panelSelection
  const submitted = registration.createdAt ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(registration.createdAt)) : ''
  return <article className={`registration-record${expanded ? ' is-open' : ''}`}>
    <header className="registration-record-summary">
      <button type="button" className="registration-summary-main" onClick={() => setExpanded((current) => !current)} aria-expanded={expanded}><span className="stamp">{registration.type}</span><h2>{title}</h2><p>Submitted {submitted}</p></button>
      <div className="registration-record-action"><span className="registration-status"><i aria-hidden="true"></i>{registration.status}</span><div className="registration-summary-controls">{!isHackathon && <TicketDownloadButton registration={registration} compact />}<button type="button" className="registration-toggle" onClick={() => setExpanded((current) => !current)} aria-expanded={expanded}>{expanded ? 'Hide details' : 'View details'}<i aria-hidden="true"></i></button></div></div>
    </header>
    {expanded && <div className="registration-record-body">{!isHackathon && <RegistrationTicket registration={registration} />}<dl className="registration-record-grid">{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{isHackathonTeam && <section className="registered-team-members"><div className="registered-team-members-heading"><span className="eyebrow">Team roster</span><h3>Registered students</h3></div><div className="registered-team-member-list">{registration.members.map((member) => <article key={`${registration.id}-${member.memberOrder}`}><header><span>0{member.memberOrder}</span><div><strong>{member.fullName}</strong><small>{member.role}</small></div></header><dl><div><dt>Email</dt><dd><a href={`mailto:${member.email}`}>{member.email}</a></dd></div><div><dt>Phone</dt><dd><a href={`tel:${member.phone}`}>{member.phone}</a></dd></div><div><dt>Institution</dt><dd>{member.institution}</dd></div>{member.departmentOrCourse && <div><dt>Department / course</dt><dd>{member.departmentOrCourse}</dd></div>}<div><dt>{registration.participantCategory === 'School' ? 'Class / grade' : 'Year of study'}</dt><dd>{member.yearOrGrade}</dd></div></dl></article>)}</div></section>}</div>}
  </article>
}

export function MyRegistrationPage() {
  const [refresh, setRefresh] = useState(0)
  const [state, setState] = useState({ status: 'loading', participant: null, registrations: [], error: '' })

  useEffect(() => {
    let active = true
    setState((current) => ({ ...current, status: 'loading', error: '' }))
    registrationApi.listMine().then((data) => {
      if (active) setState({ status: 'ready', participant: data.participant, registrations: data.registrations || [], error: '' })
    }).catch((error) => {
      if (error instanceof ApiError && error.status === 401) {
        if (active) setState({ status: 'signed-out', participant: null, registrations: [], error: '' })
        return
      }
      if (active) setState({ status: 'error', participant: null, registrations: [], error: error.message || 'We could not load your registrations.' })
    })
    return () => { active = false }
  }, [refresh])

  const signOut = async () => {
    try {
      await authApi.logout()
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
    <RegistrationEnquiryDirectory />
    {state.registrations.length ? <div className="registration-records">{state.registrations.map((registration) => <RegistrationDetail registration={registration} key={`${registration.type}-${registration.id}`} />)}</div> : <div className="empty-registration"><span className="stamp">No registrations yet</span><h2>Choose your first event.</h2><p>Once you submit a registration, its complete details will appear here.</p><a className="btn btn-primary" href={PATHS.register}>Choose an event <span aria-hidden="true">→</span></a></div>}
  </div></section></main>
}
