import { useEffect, useRef, useState } from 'react'
import { PATHS } from '../../config/routes.js'
import { ApiError, registrationApi } from '../../services/api.js'
import { ParticipantBar } from '../auth/AuthComponents.jsx'
import { RegistrationEnquiry, RegistrationEnquiryDirectory } from './RegistrationEnquiries.jsx'
import { RegistrationTicket, TicketDownloadButton } from './ParticipantPortal.jsx'
import { hasEventRegistration, useExistingRegistrations } from './useExistingRegistrations.js'
import { HACKATHON_REGISTRATION_OPEN, blankTeamMember, hackathonChallengeAreas, hackathonTrackOptions, industrySectors, initialHackathonForm, initialPanelForm, instagramProfileUrl, organisationTypes, panelOptions, participantTypes, validateHackathonForm, validatePanelForm, whatsappGroups } from './registrationConfig.js'

const HACKATHON_REGISTRATION_RULES = [
  'Teams must include 2 to 4 school or college students.',
  'The five-hour session is open to internal and external students.',
  'Each team must select one sector: Agriculture, Education or Healthcare.',
  'Technical and non-technical solutions are accepted.',
  'There is no preliminary idea selection or shortlisting.',
  'Students may prepare projects at home before the event or build them at the venue during the five-hour session.',
  'Power and Wi-Fi will be provided by the college at the venue.',
  'Teams should bring an extension board if their project setup requires one.',
  'Teams must present their work for assessment by external evaluators.',
]

const WORKSHOPS = [
  {
    id: 'roboai-forge',
    title: 'RoboAI Forge - Exploring Robotics & AI',
    organisation: 'Unique World Robotics',
    logo: '/partners/unique-world-robotics.png',
    resourcePeople: 'Anumol P Joy, Robotics Engineer',
    handsOn: true,
    registrationUrl: 'https://e.ajce.in/gi0td2',
  },
  {
    id: 'physical-ai',
    title: 'Physical AI',
    organisation: 'TCS',
    logo: '/partners/tcs-horizontal.png',
    resourcePeople: 'Jason Lenox and Jim Seelan',
    handsOn: true,
    registrationUrl: 'https://e.ajce.in/zvel8s',
  },
  {
    id: 'edge-ai',
    title: 'Edge AI',
    organisation: 'Cloud Innovations',
    logo: '/partners/cloud-innovations.jpg',
    resourcePeople: 'Mr. Prajeesh A, Founder & Chief Executive Officer',
    handsOn: true,
    registrationUrl: 'https://e.ajce.in/3ualai',
  },
  {
    id: 'ai-in-action',
    title: 'AI in Action - How Generative AI and Autonomous Agents Are Transforming Industries',
    organisation: 'UST',
    logo: '/partners/ust.jpg',
    resourcePeople: 'Renjith Paulose',
    handsOn: false,
    registrationUrl: 'https://e.ajce.in/wyqzwn',
  },
  {
    id: 'build-and-ship-ai-products',
    title: 'Build and Ship Products with AI',
    organisation: 'Creator of JioBase',
    banner: '/workshops/sunith-vs-landscape.png',
    resourcePeople: 'Sunith VS (TrueVibeCoder)',
    handsOn: true,
    registrationUrl: 'https://e.ajce.in/b10rxz',
  },
  {
    id: 'agentic-ai-zero-to-one',
    title: 'Agentic AI: From Zero to One',
    organisation: 'AI Engineer and Researcher',
    banner: '/workshops/alosh-denny-landscape.png',
    resourcePeople: 'Alosh Denny',
    handsOn: true,
    registrationUrl: 'https://e.ajce.in/7tn6rb',
  },
]

function FieldError({ id, message }) {
  return message ? <p className="field-error" id={id} role="alert">{message}</p> : null
}

function WhatsAppJoinDialog({ open, eventName, groupUrl, onClose }) {
  const dialogRef = useRef(null)
  const [joined, setJoined] = useState(false)
  const titleId = `whatsapp-${eventName}-title`

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      setJoined(false)
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  const close = () => dialogRef.current?.close()

  return <dialog ref={dialogRef} className="whatsapp-join-dialog" aria-labelledby={titleId} onClose={onClose}>
    <div className="whatsapp-dialog-mark" aria-hidden="true">WA</div>
    <p className="eyebrow">Registration complete</p>
    <h2 id={titleId}>Join the {eventName} WhatsApp group</h2>
    <p>Receive important schedules, announcements and event-day updates in the official participant group.</p>
    <div className="registration-social-actions"><a className="btn whatsapp-join-button" href={groupUrl} target="_blank" rel="noopener noreferrer">Join us on WhatsApp <span aria-hidden="true">↗</span></a><a className="btn instagram-follow-button" href={instagramProfileUrl} target="_blank" rel="noopener noreferrer">Follow us on Instagram <span aria-hidden="true">↗</span></a></div>
    <label className="whatsapp-joined-check"><input type="checkbox" checked={joined} onChange={(event) => setJoined(event.target.checked)} /><span>Yes, I joined the WhatsApp group.</span></label>
    <div className="whatsapp-dialog-actions"><button type="button" className="btn btn-primary" disabled={!joined} onClick={close}>Confirm</button><button type="button" className="btn btn-outline" onClick={close}>Not now</button></div>
  </dialog>
}

function PanelEligibilityDialog({ open, onContinue }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  return <dialog ref={dialogRef} className="panel-eligibility-dialog" aria-labelledby="panel-eligibility-title" onCancel={(event) => event.preventDefault()}>
    <span className="stamp">Industry delegates only</span>
    <h2 id="panel-eligibility-title">Before you register</h2>
    <p>Panel Discussion registration is intended for industry delegates, experts, professionals, educators and researchers from:</p>
    <p className="panel-eligibility-sectors"><strong>Agriculture</strong><span>•</span><strong>Education</strong><span>•</span><strong>Healthcare</strong></p>
    <p className="panel-eligibility-warning">Student registrations are not accepted for this programme.</p>
    <RegistrationEnquiry eventKey="panel" />
    <div className="panel-eligibility-actions"><button type="button" className="btn btn-primary" onClick={onContinue}>I understand — Continue</button><a className="btn btn-outline" href={PATHS.register}>Go back</a></div>
  </dialog>
}

function HackathonInstructionsDialog({ open, onContinue }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  return <dialog ref={dialogRef} className="hackathon-instructions-dialog" aria-labelledby="hackathon-instructions-title" onCancel={(event) => event.preventDefault()}>
    <span className="stamp">Hackathon rules</span>
    <h2 id="hackathon-instructions-title">Before you register</h2>
    <p>Read and understand the participation rules before creating your team.</p>
    <ul>{HACKATHON_REGISTRATION_RULES.map((rule) => <li key={rule}>{rule}</li>)}</ul>
    <RegistrationEnquiry eventKey="hackathon" />
    <div className="hackathon-instructions-actions"><button type="button" className="btn btn-primary" onClick={onContinue}>I understand — Continue</button><a className="btn btn-outline" href={PATHS.register}>Go back</a></div>
  </dialog>
}

function WorkshopRedirectDialog({ workshop, onClose }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (workshop && !dialog.open) dialog.showModal()
    else if (!workshop && dialog.open) dialog.close()
  }, [workshop])

  if (!workshop) return <dialog ref={dialogRef} className="workshop-redirect-dialog" />

  return <dialog ref={dialogRef} className="workshop-redirect-dialog" aria-labelledby="workshop-redirect-title" onClose={onClose}>
    <span className="stamp">Paid workshop</span>
    <h2 id="workshop-redirect-title">Continue to workshop registration?</h2>
    <p>You are registering for <strong>{workshop.title}</strong>{workshop.banner ? <> with <strong>{workshop.resourcePeople}</strong>, {workshop.organisation}.</> : <>, conducted by <strong>{workshop.organisation}</strong>.</>}</p>
    <div className="workshop-redirect-notice"><strong>You will be redirected to the AJCE registration website.</strong><span>This is a paid workshop. Complete the registration and payment details on the college website.</span></div>
    <RegistrationEnquiry eventKey="workshop" />
    <div className="workshop-redirect-actions"><a className="btn btn-primary" href={workshop.registrationUrl} rel="noopener noreferrer">Continue to Registration <span aria-hidden="true">↗</span></a><button type="button" className="btn btn-outline" onClick={() => dialogRef.current?.close()}>Cancel</button></div>
  </dialog>
}

function RegistrationEligibilityError({ message, onRetry }) {
  return <main id="main"><section className="section"><div className="container register-layout"><div className="account-error account-error-page" role="alert"><h1>Registration status could not be checked.</h1><p>{message}</p><button type="button" className="btn btn-outline" onClick={onRetry}>Try again</button></div></div></section></main>
}

function AlreadyRegisteredPage({ eventName }) {
  const isHackathon = eventName === 'Hackathon'
  return <main id="main">
    <section className={`page-header ${isHackathon ? 'hackathon-register-header' : 'panel-register-header'}`}><div className="container"><a className="back-link" href={PATHS.register}>← All registrations</a><p className="eyebrow">{isHackathon ? 'Day 2 · Hackathon' : 'Industry Panel Discussions'}</p><h1 className="section-heading">{eventName} Registration</h1><p className="panel-theme-line">Agriculture <span>•</span> {isHackathon ? 'Healthcare' : 'Education'} <span>•</span> {isHackathon ? 'Education' : 'Healthcare'}</p><p className="section-lede">{isHackathon ? 'Team registration for school and college students presenting technical or non-technical solutions.' : 'Industry panel discussions for delegates, experts, professionals, educators and researchers.'}</p></div></section>
    <section className="section"><div className="container register-layout"><div className="registration-closed-notice registration-complete-notice"><span className="stamp">Registration received</span><h2>You are already registered.</h2><p>Your {eventName.toLowerCase()} entry is safely recorded. Only one registration is allowed for this event, so the form is no longer available for this account.</p><div className="confirmation-actions"><a className="btn btn-primary" href={PATHS.myRegistration}>View My Registration <span aria-hidden="true">→</span></a><a className="btn btn-outline" href={PATHS.register}>Choose another event</a></div></div></div></section>
  </main>
}

export function RegistrationChoicePage({ participant, onSignOut, signingOut }) {
  const [registrationState, retryRegistrationCheck] = useExistingRegistrations(participant)
  const [selectedWorkshop, setSelectedWorkshop] = useState(null)
  const panelRegistered = hasEventRegistration(registrationState.registrations, 'panel')
  const hackathonRegistered = hasEventRegistration(registrationState.registrations, 'hackathon')
  const panelRegistration = registrationState.registrations.find(({ type }) => type === 'Panel Discussion')
  const hackathonRegistration = registrationState.registrations.find(({ type }) => type === 'Hackathon Team' || type === 'Hackathon')

  if (registrationState.status === 'error') return <RegistrationEligibilityError message={registrationState.error} onRetry={retryRegistrationCheck} />

  return <main id="main">
    <section className="page-header"><div className="container"><p className="eyebrow">Registration</p><h1 className="section-heading">Choose your experience</h1><p className="section-lede">Start with Day 1 panel discussions or register for the Day 2 hackathon.</p></div></section>
    <section className="section"><div className="container"><ParticipantBar participant={participant} onSignOut={onSignOut} signingOut={signingOut} /><RegistrationEnquiryDirectory /><div className="registration-choice-grid">
      {panelRegistered ? <article className="registration-choice registration-choice-panel is-already-registered is-registration-status" data-reveal><span className="choice-number" aria-hidden="true">01</span><span className="stamp">Day 1 · Industry Panels</span><h2>Panel Discussion Registration</h2><p>For industry delegates, experts, professionals, educators and researchers attending the Agriculture, Education or Healthcare panels.</p><div className="registered-event-preview"><strong>Panel entry</strong><p>{panelRegistration?.panelSelection || 'Your panel registration has been received.'}</p></div><div className="registration-choice-registered-row"><span className="registration-state-badge"><i aria-hidden="true"></i> Already registered</span><a href={PATHS.myRegistration}>View registration <span aria-hidden="true">→</span></a></div></article> : <a className="registration-choice registration-choice-panel" href={PATHS.registerPanel} data-reveal><span className="choice-number" aria-hidden="true">01</span><span className="stamp">Day 1 · Industry Panels</span><h2>Panel Discussion Registration</h2><p>For industry delegates, experts, professionals, educators and researchers attending the Agriculture, Education or Healthcare panels.</p><span className="choice-action">{registrationState.status === 'loading' ? 'Checking registration…' : 'Register for Panel Discussion'} <span aria-hidden="true">→</span></span></a>}
      {hackathonRegistered ? <article className="registration-choice registration-choice-hackathon is-already-registered is-registration-status" data-reveal><span className="choice-number" aria-hidden="true">02</span><span className="stamp">Day 2 · Hackathon</span><h2>Hackathon Registration</h2><p>For school and college students joining either the Technical or Non-Technical track.</p><div className="registered-event-preview"><strong>{hackathonRegistration?.teamName ? `Team · ${hackathonRegistration.teamName}` : 'Hackathon entry'}</strong><p>{hackathonRegistration?.sectorTrack ? `${hackathonRegistration.sectorTrack} · ${hackathonRegistration.solutionType}` : 'Your hackathon registration has been received.'}</p></div><div className="registration-choice-registered-row"><span className="registration-state-badge"><i aria-hidden="true"></i> Already registered</span><a href={PATHS.myRegistration}>View registration <span aria-hidden="true">→</span></a></div></article> : HACKATHON_REGISTRATION_OPEN ? <a className="registration-choice registration-choice-hackathon" href={PATHS.registerHackathon} data-reveal><span className="choice-number" aria-hidden="true">02</span><span className="stamp">Day 2 · Hackathon</span><h2>Hackathon Registration</h2><p>For school and college students joining either the Technical or Non-Technical track.</p><div className="hackathon-instruction-preview"><strong>Before you apply</strong><p>Read the hackathon instructions carefully before applying. Make sure you understand and meet every eligibility criterion and participation requirement.</p></div><span className="choice-action">Register for Hackathon <span aria-hidden="true">→</span></span></a> : <div className="registration-choice registration-choice-hackathon is-registration-closed" aria-disabled="true" data-reveal><span className="choice-number" aria-hidden="true">02</span><span className="stamp">Day 2 · Hackathon</span><h2>Hackathon Registration</h2><p>For school and college students joining the Technical or Non-Technical hackathon.</p><span className="choice-action choice-action-disabled">Registration Not Started</span><div className="registration-closed-layer"><span className="closed-status"><i aria-hidden="true"></i> Registration update</span><strong>Opening Soon</strong><small>Hackathon registration has not started yet.</small></div></div>}
    </div>
    <section className="workshop-registration-section" aria-label="Workshop registrations">
      <div className="workshop-registration-grid">{WORKSHOPS.map((workshop, index) => <article className="workshop-registration-card" key={workshop.id}>
        <header><span className="workshop-number">Workshop {String(index + 1).padStart(2, '0')}</span><div className="workshop-badges"><span>Paid Workshop</span>{workshop.handsOn && <strong>Hands-on</strong>}</div></header>
        {workshop.banner
          ? <div className="workshop-poster"><img src={workshop.banner} alt={`${workshop.title} workshop poster featuring ${workshop.resourcePeople}`} loading="lazy" decoding="async" /></div>
          : <div className="workshop-organisation"><img src={workshop.logo} alt={`${workshop.organisation} logo`} loading="lazy" decoding="async" /><div><small>Conducted by</small><strong>{workshop.organisation}</strong></div></div>}
        <h3>{workshop.title}</h3>
        {!workshop.banner && <div className="workshop-resource"><small>Resource {workshop.resourcePeople.includes(' and ') ? 'people' : 'person'}</small><span>{workshop.resourcePeople}</span></div>}
        <button type="button" className="btn btn-primary workshop-register-button" onClick={() => setSelectedWorkshop(workshop)}>Register for Workshop <span aria-hidden="true">→</span></button>
      </article>)}</div>
    </section>
    </div></section>
    <WorkshopRedirectDialog workshop={selectedWorkshop} onClose={() => setSelectedWorkshop(null)} />
  </main>
}

export function HackathonRegisterPage({ participant }) {
  const [registrationState, retryRegistrationCheck] = useExistingRegistrations(participant)
  const freshHackathonForm = () => ({
    ...initialHackathonForm,
    members: [
      { ...blankTeamMember(), fullName: participant.displayName || '', email: participant.email || '' },
      blankTeamMember(),
    ],
  })
  const [form, setForm] = useState(freshHackathonForm)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [whatsappPromptOpen, setWhatsappPromptOpen] = useState(false)
  const [instructionsPromptOpen, setInstructionsPromptOpen] = useState(true)
  const teamNameRef = useRef(null)

  if (registrationState.status === 'loading') return <main id="main"><section className="account-loading"><span className="account-spinner" aria-hidden="true"></span><p>Checking hackathon registration…</p></section></main>
  if (registrationState.status === 'error') return <RegistrationEligibilityError message={registrationState.error} onRetry={retryRegistrationCheck} />
  if (hasEventRegistration(registrationState.registrations, 'hackathon')) return <AlreadyRegisteredPage eventName="Hackathon" />

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

  const updateMember = (index, field, value) => {
    const normalizedValue = field === 'phone' ? value.replace(/\D/g, '').slice(0, 10) : value
    setForm((current) => ({ ...current, members: current.members.map((member, memberIndex) => memberIndex === index ? { ...member, [field]: normalizedValue } : member) }))
    const errorKey = `members.${index}.${field}`
    setFieldErrors((current) => {
      if (!current[errorKey]) return current
      const next = { ...current }
      delete next[errorKey]
      return next
    })
  }

  const addMember = () => {
    if (form.members.length >= 4) return
    setForm((current) => ({ ...current, members: [...current.members, blankTeamMember()] }))
    setFieldErrors((current) => {
      const next = { ...current }
      delete next.members
      return next
    })
  }

  const removeMember = (index) => {
    if (index < 2 || form.members.length <= 2) return
    setForm((current) => ({ ...current, members: current.members.filter((_, memberIndex) => memberIndex !== index) }))
    setFieldErrors({})
  }

  const focusFirstInvalidField = (errors) => {
    const firstName = Object.keys(errors)[0]
    window.setTimeout(() => document.getElementsByName(firstName)[0]?.focus(), 0)
  }

  const submit = async (event) => {
    event.preventDefault()
    if (submitting) return
    const validationErrors = validateHackathonForm(form)
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
      const data = await registrationApi.submit('hackathon', form)
      setConfirmation(data.registration)
      setSubmitted(true)
      setWhatsappPromptOpen(true)
    } catch (submitError) {
      const serverErrors = submitError instanceof ApiError && submitError.details?.fields && typeof submitError.details.fields === 'object' ? submitError.details.fields : {}
      setFieldErrors(serverErrors)
      setError(submitError.message || 'Network error. Check your connection and try again.')
      if (Object.keys(serverErrors).length) focusFirstInvalidField(serverErrors)
    } finally {
      setSubmitting(false)
    }
  }

  return <main id="main">
    <section className="page-header hackathon-register-header"><div className="container"><a className="back-link" href={PATHS.register}>← All registrations</a><p className="eyebrow">Day 2 · Hackathon</p><h1 className="section-heading">Create your team</h1><p className="panel-theme-line">Agriculture <span>•</span> Healthcare <span>•</span> Education</p><p className="section-lede">Register one team of 2 to 4 internal or external school or college students. The captain completes this form for everyone.</p></div></section>
    <section id="registration-form" className="section"><div className="container register-layout">
      <form id="register-form" className="sectioned-form hackathon-register-form" noValidate hidden={submitted} onSubmit={submit}>
        <div className="hackathon-rules-banner"><strong>Before you apply</strong><p>Read the hackathon instructions carefully. Make sure every student meets the eligibility criteria before submitting the team.</p><ul>{HACKATHON_REGISTRATION_RULES.map((rule) => <li key={rule}>{rule}</li>)}</ul></div>

        <fieldset className="form-section"><legend><span>01</span> Team Setup</legend>
          <div className="team-setup-grid">
            <div className="form-field"><label htmlFor="hackathon-team-name">Team Name *</label><input ref={teamNameRef} id="hackathon-team-name" name="teamName" type="text" maxLength="100" autoComplete="off" required value={form.teamName} onChange={updateField} aria-invalid={Boolean(fieldErrors.teamName)} aria-describedby={fieldErrors.teamName ? 'hackathon-team-name-error' : 'hackathon-team-name-hint'} /><p className="field-hint" id="hackathon-team-name-hint">Team names must be unique.</p><FieldError id="hackathon-team-name-error" message={fieldErrors.teamName} /></div>
            <div className="form-field"><span className="form-legend">Student Category *</span><RadioOptions name="participantCategory" options={['School', 'College']} value={form.participantCategory} onChange={updateField} required invalid={Boolean(fieldErrors.participantCategory)} errorId="hackathon-category-error" /><FieldError id="hackathon-category-error" message={fieldErrors.participantCategory} /></div>
          </div>
        </fieldset>

        <fieldset className="form-section"><legend><span>02</span> Team Members</legend>
          <div className="team-members-heading"><div><strong>{form.members.length} of 4 students</strong><p>The captain is member 1. At least one additional student is required.</p></div>{form.members.length < 4 && <button type="button" className="btn btn-outline add-member-button" onClick={addMember}>+ Add student</button>}</div>
          <FieldError id="hackathon-members-error" message={fieldErrors.members} />
          <div className="team-member-list">{form.members.map((member, index) => {
            const prefix = `members.${index}`
            const isCaptain = index === 0
            const isSchool = form.participantCategory === 'School'
            return <section className="team-member-card" key={index} aria-labelledby={`team-member-${index}-title`}>
              <header><div><span>0{index + 1}</span><h3 id={`team-member-${index}-title`}>{isCaptain ? 'Team Captain' : `Team Member ${index + 1}`}</h3></div>{index >= 2 && <button type="button" className="remove-member-button" onClick={() => removeMember(index)} aria-label={`Remove team member ${index + 1}`}>Remove</button>}</header>
              <div className="team-member-fields">
                <div className="form-field"><label htmlFor={`member-${index}-name`}>Full Name *</label><input id={`member-${index}-name`} name={`${prefix}.fullName`} type="text" autoComplete={isCaptain ? 'name' : 'off'} required value={member.fullName} onChange={(event) => updateMember(index, 'fullName', event.target.value)} aria-invalid={Boolean(fieldErrors[`${prefix}.fullName`])} /><FieldError id={`member-${index}-name-error`} message={fieldErrors[`${prefix}.fullName`]} /></div>
                <div className="form-field"><label htmlFor={`member-${index}-email`}>{isCaptain ? 'Verified Google Email *' : 'Email Address *'}</label><input className={isCaptain ? 'verified-email-input' : undefined} id={`member-${index}-email`} name={`${prefix}.email`} type="email" autoComplete={isCaptain ? 'email' : 'off'} readOnly={isCaptain && !participant.isPreview} required value={member.email} onChange={(event) => updateMember(index, 'email', event.target.value)} aria-invalid={Boolean(fieldErrors[`${prefix}.email`])} /><FieldError id={`member-${index}-email-error`} message={fieldErrors[`${prefix}.email`]} /></div>
                <div className="form-field"><label htmlFor={`member-${index}-phone`}>Phone Number *</label><div className={`india-phone-input${fieldErrors[`${prefix}.phone`] ? ' has-error' : ''}`}><span aria-hidden="true">+91</span><input id={`member-${index}-phone`} name={`${prefix}.phone`} type="tel" inputMode="numeric" maxLength={10} pattern="[0-9]{10}" placeholder="9876543210" required value={member.phone} onChange={(event) => updateMember(index, 'phone', event.target.value)} aria-invalid={Boolean(fieldErrors[`${prefix}.phone`])} /></div><FieldError id={`member-${index}-phone-error`} message={fieldErrors[`${prefix}.phone`]} /></div>
                <div className="form-field"><label htmlFor={`member-${index}-institution`}>{isSchool ? 'School Name *' : form.participantCategory === 'College' ? 'College Name *' : 'Institution Name *'}</label><input id={`member-${index}-institution`} name={`${prefix}.institution`} type="text" required value={member.institution} onChange={(event) => updateMember(index, 'institution', event.target.value)} aria-invalid={Boolean(fieldErrors[`${prefix}.institution`])} /><FieldError id={`member-${index}-institution-error`} message={fieldErrors[`${prefix}.institution`]} /></div>
                {!isSchool && <div className="form-field"><label htmlFor={`member-${index}-course`}>Department / Course *</label><input id={`member-${index}-course`} name={`${prefix}.departmentOrCourse`} type="text" required value={member.departmentOrCourse} onChange={(event) => updateMember(index, 'departmentOrCourse', event.target.value)} aria-invalid={Boolean(fieldErrors[`${prefix}.departmentOrCourse`])} /><FieldError id={`member-${index}-course-error`} message={fieldErrors[`${prefix}.departmentOrCourse`]} /></div>}
                <div className="form-field"><label htmlFor={`member-${index}-year`}>{isSchool ? 'Class / Grade *' : 'Year of Study *'}</label><input id={`member-${index}-year`} name={`${prefix}.yearOrGrade`} type="text" required value={member.yearOrGrade} onChange={(event) => updateMember(index, 'yearOrGrade', event.target.value)} aria-invalid={Boolean(fieldErrors[`${prefix}.yearOrGrade`])} /><FieldError id={`member-${index}-year-error`} message={fieldErrors[`${prefix}.yearOrGrade`]} /></div>
              </div>
            </section>
          })}</div>
        </fieldset>

        <fieldset className="form-section"><legend><span>03</span> Hackathon Entry</legend>
          <div className="form-field"><span className="form-legend">Choose one sector *</span><div className={`challenge-area-options${form.sectorTrack ? ' has-selection' : ''}`} role="radiogroup" aria-invalid={Boolean(fieldErrors.sectorTrack)}>{['Agriculture', 'Healthcare', 'Education'].map((area, index) => <label className={`challenge-area-card challenge-area-${area.toLowerCase()}${form.sectorTrack === area ? ' is-selected' : form.sectorTrack ? ' is-muted' : ''}`} key={area}><input type="radio" name="sectorTrack" value={area} checked={form.sectorTrack === area} onChange={updateField} /><span className="challenge-area-index" aria-hidden="true">0{index + 1}</span><strong>{area}</strong><small>Hackathon sector</small></label>)}</div><FieldError id="hackathon-sector-error" message={fieldErrors.sectorTrack} /></div>
          <div className="form-field"><span className="form-legend">Solution Type *</span><RadioOptions name="solutionType" options={['Technical', 'Non-Technical']} value={form.solutionType} onChange={updateField} required invalid={Boolean(fieldErrors.solutionType)} errorId="hackathon-solution-error" /><FieldError id="hackathon-solution-error" message={fieldErrors.solutionType} /><p className="field-hint">There is no preliminary idea-selection or shortlisting process.</p></div>
        </fieldset>

        <fieldset className="form-section"><legend><span>04</span> Confirmation</legend>
          <label className={`confirmation-check${fieldErrors.informationConfirmed ? ' has-error' : ''}`}><input type="checkbox" name="informationConfirmed" checked={form.informationConfirmed} onChange={updateField} required /><span>I confirm that all team and contact information is accurate. *</span></label><FieldError id="hackathon-confirmation-error" message={fieldErrors.informationConfirmed} />
          <label className={`confirmation-check${fieldErrors.rulesAccepted ? ' has-error' : ''}`}><input type="checkbox" name="rulesAccepted" checked={form.rulesAccepted} onChange={updateField} required /><span>Every listed student has agreed to participate and meets the hackathon criteria. *</span></label><FieldError id="hackathon-rules-error" message={fieldErrors.rulesAccepted} />
          <label className="confirmation-check"><input type="checkbox" name="updatesOptIn" checked={form.updatesOptIn} onChange={updateField} /><span>I agree to receive official hackathon updates.</span></label>
        </fieldset>
        <div className="form-submit-row"><button type="submit" className="btn btn-primary" disabled={submitting} aria-busy={submitting}>{submitting ? 'Creating team…' : <>Submit Team Registration <span aria-hidden="true">→</span></>}</button><p className={`form-error${error ? ' is-visible' : ''}`} role="alert" aria-live="polite">{error}</p></div>
      </form>
      <div className={`confirmation-panel hackathon-confirmation-panel${submitted ? ' is-visible' : ''}`} role="status" aria-live="polite" tabIndex={submitted ? -1 : undefined}><span className="stamp">Team Registration Received</span><h2>Your team is registered.</h2><p>Keep the team code for future reference. The complete registration is available in My registrations.</p>{confirmation && <dl className="confirmation-summary"><dt>Team</dt><dd>{confirmation.teamName}</dd><dt>Team code</dt><dd>{confirmation.teamCode}</dd><dt>Category</dt><dd>{confirmation.participantCategory}</dd><dt>Team size</dt><dd>{confirmation.members.length} students</dd><dt>Entry</dt><dd>{confirmation.sectorTrack} · {confirmation.solutionType}</dd></dl>}<div className="confirmation-actions"><a className="btn whatsapp-join-button" href={whatsappGroups.hackathon} target="_blank" rel="noopener noreferrer">Join WhatsApp Group <span aria-hidden="true">↗</span></a><a className="btn instagram-follow-button" href={instagramProfileUrl} target="_blank" rel="noopener noreferrer">Follow on Instagram <span aria-hidden="true">↗</span></a><a className="btn btn-primary" href={PATHS.myRegistration}>View My Registration <span aria-hidden="true">→</span></a><a className="btn btn-outline" href={PATHS.register}>Back to Registrations</a></div></div>
    </div></section>
    <HackathonInstructionsDialog open={instructionsPromptOpen} onContinue={() => setInstructionsPromptOpen(false)} />
    <WhatsAppJoinDialog open={whatsappPromptOpen} eventName="Hackathon" groupUrl={whatsappGroups.hackathon} onClose={() => { setWhatsappPromptOpen(false); window.setTimeout(() => document.querySelector('.hackathon-confirmation-panel')?.focus(), 0) }} />
  </main>
}

export function HackathonRegistrationClosedPage() {
  return <main id="main"><section className="page-header"><div className="container"><a className="back-link" href={PATHS.register}>← All registrations</a><p className="eyebrow">Day 2 · Hackathon</p><h1 className="section-heading">Hackathon Registration</h1><p className="section-lede">Technical and Non-Technical tracks for school and college students.</p></div></section><section className="section"><div className="container register-layout"><div className="registration-closed-notice"><span className="stamp">Coming Soon</span><h2>Registration has not started.</h2><p>Hackathon registration is temporarily closed. Please check back soon for the opening announcement.</p><a className="btn btn-primary" href={PATHS.registerPanel}>Register for Panel Discussion <span aria-hidden="true">→</span></a></div></div></section></main>
}

function RadioOptions({ name, options, value, onChange, required = false, errorId, invalid = false }) {
  return <div className="radio-options" role="radiogroup" aria-invalid={invalid} aria-describedby={invalid ? errorId : undefined}>{options.map((option) => <label className="radio-option" key={option}><input type="radio" name={name} value={option} checked={value === option} onChange={onChange} required={required} /><span className="radio-option-label">{option}</span><span className="radio-option-check" aria-hidden="true">✓</span></label>)}</div>
}

export function PanelRegisterPage({ participant }) {
  const [registrationState, retryRegistrationCheck] = useExistingRegistrations(participant)
  const freshPanelForm = () => ({ ...initialPanelForm, name: participant.displayName || '', email: participant.email })
  const [form, setForm] = useState(freshPanelForm)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [whatsappPromptOpen, setWhatsappPromptOpen] = useState(false)
  const [eligibilityPromptOpen, setEligibilityPromptOpen] = useState(true)

  if (registrationState.status === 'loading') return <main id="main"><section className="account-loading"><span className="account-spinner" aria-hidden="true"></span><p>Checking panel registration…</p></section></main>
  if (registrationState.status === 'error') return <RegistrationEligibilityError message={registrationState.error} onRetry={retryRegistrationCheck} />
  if (hasEventRegistration(registrationState.registrations, 'panel')) return <AlreadyRegisteredPage eventName="Panel Discussion" />
  const updateField = (event) => {
    const { name, value, type, checked } = event.target
    const normalizedValue = name === 'phone'
      ? value.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '').slice(0, 10)
      : value
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : normalizedValue }))
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
      const data = await registrationApi.submit('panel', form)
      setConfirmation(data.registration || form)
      setSubmitted(true)
      setWhatsappPromptOpen(true)
    } catch (submitError) {
      const serverErrors = submitError instanceof ApiError && submitError.details?.fields && typeof submitError.details.fields === 'object' ? submitError.details.fields : {}
      setFieldErrors(serverErrors)
      setError(submitError.message || 'Network error. Check your connection and try again.')
      if (Object.keys(serverErrors).length) focusFirstInvalidField(serverErrors)
    } finally {
      setSubmitting(false)
    }
  }
  return <main id="main">
    <section className="page-header panel-register-header"><div className="container"><a className="back-link" href={PATHS.register}>← All registrations</a><p className="eyebrow">Industry Panel Discussions</p><h1 className="section-heading">Panel Discussion Registration</h1><p className="panel-theme-line">Agriculture <span>•</span> Education <span>•</span> Healthcare</p><p className="section-lede">Join industry delegates, experts, professionals, educators and researchers to discuss the role and future of AI across key sectors.</p></div></section>
    <section className="section"><div className="container register-layout">
      <form id="panel-register-form" className="sectioned-form" noValidate hidden={submitted} onSubmit={submit}>
        <fieldset className="form-section" data-reveal><legend><span>01</span> Participant Details</legend>
          <div className="panel-participant-details-grid">
            <div className="form-field participant-name"><label htmlFor="panel-name">Full Name *</label><input id="panel-name" name="name" type="text" autoComplete="name" required value={form.name} onChange={updateField} aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? 'panel-name-error' : undefined} /><FieldError id="panel-name-error" message={fieldErrors.name} /></div>
            <div className="form-field participant-email"><label htmlFor="panel-email">{participant.isPreview ? 'Email Address *' : 'Verified Google Email'}</label><input className={participant.isPreview ? undefined : 'verified-email-input'} id="panel-email" name="email" type="email" autoComplete="email" readOnly={!participant.isPreview} required value={form.email} onChange={participant.isPreview ? updateField : undefined} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? 'panel-email-error' : participant.isPreview ? undefined : 'panel-email-hint'} />{!participant.isPreview && <p className="field-hint" id="panel-email-hint">Connected securely through Google Sign-In.</p>}<FieldError id="panel-email-error" message={fieldErrors.email} /></div>
            <div className="form-field participant-phone"><label htmlFor="panel-phone">Phone Number *</label><div className={`india-phone-input${fieldErrors.phone ? ' has-error' : ''}`}><span aria-hidden="true">+91</span><input id="panel-phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} pattern="[0-9]{10}" placeholder="9876543210" required value={form.phone} onChange={updateField} aria-invalid={Boolean(fieldErrors.phone)} aria-describedby={fieldErrors.phone ? 'panel-phone-error' : 'panel-phone-hint'} /></div><p className="field-hint" id="panel-phone-hint">Enter exactly 10 digits after +91.</p><FieldError id="panel-phone-error" message={fieldErrors.phone} /></div>
            <div className="form-field participant-type"><label htmlFor="panel-participant-type">Participant Type *</label><select id="panel-participant-type" name="participantType" required value={form.participantType} onChange={updateField} aria-invalid={Boolean(fieldErrors.participantType)} aria-describedby={fieldErrors.participantType ? 'participant-type-error' : undefined}><option value="" disabled>Select participant type</option>{participantTypes.map((type) => <option value={type} key={type}>{type}</option>)}</select><FieldError id="participant-type-error" message={fieldErrors.participantType} /></div>
            <div className="form-field participant-organisation"><label htmlFor="panel-organisation">College / Institution / Organization *</label><input id="panel-organisation" name="organisation" type="text" autoComplete="organization" required value={form.organisation} onChange={updateField} aria-invalid={Boolean(fieldErrors.organisation)} aria-describedby={fieldErrors.organisation ? 'panel-organisation-error' : undefined} /><FieldError id="panel-organisation-error" message={fieldErrors.organisation} /></div>
            <div className="form-field participant-department"><label htmlFor="panel-department">Department / Branch</label><input id="panel-department" name="department" type="text" value={form.department} onChange={updateField} /></div>
          </div>
        </fieldset>
        <fieldset className="form-section" data-reveal><legend><span>02</span> Panel Selection</legend><div className="form-field"><span className="form-legend">Which panel discussion would you like to attend? *</span><RadioOptions name="panelSelection" options={panelOptions} value={form.panelSelection} onChange={updateField} required invalid={Boolean(fieldErrors.panelSelection)} errorId="panel-selection-error" /><FieldError id="panel-selection-error" message={fieldErrors.panelSelection} /></div><p className="form-note">Select one panel. The Agriculture, Education and Healthcare panel discussions run concurrently.</p></fieldset>
        <fieldset className="form-section" data-reveal><legend><span>03</span> Professional / Delegate Details</legend>
          <div className="form-field"><span className="form-legend">Industry Sector</span><RadioOptions name="industrySector" options={industrySectors} value={form.industrySector} onChange={updateField} /></div>{form.industrySector === 'Other' && <div className="form-field conditional-field"><label htmlFor="industry-other">Please specify industry sector *</label><input id="industry-other" name="industrySectorOther" type="text" required value={form.industrySectorOther} onChange={updateField} aria-invalid={Boolean(fieldErrors.industrySectorOther)} aria-describedby={fieldErrors.industrySectorOther ? 'industry-other-error' : undefined} /><FieldError id="industry-other-error" message={fieldErrors.industrySectorOther} /></div>}
          <div className="form-field"><span className="form-legend">Organization Type</span><RadioOptions name="organisationType" options={organisationTypes} value={form.organisationType} onChange={updateField} /></div>{form.organisationType === 'Other' && <div className="form-field conditional-field"><label htmlFor="organisation-other">Please specify organization type *</label><input id="organisation-other" name="organisationTypeOther" type="text" required value={form.organisationTypeOther} onChange={updateField} aria-invalid={Boolean(fieldErrors.organisationTypeOther)} aria-describedby={fieldErrors.organisationTypeOther ? 'organisation-other-error' : undefined} /><FieldError id="organisation-other-error" message={fieldErrors.organisationTypeOther} /></div>}
        </fieldset>
        <fieldset className="form-section" data-reveal><legend><span>04</span> Confirmation</legend><label className={`confirmation-check${fieldErrors.informationConfirmed ? ' has-error' : ''}`}><input type="checkbox" name="informationConfirmed" checked={form.informationConfirmed} onChange={updateField} required aria-invalid={Boolean(fieldErrors.informationConfirmed)} aria-describedby={fieldErrors.informationConfirmed ? 'confirmation-error' : undefined} /><span>I confirm that the information provided above is accurate. *</span></label><FieldError id="confirmation-error" message={fieldErrors.informationConfirmed} /><label className="confirmation-check"><input type="checkbox" name="updatesOptIn" checked={form.updatesOptIn} onChange={updateField} /><span>I agree to receive official AI Conclave updates regarding the panel discussion.</span></label></fieldset>
        <div className="form-submit-row"><button type="submit" className="btn btn-primary" disabled={submitting} aria-busy={submitting}>{submitting ? 'Submitting…' : <>Submit Panel Registration <span aria-hidden="true">→</span></>}</button><p className={`form-error${error ? ' is-visible' : ''}`} role="alert" aria-live="polite">{error}</p></div>
      </form>
      <div className={`confirmation-panel panel-confirmation-panel${submitted ? ' is-visible' : ''}`} role="status" aria-live="polite" tabIndex={submitted ? -1 : undefined}><span className="stamp">Panel Registration Received</span><h2>Your seat request is recorded.</h2><p>Thanks for registering for the AI Conclave 2026 Industry Panel Discussions.</p>{confirmation && <><RegistrationTicket registration={confirmation} /><dl className="confirmation-summary"><dt>Name</dt><dd>{confirmation.name}</dd><dt>Email</dt><dd>{confirmation.email}</dd><dt>Participant</dt><dd>{confirmation.participantType}</dd><dt>Panel</dt><dd>{confirmation.panelSelection}</dd></dl></>}<div className="confirmation-actions">{confirmation && <TicketDownloadButton registration={confirmation} />}<a className="btn whatsapp-join-button" href={whatsappGroups.panel} target="_blank" rel="noopener noreferrer">Join WhatsApp Group <span aria-hidden="true">↗</span></a><a className="btn instagram-follow-button" href={instagramProfileUrl} target="_blank" rel="noopener noreferrer">Follow on Instagram <span aria-hidden="true">↗</span></a><a className="btn btn-primary" href={PATHS.myRegistration}>View My Registration <span className="btn-arrow" aria-hidden="true">→</span></a><a className="btn btn-outline" href={PATHS.register}>Back to Registrations</a></div></div>
    </div></section>
    <PanelEligibilityDialog open={eligibilityPromptOpen} onContinue={() => setEligibilityPromptOpen(false)} />
    <WhatsAppJoinDialog open={whatsappPromptOpen} eventName="Panel Discussion" groupUrl={whatsappGroups.panel} onClose={() => { setWhatsappPromptOpen(false); window.setTimeout(() => document.querySelector('.panel-confirmation-panel')?.focus(), 0) }} />
  </main>
}
