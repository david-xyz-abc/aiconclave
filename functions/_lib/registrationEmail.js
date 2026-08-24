const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'
const MAX_RESPONSE_BYTES = 65_536
const MAX_AUTOMATIC_ATTEMPTS = 3
const TRANSIENT_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504])
const VENUE = 'Amal Jyothi College of Engineering (Autonomous), Koovappally, Kanjirappally'

class DeliveryError extends Error {
  constructor(code, transient = false) {
    super(code)
    this.name = 'DeliveryError'
    this.code = code
    this.transient = transient
  }
}

function safeHeader(value, maximumLength = 254) {
  return String(value || '').replace(/[\r\n\0]/g, ' ').trim().slice(0, maximumLength)
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function asciiText(value) {
  return String(value ?? '').normalize('NFKD').replace(/[^\x20-\x7E]/g, '?')
}

function pdfEscape(value) {
  return asciiText(value).replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)')
}

function bytesToBase64(bytes) {
  let binary = ''
  const chunkSize = 32_768
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return btoa(binary)
}

function utf8ToBase64(value) {
  return bytesToBase64(new TextEncoder().encode(value))
}

function base64Url(value) {
  return utf8ToBase64(value).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '')
}

function foldBase64(value) {
  return value.match(/.{1,76}/g)?.join('\r\n') || ''
}

function encodeSubject(value) {
  return `=?UTF-8?B?${utf8ToBase64(value)}?=`
}

function makePdfObject(objectNumber, contents) {
  return `${objectNumber} 0 obj\n${contents}\nendobj\n`
}

function createTicketPdf(ticket) {
  const lines = [
    ['NAME', ticket.name],
    [ticket.teamName ? 'TEAM' : 'PARTICIPANT TYPE', ticket.teamName || ticket.participantType],
    ['ORGANISATION', ticket.organisation],
    [ticket.teamName ? 'CATEGORY / SIZE' : 'PANEL SELECTION', ticket.teamName ? `${ticket.category} / ${ticket.teamSize} students` : ticket.panelSelection],
    [ticket.teamName ? 'SECTOR / SOLUTION' : 'EVENT DATE', ticket.teamName ? `${ticket.sector} / ${ticket.solutionType}` : ticket.eventDate],
  ]
  if (ticket.teamName) lines.push(['EVENT DATE', ticket.eventDate])

  const content = [
    'q',
    '1 1 1 rg 0 0 760 360 re f',
    '1 0.13 0.15 rg 0 344 760 16 re f',
    '0.06 0.06 0.06 rg 0 0 14 360 re f',
    '0.04 0.42 0.22 rg 520 0 8 360 re f',
    '0.07 0.07 0.07 rg BT /F2 22 Tf 42 306 Td (AI CONCLAVE 2026) Tj ET',
    `0.36 0.36 0.36 rg BT /F1 10 Tf 42 284 Td (${pdfEscape(ticket.eventLabel)}) Tj ET`,
    `0.04 0.42 0.22 rg BT /F2 15 Tf 554 304 Td (${pdfEscape(ticket.dateShort)}) Tj ET`,
    `0.07 0.07 0.07 rg BT /F2 12 Tf 554 282 Td (${pdfEscape(ticket.ticketCode)}) Tj ET`,
    '0.86 0.86 0.84 RG 1 w 42 260 m 718 260 l S',
  ]

  let y = 226
  for (const [label, value] of lines) {
    content.push(`0.42 0.42 0.40 rg BT /F1 8 Tf 42 ${y} Td (${pdfEscape(label)}) Tj ET`)
    content.push(`0.05 0.05 0.05 rg BT /F2 12 Tf 42 ${y - 18} Td (${pdfEscape(String(value).slice(0, 78))}) Tj ET`)
    y -= 45
  }
  content.push(`0.04 0.42 0.22 rg BT /F2 8 Tf 554 58 Td (VENUE) Tj ET`)
  content.push(`0.20 0.20 0.20 rg BT /F1 8 Tf 554 42 Td (AJCE, KOOVAPPALLY) Tj ET`)
  content.push(`0.20 0.20 0.20 rg BT /F1 8 Tf 554 28 Td (KANJIRAPPALLY) Tj ET`)
  content.push('Q')

  const stream = content.join('\n')
  const objects = [
    makePdfObject(1, '<< /Type /Catalog /Pages 2 0 R >>'),
    makePdfObject(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),
    makePdfObject(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 760 360] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>'),
    makePdfObject(4, `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`),
    makePdfObject(5, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'),
    makePdfObject(6, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'),
  ]
  let pdf = '%PDF-1.4\n%AI-Conclave\n'
  const offsets = [0]
  for (const object of objects) {
    offsets.push(pdf.length)
    pdf += object
  }
  const xrefOffset = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  return new TextEncoder().encode(pdf)
}

async function readBoundedJson(response) {
  const declaredLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) throw new DeliveryError('provider-response-too-large')
  const text = await response.text()
  if (new TextEncoder().encode(text).byteLength > MAX_RESPONSE_BYTES) throw new DeliveryError('provider-response-too-large')
  try {
    return text ? JSON.parse(text) : {}
  } catch {
    throw new DeliveryError('provider-response-invalid')
  }
}

function requireEmailConfiguration(env) {
  const config = {
    clientId: safeHeader(env?.GMAIL_OAUTH_CLIENT_ID, 512),
    clientSecret: safeHeader(env?.GMAIL_OAUTH_CLIENT_SECRET, 512),
    refreshToken: safeHeader(env?.GMAIL_OAUTH_REFRESH_TOKEN, 2_048),
    senderEmail: safeHeader(env?.GMAIL_SENDER_EMAIL),
    senderName: safeHeader(env?.GMAIL_SENDER_NAME || 'AI Conclave AJCE', 120),
  }
  if (!config.clientId || !config.clientSecret || !config.refreshToken || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.senderEmail)) {
    throw new DeliveryError('email-not-configured')
  }
  return config
}

async function fetchWithTimeout(url, init, timeoutMilliseconds = 8_000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMilliseconds)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new DeliveryError('provider-timeout', true)
    throw new DeliveryError('provider-network-error', true)
  } finally {
    clearTimeout(timer)
  }
}

async function getGmailAccessToken(config) {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: config.refreshToken,
    grant_type: 'refresh_token',
  })
  const response = await fetchWithTimeout(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body,
  })
  const payload = await readBoundedJson(response)
  if (!response.ok || typeof payload.access_token !== 'string') {
    throw new DeliveryError(`oauth-${response.status || 'failed'}`, TRANSIENT_HTTP_STATUSES.has(response.status))
  }
  return payload.access_token
}

function ticketDetailsRows(ticket) {
  const rows = [
    ['Name', ticket.name],
    ['Event', ticket.eventLabel],
    ['Date', ticket.eventDate],
    ['Organisation', ticket.organisation],
  ]
  if (ticket.teamName) {
    rows.push(['Team', `${ticket.teamName} (${ticket.ticketCode})`])
    rows.push(['Category / size', `${ticket.category} / ${ticket.teamSize} students`])
    rows.push(['Sector / solution', `${ticket.sector} / ${ticket.solutionType}`])
  } else {
    rows.push(['Participant type', ticket.participantType])
    rows.push(['Panel selection', ticket.panelSelection])
  }
  return rows
}

function buildEmailBodies(ticket, registrationsUrl) {
  const rows = ticketDetailsRows(ticket)
  const textRows = rows.map(([label, value]) => `${label}: ${value}`).join('\n')
  const htmlRows = rows.map(([label, value]) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #deded8;color:#686864;font-size:12px;text-transform:uppercase;letter-spacing:.08em">${escapeHtml(label)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #deded8;color:#111;font-size:15px;font-weight:700">${escapeHtml(value)}</td>
    </tr>`).join('')
  return {
    text: `Hello ${ticket.name},\n\nYour AI Conclave 2026 registration has been received.\n\n${textRows}\nVenue: ${VENUE}\n\nYour ticket is attached as a PDF. You can also view your registration at ${registrationsUrl}.\n\nAI Conclave 2026\nAmal Jyothi College of Engineering`,
    html: `<!doctype html><html><body style="margin:0;background:#f4f4f1;font-family:Arial,sans-serif;color:#111"><div style="max-width:680px;margin:0 auto;padding:28px 14px"><div style="border-top:7px solid #ff2229;background:#fff;border-left:1px solid #aaa;border-right:1px solid #aaa;border-bottom:1px solid #aaa"><div style="padding:28px 28px 18px"><div style="font:700 13px monospace;letter-spacing:.12em;color:#187440">REGISTRATION CONFIRMED</div><h1 style="font:700 30px monospace;margin:12px 0">AI CONCLAVE 2026</h1><p style="font-size:16px;line-height:1.55;color:#555">Hello ${escapeHtml(ticket.name)}, your registration has been received. Keep the attached ticket for event day.</p></div><table style="width:100%;border-collapse:collapse">${htmlRows}</table><div style="padding:22px 28px"><p style="font-size:14px;line-height:1.5"><strong>Venue</strong><br>${escapeHtml(VENUE)}</p><a href="${escapeHtml(registrationsUrl)}" style="display:inline-block;padding:13px 18px;background:#111;color:#fff;text-decoration:none;font:700 13px monospace">VIEW MY REGISTRATIONS →</a></div></div><p style="font-size:12px;color:#777;text-align:center">This is an automatic registration confirmation. Please do not share your ticket publicly.</p></div></body></html>`,
  }
}

function buildMimeMessage({ config, recipient, subject, textBody, htmlBody, pdfBytes, filename, deliveryKey = crypto.randomUUID() }) {
  const mixedBoundary = `mixed_${crypto.randomUUID().replaceAll('-', '')}`
  const alternativeBoundary = `alternative_${crypto.randomUUID().replaceAll('-', '')}`
  const lines = [
    `From: ${config.senderName} <${config.senderEmail}>`,
    `To: ${safeHeader(recipient)}`,
    `Subject: ${encodeSubject(subject)}`,
    `Message-ID: <${safeHeader(deliveryKey, 180).replace(/[^A-Za-z0-9_.:-]/g, '-')}@amaljyothi.ac.in>`,
    `X-AI-Conclave-Delivery: ${safeHeader(deliveryKey, 180)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
    '',
    `--${mixedBoundary}`,
    `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
    '',
    `--${alternativeBoundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    foldBase64(utf8ToBase64(textBody)),
    `--${alternativeBoundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    foldBase64(utf8ToBase64(htmlBody)),
    `--${alternativeBoundary}--`,
    `--${mixedBoundary}`,
    `Content-Type: application/pdf; name="${safeHeader(filename, 100)}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${safeHeader(filename, 100)}"`,
    '',
    foldBase64(bytesToBase64(pdfBytes)),
    `--${mixedBoundary}--`,
    '',
  ]
  return lines.join('\r\n')
}

async function loadTicket(db, delivery) {
  if (delivery.registration_type === 'panel') {
    const row = await db.prepare(`
      SELECT id, name, email, participant_type, organisation, panel_selection
      FROM panel_registrations WHERE id = ? LIMIT 1
    `).bind(delivery.registration_id).first()
    if (!row) throw new DeliveryError('registration-not-found')
    return {
      recipient: row.email,
      subject: `AI Conclave 2026 panel registration confirmed — ${row.panel_selection}`,
      filename: `ai-conclave-panel-${row.id}.pdf`,
      ticket: {
        name: row.name,
        participantType: row.participant_type,
        organisation: row.organisation,
        panelSelection: row.panel_selection,
        eventLabel: 'Day 1 · Panel Discussion',
        eventDate: '15 September 2026',
        dateShort: '15 SEP',
        ticketCode: `AIC26-P-${String(row.id).padStart(5, '0')}`,
      },
    }
  }

  if (delivery.registration_type === 'hackathon') {
    const row = await db.prepare(`
      SELECT t.id, t.team_code, t.team_name, t.participant_category, t.team_size,
             t.sector_track, t.solution_type, m.full_name, m.email, m.institution
      FROM hackathon_teams t
      JOIN hackathon_team_members m ON m.team_id = t.id AND m.member_order = 1
      WHERE t.id = ? LIMIT 1
    `).bind(delivery.registration_id).first()
    if (!row) throw new DeliveryError('registration-not-found')
    return {
      recipient: row.email,
      subject: `AI Conclave 2026 hackathon team confirmed — ${row.team_name}`,
      filename: `ai-conclave-${safeHeader(row.team_code, 50).toLowerCase()}.pdf`,
      ticket: {
        name: row.full_name,
        teamName: row.team_name,
        organisation: row.institution,
        category: row.participant_category,
        teamSize: row.team_size,
        sector: row.sector_track,
        solutionType: row.solution_type,
        eventLabel: 'Day 2 · Student Hackathon',
        eventDate: '16 September 2026',
        dateShort: '16 SEP',
        ticketCode: row.team_code,
      },
    }
  }
  throw new DeliveryError('unsupported-registration-type')
}

async function sendGmailMessage(config, rawMime) {
  const accessToken = await getGmailAccessToken(config)
  const response = await fetchWithTimeout(GMAIL_SEND_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json; charset=utf-8',
      accept: 'application/json',
    },
    body: JSON.stringify({ raw: base64Url(rawMime) }),
  }, 12_000)
  const payload = await readBoundedJson(response)
  if (!response.ok || typeof payload.id !== 'string') {
    throw new DeliveryError(`gmail-${response.status || 'failed'}`, TRANSIENT_HTTP_STATUSES.has(response.status))
  }
  return payload.id.slice(0, 255)
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function claimDelivery(db, deliveryId) {
  return db.prepare(`
    UPDATE registration_email_deliveries
    SET status = 'sending', attempts = attempts + 1,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = ?
      AND (
        status IN ('pending', 'failed')
        OR (
          status = 'sending'
          AND updated_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 minutes')
        )
      )
      AND attempts < ?
      AND available_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    RETURNING *
  `).bind(deliveryId, MAX_AUTOMATIC_ATTEMPTS).first()
}

export async function deliverRegistrationEmail(db, env, deliveryId) {
  for (let retryIndex = 0; retryIndex < MAX_AUTOMATIC_ATTEMPTS; retryIndex += 1) {
    const delivery = await claimDelivery(db, deliveryId)
    if (!delivery) return
    try {
      const config = requireEmailConfiguration(env)
      const details = await loadTicket(db, delivery)
      const origin = new URL(delivery.site_origin).origin
      const registrationsUrl = `${origin}/my-registration`
      const bodies = buildEmailBodies(details.ticket, registrationsUrl)
      const pdfBytes = createTicketPdf(details.ticket)
      const rawMime = buildMimeMessage({
        config,
        recipient: details.recipient,
        subject: details.subject,
        textBody: bodies.text,
        htmlBody: bodies.html,
        pdfBytes,
        filename: details.filename,
        deliveryKey: delivery.dedupe_key,
      })
      const messageId = await sendGmailMessage(config, rawMime)
      await db.prepare(`
        UPDATE registration_email_deliveries
        SET status = 'sent', gmail_message_id = ?, last_error_code = NULL,
            sent_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
            updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE id = ? AND status = 'sending'
      `).bind(messageId, deliveryId).run()
      console.log(JSON.stringify({ event: 'registration_email_sent', deliveryId, registrationType: delivery.registration_type }))
      return
    } catch (error) {
      const code = error instanceof DeliveryError ? error.code : 'unexpected-delivery-error'
      const transient = error instanceof DeliveryError && error.transient
      const canRetry = transient && Number(delivery.attempts) < MAX_AUTOMATIC_ATTEMPTS
      await db.prepare(`
        UPDATE registration_email_deliveries
        SET status = ?, last_error_code = ?,
            available_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
            updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE id = ? AND status = 'sending'
      `).bind(canRetry ? 'pending' : 'failed', code.slice(0, 120), deliveryId).run()
      console.error(JSON.stringify({ event: 'registration_email_failed', deliveryId, code, transient, attempt: delivery.attempts }))
      if (!canRetry) return
      await sleep(250 * (2 ** retryIndex))
    }
  }
}

export function queueRegistrationEmail(context, deliveryId) {
  if (!Number.isInteger(Number(deliveryId))) return
  const task = deliverRegistrationEmail(context.env.DB, context.env, Number(deliveryId))
    .catch((error) => {
      console.error(JSON.stringify({
        event: 'registration_email_worker_failed',
        deliveryId: Number(deliveryId),
        code: error instanceof DeliveryError ? error.code : 'unexpected-delivery-error',
      }))
    })
  context.waitUntil(task)
}

export const _test = { createTicketPdf, buildEmailBodies, buildMimeMessage, escapeHtml, safeHeader }
