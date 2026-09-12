import { useCallback, useEffect, useState } from 'react'
import { registrationApi } from '../../services/api.js'

export function useHackathonCapacity() {
  const [capacity, setCapacity] = useState({ status: 'loading', open: false })
  const [revision, setRevision] = useState(0)
  const retry = useCallback(() => setRevision(value => value + 1), [])
  useEffect(() => {
    let active = true
    let pending = false
    const refresh = async () => {
      if (pending || document.visibilityState === 'hidden') return
      pending = true
      try {
        const data = await registrationApi.capacity()
        if (active) setCapacity({ ...data.hackathon, status: 'ready' })
      } catch {
        if (active) setCapacity({ status: 'error', open: false })
      } finally { pending = false }
    }
    refresh()
    const timer = window.setInterval(refresh, 60000)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      active = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [revision])
  return [capacity, retry]
}
