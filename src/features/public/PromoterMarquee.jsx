const promoterLogos = Object.freeze([
  { name: 'Kerala Vision', src: '/partners/kerala-vision.jpg', width: 250, height: 250 },
  { name: 'Tata Consultancy Services', src: '/partners/tcs-horizontal.png', width: 708, height: 237 },
  { name: 'Cloud Innovations', src: '/partners/cloud-innovations.jpg', width: 531, height: 376 },
  { name: 'Maker Village', src: '/partners/maker-village.png', width: 1022, height: 449 },
  { name: 'UST', src: '/partners/ust.jpg', width: 600, height: 450 },
  { name: 'ICFOSS', src: '/partners/icfoss.jpg', width: 474, height: 249 },
])

function LogoGroup({ duplicate = false }) {
  return <div className="promoter-logo-group" aria-hidden={duplicate || undefined}>
    {promoterLogos.map((logo) => <div className="promoter-logo-card" key={logo.name}>
      <img src={logo.src} alt={duplicate ? '' : logo.name} width={logo.width} height={logo.height} loading="lazy" decoding="async" />
    </div>)}
  </div>
}

export function PromoterMarquee() {
  return <aside className="promoter-marquee" aria-labelledby="promoter-marquee-title">
    <div className="container promoter-marquee-heading">
      <p className="eyebrow">Event network</p>
      <h2 id="promoter-marquee-title">Promoters &amp; collaborators</h2>
    </div>
    <div className="promoter-marquee-viewport">
      <div className="promoter-marquee-track">
        <LogoGroup />
        <LogoGroup duplicate />
      </div>
    </div>
  </aside>
}
