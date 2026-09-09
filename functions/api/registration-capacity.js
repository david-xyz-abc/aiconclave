import { getHackathonCapacity } from '../_lib/capacity.js'
import { json } from '../_lib/http.js'

export async function onRequestGet({ env }) {
  try {
    if (!env?.DB) return json({ ok: false, error: 'Registration status is unavailable.' }, 503)
    return json({ ok: true, hackathon: await getHackathonCapacity(env.DB) })
  } catch (error) {
    console.error(JSON.stringify({ event: 'capacity_check_failed', reason: error instanceof Error ? error.message : 'unknown' }))
    return json({ ok: false, error: 'Registration status is unavailable. Please try again.' }, 503)
  }
}
