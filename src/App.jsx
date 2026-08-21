import { SiteShell } from './components/layout/SiteShell.jsx'
import { useSiteEnhancements } from './app/useSiteEnhancements.js'
import { IntroScreen } from './features/public/PublicPages.jsx'
import { AppRouter } from './app/AppRouter.jsx'
import { useClientRouting } from './app/useClientRouting.js'

function App() {
  const page = useClientRouting()
  useSiteEnhancements(page)
  return <><IntroScreen /><SiteShell active={page}><AppRouter page={page} /></SiteShell></>
}

export default App
