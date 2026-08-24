import assert from 'node:assert/strict'
import test from 'node:test'
import { _test, deliverRegistrationEmail } from '../functions/_lib/registrationEmail.js'

const panelTicket = {
  name: 'Test <Participant>',
  participantType: 'Student',
  organisation: 'Amal Jyothi College of Engineering',
  panelSelection: 'AI in Education',
  eventLabel: 'Day 1 · Panel Discussion',
  eventDate: '15 September 2026',
  dateShort: '15 SEP',
  ticketCode: 'AIC26-P-00001',
}

test('confirmation HTML escapes participant-controlled fields', () => {
  const bodies = _test.buildEmailBodies(panelTicket, 'https://aiconclave26.ajce.in/my-registration')
  assert.match(bodies.html, /Test &lt;Participant&gt;/)
  assert.doesNotMatch(bodies.html, /Test <Participant>/)
})

test('ticket generator creates the full downloadable-ticket layout as a valid PDF', () => {
  const bytes = _test.createTicketPdf(panelTicket)
  const text = new TextDecoder().decode(bytes)
  assert.ok(bytes.byteLength < 100_000)
  assert.ok(text.startsWith('%PDF-1.4'))
  assert.ok(text.endsWith('%%EOF'))
  assert.match(text, /MediaBox \[0 0 1600 570\]/)
  assert.match(text, /AI CONCLAVE 2026/)
  assert.match(text, /AMAL JYOTHI/)
  assert.match(text, /COLLEGE OF ENGINEERING/)
  assert.match(text, /AIC26-P-00001/)
})

test('MIME contains alternative content and a PDF attachment', () => {
  const pdfBytes = _test.createTicketPdf(panelTicket)
  const mime = _test.buildMimeMessage({
    config: {
      senderName: 'AI Conclave AJCE',
      senderEmail: 'aiconclave@amaljyothi.ac.in',
    },
    recipient: 'student@example.com',
    subject: 'Registration confirmed',
    textBody: 'Confirmed',
    htmlBody: '<strong>Confirmed</strong>',
    pdfBytes,
    filename: 'ticket.pdf',
  })
  assert.match(mime, /multipart\/alternative/)
  assert.match(mime, /Content-Type: application\/pdf/)
  assert.match(mime, /filename="ticket.pdf"/)
  assert.doesNotMatch(mime, /\nBcc:/i)
})

test('header sanitizer removes newline injection', () => {
  assert.equal(_test.safeHeader('Student\r\nBcc: attacker@example.com'), 'Student  Bcc: attacker@example.com')
})

test('delivery sends once, records the Gmail id, and cannot resend a sent job', async () => {
  const delivery = {
    id: 7,
    dedupe_key: 'panel:1:confirmation',
    registration_type: 'panel',
    registration_id: 1,
    site_origin: 'https://aiconclave26.ajce.in',
    status: 'pending',
    attempts: 0,
  }
  const panel = {
    id: 1,
    name: 'Test Participant',
    email: 'student@example.com',
    participant_type: 'Student',
    organisation: 'AJCE',
    panel_selection: 'AI in Education',
  }
  const db = {
    prepare(sql) {
      return {
        bind(...values) {
          return {
            async first() {
              if (sql.includes('UPDATE registration_email_deliveries')) {
                if (delivery.status === 'sent' || delivery.attempts >= 3) return null
                delivery.status = 'sending'
                delivery.attempts += 1
                return { ...delivery }
              }
              if (sql.includes('FROM panel_registrations')) return panel
              throw new Error(`Unexpected first query: ${sql}`)
            },
            async run() {
              if (sql.includes("SET status = 'sent'")) {
                delivery.status = 'sent'
                delivery.gmail_message_id = values[0]
                return {}
              }
              if (sql.includes('SET status = ?')) {
                delivery.status = values[0]
                return {}
              }
              throw new Error(`Unexpected run query: ${sql}`)
            },
          }
        },
      }
    },
  }
  const originalFetch = globalThis.fetch
  const requests = []
  globalThis.fetch = async (url, init) => {
    requests.push({ url: String(url), init })
    if (String(url).includes('/token')) return Response.json({ access_token: 'test-access-token' })
    if (String(url).includes('/messages/send')) return Response.json({ id: 'gmail-message-1' })
    throw new Error('Unexpected provider request')
  }
  const env = {
    GMAIL_OAUTH_CLIENT_ID: 'mailer.apps.googleusercontent.com',
    GMAIL_OAUTH_CLIENT_SECRET: 'secret',
    GMAIL_OAUTH_REFRESH_TOKEN: 'refresh-token',
    GMAIL_SENDER_EMAIL: 'aiconclave@amaljyothi.ac.in',
    GMAIL_SENDER_NAME: 'AI Conclave AJCE',
  }
  try {
    await deliverRegistrationEmail(db, env, delivery.id)
    await deliverRegistrationEmail(db, env, delivery.id)
  } finally {
    globalThis.fetch = originalFetch
  }
  assert.equal(delivery.status, 'sent')
  assert.equal(delivery.gmail_message_id, 'gmail-message-1')
  assert.equal(requests.length, 2)
  assert.equal(requests[1].init.headers.authorization, 'Bearer test-access-token')
  const gmailPayload = JSON.parse(requests[1].init.body)
  assert.match(gmailPayload.raw, /^[A-Za-z0-9_-]+$/)
})
