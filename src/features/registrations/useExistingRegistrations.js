import { useEffect, useState } from 'react'
import { registrationApi } from '../../services/api.js'

export function useExistingRegistrations(participant) {
  const [refresh, setRefresh] = useState(0)
  const [state, setState] = useState(() => participant.isPreview
    ? { status: 'ready', registrations: [], error: '' }
    : { status: 'loading', registrations: [], error: '' })

  useEffect(() => {
    if (participant.isPreview) return undefined
    let active = true
    setState((current) => ({ ...current, status: 'loading', error: '' }))
    registrationApi.listMine().then((data) => {
      if (active) setState({
        status: 'ready',
        registrations: data.registrations || [],
        error: '',
      })
    }).catch((error) => {
      if (active) setState({
        status: 'error',
        registrations: [],
        error: error.message || 'We could not check your existing registrations.',
      })
    })
    return () => { active = false }
  }, [participant.isPreview, participant.email, refresh])

  return [state, () => setRefresh((value) => value + 1)]
}

export function hasEventRegistration(registrations, eventType) {
  if (eventType === 'hackathon') {
    return registrations.some(({ type }) => type === 'Hackathon' || type === 'Hackathon Team')
  }
  return registrations.some(({ type }) => type === 'Panel Discussion')
}
