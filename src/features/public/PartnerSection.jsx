import { useId } from 'react'

export function PartnerSection({ eyebrow, title, partners, className = '' }) {
  const titleId = useId()

  const renderPartners = (duplicate = false) => (
    <div
      className="partner-logo-group"
      role={duplicate ? undefined : 'list'}
      aria-hidden={duplicate ? 'true' : undefined}
    >
      {partners.map((partner) => (
        <div className="partner-logo-item" role={duplicate ? undefined : 'listitem'} key={partner.name}>
          <img
            className={`partner-logo ${partner.logoClass ?? ''}`.trim()}
            src={partner.logo}
            alt={duplicate ? '' : `${partner.name} logo`}
            loading="lazy"
            decoding="async"
          />
        </div>
      ))}
    </div>
  )

  return (
    <section className={`section partner-section ${className}`.trim()} aria-labelledby={titleId}>
      <div className="container">
        <header className="partner-section-header" data-reveal>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2 id={titleId} className="section-heading">{title}</h2>
        </header>

        <div className="partner-logo-viewport" data-reveal>
          <div className="partner-logo-track">
            {renderPartners()}
            {renderPartners(true)}
          </div>
        </div>
      </div>
    </section>
  )
}
