import { useEffect, useState } from 'react'
import { authApi } from '../../services/api.js'

export function useParticipantSession({ enabled, previewParticipant }) {
  const [state, setState] = useState(() => enabled
    ? { status: 'loading', participant: null, error: '' }
    : { status: 'preview', participant: previewParticipant, error: '' })

  useEffect(() => {
    if (!enabled) return undefined
    let active = true
    authApi.session().then((data) => {
      if (active) setState({
        status: data.signedIn ? 'signed-in' : 'signed-out',
        participant: data.participant || null,
        error: '',
      })
    }).catch((error) => {
      if (active) setState({
        status: 'error',
        participant: null,
        error: error.message || 'We could not check your sign-in status.',
      })
    })
    return () => { active = false }
  }, [enabled, previewParticipant])

  return [state, setState]
}
