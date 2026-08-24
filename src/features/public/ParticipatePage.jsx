const participantGroups = [
  {
    id: 'participants-agri',
    stamp: 'stamp-agri',
    name: 'Agriculture',
    items: [
      'Farmers and progressive farmers',
      'Farmer Producer Organisations (FPOs), agricultural cooperatives and self-help groups',
      'Agricultural officers, Krishi Bhavan representatives and local self-government officials',
      'Scientists and extension specialists from KAU, KVK and ICAR institutions',
      'Agri-tech entrepreneurs, start-ups and rural innovators',
      'Drone, IoT, robotics, remote-sensing and AI solution developers',
      'Food-processing, warehousing, cold-chain and agricultural supply-chain representatives',
      'Agricultural equipment manufacturers and input suppliers',
      'Representatives from NABARD, rural banks, agricultural insurance and development agencies',
      'Students, faculty and researchers from Agriculture, Food Technology, Computer Science and related disciplines',
      'NGOs and community organisations working with farmers and rural communities',
    ],
  },
  {
    id: 'participants-health',
    stamp: 'stamp-health',
    name: 'Health',
    items: [
      'Doctors, dentists and medical specialists',
      'Nurses, allied health professionals and community health workers',
      'Hospital administrators, clinic managers and diagnostic-centre representatives',
      'Biomedical engineers and medical equipment manufacturers',
      'Health-tech and AI start-ups',
      'Public health officials and government health-department representatives',
      'Pharmacists and clinical laboratory professionals',
      'Medical, dental, nursing, pharmacy and engineering students',
      'Faculty and researchers working in healthcare, AI and biomedical systems',
      'Patients, caregivers, patient-support groups and disability-support organisations',
      'NGOs working in rural health, rehabilitation and community care',
      'Health insurance and healthcare-finance representatives',
    ],
  },
  {
    id: 'participants-edu',
    stamp: 'stamp-edu',
    name: 'Education',
    items: [
      'School and college students',
      'Teachers, faculty members and academic mentors',
      'Principals, headteachers, department heads and academic administrators',
      'University leaders, curriculum designers and education policymakers',
      'Parents and parent-teacher association representatives',
      'Educational technology and AI start-ups',
      'Instructional-content developers and learning-platform providers',
      'Career counsellors, placement officers and skill-development organisations',
      'Special educators and accessibility experts',
      'Researchers working in education, AI and learning technologies',
      'Representatives from government education departments and institutional managements',
      'Rural and community education representatives',
    ],
  },
]

export function ParticipatePage() {
  return <main id="main"><section id="participants" className="section"><div className="container"><div className="section-head" data-reveal><p className="eyebrow">Who Should Attend</p><h1 className="section-heading">Built for people working across all three sectors.</h1><p className="section-lede">AI Conclave 2026 is open to anyone with a stake in how AI touches Agriculture, Health or Education — students, practitioners and decision-makers alike.</p></div><div className="participants-grid">{participantGroups.map((group) => <div id={group.id} className="participant-group" data-reveal key={group.id}><span className={`stamp ${group.stamp}`}>{group.name}</span><h2>{group.name}</h2><ul className="participant-list">{group.items.map((item) => <li key={item}>{item}</li>)}</ul></div>)}</div></div></section></main>
}

