import { RegistrationGate } from '../features/auth/AuthComponents.jsx'
import { useHackathonCapacity } from '../features/registrations/useHackathonCapacity.js'
import { useEffect, useState } from 'react'
import { AboutPage, HomePage, ParticipatePage, SchedulePage } from '../features/public/PublicPages.jsx'
import { HACKATHON_REGISTRATION_OPEN } from '../features/registrations/registrationConfig.js'
import { MyRegistrationPage } from '../features/registrations/ParticipantPortal.jsx'
import { HackathonRegisterPage, HackathonRegistrationClosedPage, PanelRegisterPage, RegistrationChoicePage } from '../features/registrations/RegistrationPages.jsx'

export function AppRouter({ page }) {
  switch (page) {
    case 'about': return <AboutPage />
    case 'schedule': return <SchedulePage />
    case 'participate': return <ParticipatePage />
    case 'register':
      return <RegistrationGate>{(participant, signOut, signingOut) => <RegistrationChoicePage participant={participant} onSignOut={signOut} signingOut={signingOut} />}</RegistrationGate>
    case 'register-hackathon':
      return <HackathonEntry />
    case 'register-panel':
      return <RegistrationGate>{(participant) => <PanelRegisterPage participant={participant} />}</RegistrationGate>
    case 'my-registration': return <MyRegistrationPage />
    default: return <HomePage />
  }
}

function HackathonEntry() {
  const [capacity, retry] = useHackathonCapacity()
  const [admitted, setAdmitted] = useState(false)
  useEffect(() => { if (capacity.open) setAdmitted(true) }, [capacity.open])
  if (!HACKATHON_REGISTRATION_OPEN) return <HackathonRegistrationClosedPage />
  // Keep an already-open form mounted so polling never discards its draft or
  // replaces the confirmation after the final team successfully registers.
  if (admitted) return <RegistrationGate>{participant => <HackathonRegisterPage participant={participant} capacity={capacity} refreshCapacity={retry} />}</RegistrationGate>
  if (capacity.status === 'loading') return <main id="main"><section className="account-loading" role="status">Checking registration availability…</section></main>
  if (capacity.status === 'error') return <main id="main"><section className="section"><div className="container"><p role="alert">Registration status is unavailable.</p><button className="btn btn-outline" onClick={retry}>Try again</button></div></section></main>
  if (!capacity.open) return <HackathonRegistrationClosedPage />
  return <RegistrationGate>{participant => <HackathonRegisterPage participant={participant} capacity={capacity} refreshCapacity={retry} />}</RegistrationGate>
}
