export const PATHS = Object.freeze({
  home: '/',
  about: '/about',
  schedule: '/schedule',
  participate: '/participate',
  register: '/register',
  registerHackathon: '/register/hackathon',
  registerPanel: '/register/panel',
  myRegistration: '/my-registration',
})

const PAGE_BY_PATH = Object.freeze({
  [PATHS.about]: 'about',
  [PATHS.schedule]: 'schedule',
  [PATHS.participate]: 'participate',
  [PATHS.registerHackathon]: 'register-hackathon',
  [PATHS.registerPanel]: 'register-panel',
  [PATHS.register]: 'register',
  [PATHS.myRegistration]: 'my-registration',
})

export function currentPage(pathname = window.location.pathname) {
  const path = pathname.replace(/\/+$/, '') || PATHS.home
  return PAGE_BY_PATH[path] || 'home'
}
