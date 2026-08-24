import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { currentPage } from '../config/routes.js'

export function useClientRouting() {
  const [page, setPage] = useState(currentPage)

  useEffect(() => {
    const commitNavigation = (destination, push) => {
      if (push) window.history.pushState({}, '', destination)
      flushSync(() => setPage(currentPage()))
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }
    const navigate = (destination, push = true) => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const commit = () => commitNavigation(destination, push)
      if (document.startViewTransition && !reduceMotion) document.startViewTransition(commit)
      else commit()
    }
    const handleClick = (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = event.target.closest('a[href]')
      if (!anchor || anchor.target || anchor.hasAttribute('download')) return
      const destination = new URL(anchor.href, window.location.href)
      if (destination.origin !== window.location.origin) return
      if (destination.pathname === window.location.pathname && destination.search === window.location.search && destination.hash) return
      if (destination.href === window.location.href) return
      event.preventDefault()
      navigate(`${destination.pathname}${destination.search}${destination.hash}`)
    }
    const handlePopState = () => navigate(`${window.location.pathname}${window.location.search}${window.location.hash}`, false)
    document.addEventListener('click', handleClick)
    window.addEventListener('popstate', handlePopState)
    return () => {
      document.removeEventListener('click', handleClick)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  useEffect(() => {
    document.title = page === 'home' ? 'AI Conclave 2026' : `${page[0].toUpperCase()}${page.slice(1)} — AI Conclave 2026`
  }, [page])

  return page
}
