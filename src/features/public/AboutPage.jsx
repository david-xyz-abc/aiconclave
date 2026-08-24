import { PartnerSection } from './PartnerSection.jsx'

const COMMUNITY_PARTNERS = [
  {
    name: 'Association for Computing Machinery',
    logo: '/partners/community/acm.jpg',
  },
  {
    name: 'uLearn — a GTech Initiative',
    logo: '/partners/community/ulearn.png',
  },
  {
    name: 'IEEE',
    logo: '/partners/community/ieee.png',
  },
  {
    name: 'makerHUB IEDC Amal Jyothi',
    logo: '/partners/community/makerhub-ajce.jpg',
    logoClass: 'partner-logo--square',
  },
]

const ABOUT_CONCLAVE = 'AI Conclave 2026 will be held on 15 and 16 September 2026 at Amal Jyothi College of Engineering. Day 1 includes panel discussions on AI in Agriculture, Healthcare and Education, followed by industry-led workshops. Day 2 features a student hackathon for school and college teams across the same three sectors.'

const ABOUT_ORGANISERS = 'Organised by the AI Club and Student Council of Amal Jyothi College of Engineering, in association with the Departments of Computer Applications, Computer Science & Engineering, Artificial Intelligence & Data Science, Electronics & Communication Engineering, and Electrical & Electronics Engineering.'

export function AboutPage() {
  return (
    <main id="main">
      <section id="about" className="section">
        <div className="container about-grid">
          <div data-reveal><p className="eyebrow">About the Conclave</p><h1 className="section-heading">Panel discussions, workshops and a student hackathon.</h1>
            <p className="section-lede">{ABOUT_CONCLAVE}</p>
            <p className="section-lede">{ABOUT_ORGANISERS}</p>
          </div>
        </div>
      </section>

      <PartnerSection
        title="Community Partners"
        partners={COMMUNITY_PARTNERS}
        className="community-partners"
      />
    </main>
  )
}

