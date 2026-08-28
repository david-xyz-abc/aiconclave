import { useEffect, useState } from 'react'
import { registrationEnquiries } from './registrationConfig.js'

export function RegistrationEnquiry({ eventKey, compact = false }) {
  const contact = registrationEnquiries[eventKey]
  if (!contact) return null

  return <aside className={`registration-enquiry${compact ? ' is-compact' : ''}`} aria-label={contact.label}>
    <div><small>{contact.label}</small><strong>{contact.name}</strong></div>
    <a href={`tel:${contact.phone}`} aria-label={`Call ${contact.name} at ${contact.displayPhone}`}>{contact.displayPhone}</a>
  </aside>
}

export function RegistrationEnquiryDirectory() {
  const [mobileLayout, setMobileLayout] = useState(() => window.matchMedia('(max-width: 820px)').matches)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(max-width: 820px)')
    const updateLayout = () => setMobileLayout(query.matches)
    query.addEventListener('change', updateLayout)
    return () => query.removeEventListener('change', updateLayout)
  }, [])

  return <section className="registration-enquiry-directory" aria-labelledby="registration-enquiry-title">
    <details open={!mobileLayout || mobileOpen} onToggle={(event) => { if (mobileLayout) setMobileOpen(event.currentTarget.open) }}>
      <summary><span className="registration-enquiry-heading"><span className="eyebrow">Need help?</span><h2 id="registration-enquiry-title">Registration enquiries</h2></span><span className="registration-enquiry-toggle"><span className="when-closed">View contacts</span><span className="when-open">Hide contacts</span><i aria-hidden="true"></i></span></summary>
      <div className="registration-enquiry-list">
        {Object.keys(registrationEnquiries).map((eventKey) => <RegistrationEnquiry eventKey={eventKey} compact key={eventKey} />)}
      </div>
    </details>
  </section>
}
