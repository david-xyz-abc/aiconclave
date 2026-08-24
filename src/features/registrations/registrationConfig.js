export const HACKATHON_REGISTRATION_OPEN = true
export const hackathonTrackOptions = [
  {
    id: 'track-hackathon-tech',
    value: 'Hackathon (Technical)',
    title: 'Hackathon — Technical',
    description: 'Day 2 technical track, open to school & college students.',
  },
  {
    id: 'track-hackathon-nontech',
    value: 'Hackathon (Non-Technical)',
    title: 'Hackathon — Non-Technical',
    description: 'Day 2 non-technical track, open to school & college students.',
  },
]

export const hackathonChallengeAreas = Object.freeze({
  Agriculture: {
    'Smart Farming': ['IoT-based crop monitoring', 'Smart irrigation', 'Automated farming'],
    'Crop Disease Detection': ['Image-based disease identification', 'Early warning systems'],
    'Pest Management': ['Pest detection', 'Pest prediction', 'Eco-friendly pest control'],
    'Precision Agriculture': ['Soil analysis', 'Crop-specific fertilizer recommendations'],
    'Water Management': ['Irrigation optimization', 'Water-level monitoring', 'Drought prediction'],
    'Weather & Climate': ['Weather-based crop advisory', 'Climate-risk prediction'],
    'Soil Health': ['Soil quality monitoring', 'Nutrient recommendation'],
    'Crop Yield Prediction': ['AI-based yield forecasting'],
    'Farmer Support': ['Farmer advisory apps', 'Multilingual voice assistants'],
    'Market & Price Prediction': ['Crop price forecasting', 'Direct farmer-to-consumer platforms'],
    'Supply Chain': ['Cold-chain monitoring', 'Post-harvest tracking'],
    'Post-Harvest Management': ['Food spoilage detection', 'Storage optimization'],
    'Livestock & Dairy': ['Animal health monitoring', 'Milk-production prediction'],
    'Sustainable Agriculture': ['Organic farming', 'Carbon footprint reduction'],
    'Agri-FinTech': ['Crop insurance', 'Agricultural loans', 'Financial planning'],
    'Agri-Robotics': ['Autonomous harvesting', 'Weed detection and removal'],
  },
  Health: {
    'Disease Detection': ['AI-assisted early detection and screening'],
    'Medical Imaging': ['X-ray, CT or MRI image analysis'],
    'Remote Healthcare': ['Telemedicine', 'Remote consultation'],
    'Health Monitoring': ['IoT-based monitoring', 'Wearable-based monitoring'],
    'Maternal & Child Health': ['Pregnancy monitoring', 'Child nutrition'],
    'Elderly Care': ['Fall detection', 'Medication reminders', 'Emergency alerts'],
    'Mental Wellness': ['Stress-management applications', 'Wellness-support applications'],
    'Nutrition': ['Personalized diet recommendations', 'Personalized nutrition recommendations'],
    'Medicine Management': ['Medication reminders', 'Prescription management'],
    'Emergency Healthcare': ['Ambulance coordination', 'Emergency response'],
    'Hospital Management': ['Queue management', 'Bed allocation', 'Resource optimization'],
    'Public Health': ['Disease outbreak monitoring', 'Disease outbreak prediction'],
    'Accessibility': ['Assistive technologies for people with disabilities'],
    'Healthcare NLP': ['Medical document summarization', 'Multilingual health assistants'],
    'Health Records': ['Secure digital health records'],
    'Rural Healthcare': ['Low-bandwidth healthcare solutions', 'Community health support'],
    'Preventive Healthcare': ['Risk prediction', 'Personalized preventive recommendations'],
  },
  Education: {
    'Personalized Learning': ['AI-generated personalized learning paths'],
    'AI Tutor': ['Intelligent tutoring', 'Doubt-clearing systems'],
    'Learning Analytics': ['Student performance prediction', 'Learning-gap identification'],
    'Accessibility': ['Tools for visually impaired learners', 'Tools for hearing impaired learners'],
    'Language Learning': ['AI-based language learning', 'Pronunciation systems'],
    'Multilingual Education': ['Translation in regional languages', 'Voice-based learning in regional languages'],
    'Digital Assessment': ['Automated evaluation', 'Question generation'],
    'Skill Development': ['Personalized skill-gap analysis'],
    'Career Guidance': ['AI-based career recommendations', 'AI-based course recommendations'],
    'Dropout Prediction': ['Identifying students at risk of dropping out'],
    'Teacher Support': ['Lesson planning', 'Content generation', 'Assessment assistance'],
    'AR/VR Education': ['Virtual laboratories', 'Immersive learning'],
    'STEM Education': ['Interactive science learning', 'Interactive engineering learning'],
    'Rural Education': ['Offline learning platforms', 'Low-bandwidth learning platforms'],
    'Special Education': ['Assistive learning for children with special needs'],
    'Academic Integrity': ['Plagiarism detection', 'AI-generated content detection'],
    'Gamification': ['Game-based learning', 'Learner engagement'],
    'Digital Library': ['Intelligent search systems', 'Intelligent recommendation systems'],
  },
})

export const participantTypes = ['Student', 'Faculty / Academic', 'Professional / Industry Delegate', 'Researcher', 'Other']
export const panelOptions = ['AI in Agriculture', 'AI in Education', 'AI in Healthcare']
export const industrySectors = ['Agriculture', 'Education', 'Healthcare', 'IT / Technology', 'Government', 'Other']
export const organisationTypes = ['Startup', 'MSME', 'Corporate', 'Government', 'Academic Institution', 'Research Organization', 'NGO', 'Other']

export const blankTeamMember = () => ({ fullName: '', email: '', phone: '', institution: '', departmentOrCourse: '', yearOrGrade: '' })

export const initialHackathonForm = {
  teamName: '',
  participantCategory: '',
  sectorTrack: '',
  solutionType: '',
  members: [blankTeamMember(), blankTeamMember()],
  informationConfirmed: false,
  rulesAccepted: false,
  updatesOptIn: false,
}

export function validateHackathonForm(form) {
  const errors = {}
  const normalizedEmails = new Set()

  if (form.teamName.trim().length < 2) errors.teamName = 'Enter a team name using at least 2 characters.'
  if (!['School', 'College'].includes(form.participantCategory)) errors.participantCategory = 'Choose School or College.'
  if (!['Agriculture', 'Education', 'Healthcare'].includes(form.sectorTrack)) errors.sectorTrack = 'Choose one hackathon sector.'
  if (!['Technical', 'Non-Technical'].includes(form.solutionType)) errors.solutionType = 'Choose Technical or Non-Technical.'
  if (!Array.isArray(form.members) || form.members.length < 2 || form.members.length > 4) errors.members = 'A team must have 2 to 4 students.'

  form.members.forEach((member, index) => {
    const prefix = `members.${index}`
    const email = member.email.trim().toLowerCase()
    if (member.fullName.trim().length < 2) errors[`${prefix}.fullName`] = 'Enter the student’s full name.'
    if (!email) errors[`${prefix}.email`] = 'Enter the student’s email address.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors[`${prefix}.email`] = 'Enter a valid email address.'
    else if (normalizedEmails.has(email)) errors[`${prefix}.email`] = 'Each student must use a different email address.'
    else normalizedEmails.add(email)
    if (!/^\d{10}$/.test(member.phone)) errors[`${prefix}.phone`] = 'Enter exactly 10 digits after +91.'
    if (member.institution.trim().length < 2) errors[`${prefix}.institution`] = `Enter the student’s ${form.participantCategory === 'School' ? 'school' : 'college'} name.`
    if (form.participantCategory === 'College' && member.departmentOrCourse.trim().length < 2) errors[`${prefix}.departmentOrCourse`] = 'Enter the department or course.'
    if (!member.yearOrGrade.trim()) errors[`${prefix}.yearOrGrade`] = form.participantCategory === 'School' ? 'Enter the class or grade.' : 'Enter the year of study.'
  })

  if (!form.informationConfirmed) errors.informationConfirmed = 'Confirm that the team information is accurate.'
  if (!form.rulesAccepted) errors.rulesAccepted = 'Confirm that every team member meets the participation rules.'
  return errors
}

export const initialPanelForm = {
  name: '',
  email: '',
  phone: '',
  participantType: '',
  organisation: '',
  department: '',
  panelSelection: '',
  industrySector: '',
  industrySectorOther: '',
  organisationType: '',
  organisationTypeOther: '',
  informationConfirmed: false,
  updatesOptIn: false,
}

export function validatePanelForm(form) {
  const errors = {}

  if (!form.name.trim()) errors.name = 'Enter your full name.'
  if (!form.email.trim()) errors.email = 'Enter your email address.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Enter a valid email address, for example name@example.com.'
  if (!form.phone.trim()) errors.phone = 'Enter your phone number.'
  else if (!/^\d{10}$/.test(form.phone)) errors.phone = 'Enter exactly 10 digits after +91.'
  if (!form.participantType) errors.participantType = 'Choose your participant type.'
  if (!form.organisation.trim()) errors.organisation = 'Enter your college, institution or organization name.'
  if (!form.panelSelection) errors.panelSelection = 'Choose the panel discussion you want to attend.'
  if (form.industrySector === 'Other' && !form.industrySectorOther.trim()) errors.industrySectorOther = 'Specify your industry sector.'
  if (form.organisationType === 'Other' && !form.organisationTypeOther.trim()) errors.organisationTypeOther = 'Specify your organization type.'
  if (!form.informationConfirmed) errors.informationConfirmed = 'Confirm that the information provided is accurate.'

  return errors
}
