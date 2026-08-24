import { RegistrationGate } from '../features/auth/AuthComponents.jsx'
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
      return <RegistrationGate>{(participant) => HACKATHON_REGISTRATION_OPEN ? <HackathonRegisterPage participant={participant} /> : <HackathonRegistrationClosedPage />}</RegistrationGate>
    case 'register-panel':
      return <RegistrationGate>{(participant) => <PanelRegisterPage participant={participant} />}</RegistrationGate>
    case 'my-registration': return <MyRegistrationPage />
    default: return <HomePage />
  }
}
