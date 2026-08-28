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
  const contactKeys = Object.keys(registrationEnquiries)

  return <section className="registration-enquiry-directory" aria-label="Registration enquiries">
    <details className="registration-enquiry-desktop">
      <summary><span className="registration-enquiry-heading"><span className="eyebrow">Need help?</span><h2>Registration enquiries</h2></span><span className="registration-enquiry-toggle"><span className="when-closed">View contacts</span><span className="when-open">Hide contacts</span><i aria-hidden="true"></i></span></summary>
      <div className="registration-enquiry-list">
        {contactKeys.map((eventKey) => <RegistrationEnquiry eventKey={eventKey} compact key={eventKey} />)}
      </div>
    </details>
    <details className="registration-enquiry-mobile">
      <summary><span className="registration-enquiry-heading"><span className="eyebrow">Need help?</span><h2>Registration enquiries</h2></span><span className="registration-enquiry-toggle"><span className="when-closed">View contacts</span><span className="when-open">Hide contacts</span><i aria-hidden="true"></i></span></summary>
      <div className="registration-enquiry-list">
        {contactKeys.map((eventKey) => <RegistrationEnquiry eventKey={eventKey} compact key={eventKey} />)}
      </div>
    </details>
  </section>
}
