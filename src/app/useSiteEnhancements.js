import { useEffect } from 'react'

export function useSiteEnhancements(pageKey) {
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const progressBar = document.getElementById('scroll-progress')
    const observers = []

    const updateProgress = () => {
      if (!progressBar) return
      const documentElement = document.documentElement
      const maximum = documentElement.scrollHeight - documentElement.clientHeight
      progressBar.style.width = `${maximum > 0 ? (window.scrollY / maximum) * 100 : 0}%`
    }

    const formatIndian = (value) => {
      const stringValue = String(Math.round(value))
      const lastThree = stringValue.slice(-3)
      const rest = stringValue.slice(0, -3)
      return rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${lastThree}` : lastThree
    }

    const animateCount = (node) => {
      if (node.dataset.counted === '1') return
      node.dataset.counted = '1'
      const target = Number.parseFloat(node.getAttribute('data-count-to'))
      if (Number.isNaN(target)) return
      const prefix = node.getAttribute('data-prefix') || ''
      const suffix = node.getAttribute('data-suffix') || ''
      const indian = node.getAttribute('data-format') === 'indian'
      const render = (value) => `${prefix}${indian ? formatIndian(value) : Math.round(value)}${suffix}`
      if (reduceMotion) {
        node.textContent = render(target)
        return
      }
      const start = performance.now()
      const frame = (now) => {
        const progress = Math.min(1, (now - start) / 1200)
        node.textContent = render(target * (1 - (1 - progress) ** 3))
        if (progress < 1) requestAnimationFrame(frame)
        else node.textContent = render(target)
      }
      requestAnimationFrame(frame)
    }

    const supportsIntersectionObserver = 'IntersectionObserver' in window
    const revealObserver = !reduceMotion && supportsIntersectionObserver
      ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('is-revealed')
          entry.target.dataset.revealComplete = 'true'
          revealObserver.unobserve(entry.target)
        })
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' })
      : null
    const countObserver = supportsIntersectionObserver
      ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          animateCount(entry.target)
          countObserver.unobserve(entry.target)
        })
      }, { threshold: 0.4 })
      : null

    if (revealObserver) observers.push(revealObserver)
    if (countObserver) observers.push(countObserver)

    const enhanceNode = (node) => {
      if (!(node instanceof Element)) return
      const revealNodes = node.matches('[data-reveal]') ? [node] : node.querySelectorAll('[data-reveal]')
      revealNodes.forEach((revealNode) => {
        if (reduceMotion || !revealObserver) {
          revealNode.classList.add('is-revealed')
          revealNode.dataset.revealComplete = 'true'
        }
        else revealObserver.observe(revealNode)
      })
      const countNodes = node.matches('[data-count-to]') ? [node] : node.querySelectorAll('[data-count-to]')
      countNodes.forEach((countNode) => {
        if (countObserver) countObserver.observe(countNode)
        else animateCount(countNode)
      })
    }

    enhanceNode(document.body)
    const contentObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => mutation.addedNodes.forEach(enhanceNode))
    })
    contentObserver.observe(document.body, { childList: true, subtree: true })
    observers.push(contentObserver)
    window.addEventListener('scroll', updateProgress, { passive: true })
    window.addEventListener('resize', updateProgress)
    updateProgress()

    return () => {
      window.removeEventListener('scroll', updateProgress)
      window.removeEventListener('resize', updateProgress)
      observers.forEach((observer) => observer.disconnect())
    }
  }, [pageKey])
}
