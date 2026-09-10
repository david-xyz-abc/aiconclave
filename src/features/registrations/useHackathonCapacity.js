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
      if (pending) return
      pending = true
      try {
        const data = await registrationApi.capacity()
        if (!data.hackathon || typeof data.hackathon.open !== 'boolean' || typeof data.hackathon.collegeOpen !== 'boolean') throw new Error('Registration status is unavailable.')
        if (active) setCapacity({ ...data.hackathon, status: 'ready' })
      } catch {
        if (active) setCapacity({ status: 'error', open: false })
      } finally { pending = false }
    }
    void refresh()
    const timer = window.setInterval(() => { if (!document.hidden) void refresh() }, 15000)
    window.addEventListener('focus', refresh)
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [revision])
  return [capacity, retry]
}
