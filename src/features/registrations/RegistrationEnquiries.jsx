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
  return <section className="registration-enquiry-directory" aria-labelledby="registration-enquiry-title">
    <div className="registration-enquiry-heading"><span className="eyebrow">Need help?</span><h2 id="registration-enquiry-title">Registration enquiries</h2></div>
    <div className="registration-enquiry-list">
      {Object.keys(registrationEnquiries).map((eventKey) => <RegistrationEnquiry eventKey={eventKey} compact key={eventKey} />)}
    </div>
  </section>
}
