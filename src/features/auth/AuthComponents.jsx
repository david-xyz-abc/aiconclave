import { useEffect, useRef, useState } from 'react'
import { PATHS } from '../../config/routes.js'
import { authApi } from '../../services/api.js'
import { useParticipantSession } from './useParticipantSession.js'

export const GOOGLE_SIGN_IN_ENABLED = import.meta.env.VITE_GOOGLE_SIGN_IN_ENABLED !== 'false'
const DEV_PREVIEW_PARTICIPANT = Object.freeze({ displayName: '', email: '', isPreview: true })
let googleScriptPromise
let googleConfigPromise
let googleConfigCreatedAt = 0

function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google)
  if (googleScriptPromise) return googleScriptPromise
  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-identity]')
    existing?.remove()
    const script = document.createElement('script')
    script.addEventListener('load', () => window.google?.accounts?.id ? resolve(window.google) : reject(new Error('Google Sign-In did not load.')), { once: true })
    script.addEventListener('error', () => {
      script.remove()
      reject(new Error('Google Sign-In could not be loaded. Check your connection and try again.'))
    }, { once: true })
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.dataset.googleIdentity = 'true'
    document.head.appendChild(script)
  }).catch((error) => {
    googleScriptPromise = undefined
    throw error
  })
  return googleScriptPromise
}

function getGoogleConfig(force = false) {
  if (force || Date.now() - googleConfigCreatedAt > 4 * 60 * 1000) googleConfigPromise = undefined
  if (!googleConfigPromise) {
    googleConfigCreatedAt = Date.now()
    googleConfigPromise = authApi.config()
      .catch((error) => {
        googleConfigPromise = undefined
        throw error
      })
  }
  return googleConfigPromise
}

function GoogleSignInButton({ onSignedIn }) {
  const buttonHostRef = useRef(null)
  const onSignedInRef = useRef(onSignedIn)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(true)
  const [ready, setReady] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    onSignedInRef.current = onSignedIn
  }, [onSignedIn])

  useEffect(() => {
    let active = true
    setBusy(true)
    setReady(false)
    setError('')
    Promise.all([loadGoogleIdentity(), getGoogleConfig(attempt > 0)]).then(([google, config]) => {
      if (!active) return
      google.accounts.id.initialize({
        client_id: config.clientId,
        nonce: config.nonce,
        auto_select: false,
        cancel_on_tap_outside: true,
        // Keep the button on GIS's established popup flow. FedCM can be
        // unavailable in embedded/local browsers even when the OAuth origin
        // is valid, which otherwise turns a click into a silent no-op.
        use_fedcm_for_button: false,
        callback: async ({ credential }) => {
          if (!credential || !active) return
          setBusy(true)
          setError('')
          try {
            const data = await authApi.google(credential)
            googleConfigPromise = undefined
            onSignedInRef.current(data.participant)
          } catch (signInError) {
            googleConfigPromise = undefined
            if (active) {
              setError(signInError.message || 'Google Sign-In could not be completed. Please try again.')
            }
          } finally {
            if (active) setBusy(false)
          }
        },
      })
      const buttonHost = buttonHostRef.current
      if (!buttonHost) throw new Error('Google Sign-In could not be displayed.')
      buttonHost.replaceChildren()
      google.accounts.id.renderButton(buttonHost, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: Math.min(400, Math.max(200, Math.floor(buttonHost.getBoundingClientRect().width))),
      })
      setReady(true)
      setBusy(false)
    }).catch((loadError) => {
      if (!active) return
      setBusy(false)
      setReady(false)
      setError(loadError.message || 'Google Sign-In is unavailable right now.')
    })
    return () => {
      active = false
      buttonHostRef.current?.replaceChildren()
    }
  }, [attempt])

  return <div className="google-sign-in-control">
    <div ref={buttonHostRef} className={`google-official-button${busy && ready ? ' is-busy' : ''}`} aria-busy={busy}></div>
    {!ready && <span className="google-sign-in-status">Preparing secure sign-in…</span>}
    {busy && ready && <span className="google-sign-in-status">Completing sign-in…</span>}
    {error && <div className="account-error" role="alert"><p>{error}</p><button type="button" className="text-button" onClick={() => setAttempt((value) => value + 1)}>Try again</button></div>}
  </div>
}

export function SignInCard({ onSignedIn }) {
  return <main id="main" className="registration-login-page">
    <section className="page-header"><div className="container"><p className="eyebrow">Registration access</p><h1 className="section-heading">Sign in before choosing an event.</h1><p className="section-lede">Use your Gmail or Google Workspace account. It securely links your registration to you, so you can return and view it later.</p></div></section>
    <section className="section"><div className="container register-layout"><div className="participant-login-card">
      <div className="participant-login-copy"><span className="stamp">Participant sign-in</span><h2>Continue with Google</h2><p>Your verified Google email will be used for registration. We never receive or store your Google password.</p></div>
      <div className="participant-login-action"><span className="participant-login-kicker"><i aria-hidden="true"></i> Secure participant access</span><GoogleSignInButton onSignedIn={onSignedIn} /><small>Sign in once to register and return to your details later.</small></div>
    </div></div></section>
  </main>
}

export function RegistrationGate({ children }) {
  const [session, setSession] = useParticipantSession({ enabled: GOOGLE_SIGN_IN_ENABLED, previewParticipant: DEV_PREVIEW_PARTICIPANT })
  const [signingOut, setSigningOut] = useState(false)

  const signOut = async () => {
    if (signingOut) return
    setSigningOut(true)
    try {
      await authApi.logout()
    } finally {
      window.google?.accounts?.id?.disableAutoSelect()
      setSession({ status: 'signed-out', participant: null, error: '' })
      setSigningOut(false)
    }
  }

  if (session.status === 'preview') return children(session.participant)
  if (session.status === 'loading') return <main id="main"><section className="account-loading"><span className="account-spinner" aria-hidden="true"></span><p>Checking your sign-in…</p></section></main>
  if (session.status === 'error') return <main id="main"><section className="section"><div className="container register-layout"><div className="account-error account-error-page" role="alert"><h1>Sign-in could not be checked.</h1><p>{session.error}</p><button type="button" className="btn btn-outline" onClick={() => window.location.reload()}>Try again</button></div></div></section></main>
  if (session.status !== 'signed-in') return <SignInCard onSignedIn={(participant) => setSession({ status: 'signed-in', participant, error: '' })} />
  return children(session.participant, signOut, signingOut)
}

export function ParticipantBar({ participant, onSignOut, signingOut = false }) {
  if (participant.isPreview) return <div className="participant-bar participant-preview-bar"><span className="participant-status-dot" aria-hidden="true"></span><div><small>Development mode</small><strong>Google sign-in disabled</strong><span>Participant details can be entered directly in each form.</span></div></div>
  return <div className="participant-bar"><span className="participant-status-dot" aria-hidden="true"></span><div><small>Signed in as</small><strong>{participant.displayName || participant.email}</strong><span>{participant.email}</span></div><div className="participant-bar-actions"><a href={PATHS.myRegistration}>My registrations <span aria-hidden="true">→</span></a>{onSignOut && <button type="button" className="participant-sign-out" onClick={onSignOut} disabled={signingOut}>{signingOut ? 'Signing out…' : 'Sign out'}</button>}</div></div>
}
