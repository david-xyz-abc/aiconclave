const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'
const WHATSAPP_GROUPS = Object.freeze({
  panel: 'https://chat.whatsapp.com/J6rmQG3jAWn3tjVtT5Pbhn?s=sw&p=a&mlu=4',
  hackathon: 'https://chat.whatsapp.com/CrxG2ZqSr7ZJrqpzAgawjF?s=sw&p=a&mlu=4',
})
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

const TICKET_WIDTH = 1600
const TICKET_HEIGHT = 570

function pdfNumber(value) {
  return Number(value.toFixed(2)).toString()
}

function pdfColour(hex) {
  const value = hex.replace('#', '')
  return [0, 2, 4]
    .map((offset) => pdfNumber(Number.parseInt(value.slice(offset, offset + 2), 16) / 255))
    .join(' ')
}

function fitPdfText(value, fontSize, maximumWidth, minimumFontSize = 12) {
  const normalized = asciiText(value || '-').replace(/\s+/g, ' ').trim()
  let fittedSize = fontSize
  while (fittedSize > minimumFontSize && normalized.length * fittedSize * 0.59 > maximumWidth) fittedSize -= 1
  if (normalized.length * fittedSize * 0.59 <= maximumWidth) return { value: normalized, fontSize: fittedSize }

  const maximumCharacters = Math.max(1, Math.floor(maximumWidth / (fittedSize * 0.59)) - 3)
  return { value: `${normalized.slice(0, maximumCharacters).trimEnd()}...`, fontSize: fittedSize }
}

function ticketPdfCanvas() {
  const commands = []
  const rect = (x, y, width, height, colour, stroke = null, lineWidth = 1) => {
    if (colour) commands.push(`${pdfColour(colour)} rg ${x} ${TICKET_HEIGHT - y - height} ${width} ${height} re f`)
    if (stroke) commands.push(`${pdfColour(stroke)} RG ${lineWidth} w ${x} ${TICKET_HEIGHT - y - height} ${width} ${height} re S`)
  }
  const text = (value, x, y, size, font = 'F1', colour = '#0a0a0a', maximumWidth = null, minimumSize = 12) => {
    const fitted = maximumWidth == null
      ? { value: asciiText(value || '-'), fontSize: size }
      : fitPdfText(value, size, maximumWidth, minimumSize)
    commands.push(`${pdfColour(colour)} rg BT /${font} ${fitted.fontSize} Tf ${x} ${TICKET_HEIGHT - y} Td (${pdfEscape(fitted.value)}) Tj ET`)
  }
  const line = (x1, y1, x2, y2, colour, lineWidth = 1, dash = null) => {
    commands.push(`${pdfColour(colour)} RG ${lineWidth} w ${dash ? `[${dash.join(' ')}] 0 d` : '[] 0 d'} ${x1} ${TICKET_HEIGHT - y1} m ${x2} ${TICKET_HEIGHT - y2} l S`)
  }
  const circle = (centreX, centreY, radius, colour) => {
    const control = radius * 0.5522847498
    const y = TICKET_HEIGHT - centreY
    commands.push([
      `${pdfColour(colour)} rg`,
      `${pdfNumber(centreX + radius)} ${pdfNumber(y)} m`,
      `${pdfNumber(centreX + radius)} ${pdfNumber(y + control)} ${pdfNumber(centreX + control)} ${pdfNumber(y + radius)} ${pdfNumber(centreX)} ${pdfNumber(y + radius)} c`,
      `${pdfNumber(centreX - control)} ${pdfNumber(y + radius)} ${pdfNumber(centreX - radius)} ${pdfNumber(y + control)} ${pdfNumber(centreX - radius)} ${pdfNumber(y)} c`,
      `${pdfNumber(centreX - radius)} ${pdfNumber(y - control)} ${pdfNumber(centreX - control)} ${pdfNumber(y - radius)} ${pdfNumber(centreX)} ${pdfNumber(y - radius)} c`,
      `${pdfNumber(centreX + control)} ${pdfNumber(y - radius)} ${pdfNumber(centreX + radius)} ${pdfNumber(y - control)} ${pdfNumber(centreX + radius)} ${pdfNumber(y)} c f`,
    ].join(' '))
  }
  return { commands, rect, text, line, circle }
}

function drawTicketValue(canvas, label, value, x, y, width) {
  canvas.text(label.toUpperCase(), x, y, 17, 'F3', '#6b6b65', width, 12)
  canvas.text(value, x, y + 36, 27, 'F2', '#0a0a0a', width, 17)
}

function createTicketPdf(ticket) {
  const canvas = ticketPdfCanvas()
  const isTeamTicket = Boolean(ticket.teamName)
  const eventTitle = isTeamTicket ? ticket.teamName : ticket.panelSelection

  canvas.rect(0, 0, TICKET_WIDTH, TICKET_HEIGHT, '#f1f1ed')
  canvas.rect(40, 40, 1520, 490, '#ffffff', '#0a0a0a', 3)
  canvas.rect(40, 40, 1520, 16, '#ff1e1e')

  canvas.rect(88, 86, 68, 68, '#ff1e1e')
  canvas.text('AC', 105, 129, 23, 'F4')
  canvas.text('AI CONCLAVE 2026', 184, 112, 28, 'F4')
  canvas.text('AJCE - KANJIRAPPALLY', 184, 143, 17, 'F3', '#6b6b65')

  canvas.text(ticket.eventLabel.toUpperCase().replaceAll('·', '-'), 88, 205, 18, 'F3', '#6b6b65', 1020, 14)
  canvas.text(eventTitle, 88, 270, 57, 'F4', '#0a0a0a', 1020, 34)
  canvas.rect(88, 295, 1020, 5, '#1a6b3c')

  if (isTeamTicket) {
    drawTicketValue(canvas, 'Captain', ticket.name, 88, 342, 410)
    drawTicketValue(canvas, 'Category / team size', `${ticket.category} / ${ticket.teamSize} students`, 540, 342, 250)
    drawTicketValue(canvas, 'Event date', ticket.eventDate, 825, 342, 300)
    drawTicketValue(canvas, 'Institution', ticket.organisation, 88, 435, 530)
    drawTicketValue(canvas, 'Sector / solution', `${ticket.sector} / ${ticket.solutionType}`, 660, 435, 448)
  } else {
    drawTicketValue(canvas, 'Name', ticket.name, 88, 342, 410)
    drawTicketValue(canvas, 'Participant type', ticket.participantType, 540, 342, 250)
    drawTicketValue(canvas, 'Event date', ticket.eventDate, 825, 342, 300)
    drawTicketValue(canvas, 'Organisation', ticket.organisation, 88, 435, 1020)
  }

  canvas.rect(1200, 56, 360, 474, '#f5f6f3')
  canvas.line(1200, 56, 1200, 530, '#0a0a0a', 2, [10, 10])
  canvas.circle(1200, 78, 18, '#ffffff')
  canvas.circle(1200, 508, 18, '#ffffff')
  canvas.text('ADMIT ONE', 1260, 110, 18, 'F4', '#1a6b3c')
  canvas.text(ticket.dateShort, 1255, 185, 58, 'F4', '#0a0a0a', 250, 42)
  canvas.rect(1245, 220, 250, 5, '#1a6b3c')
  canvas.text('VENUE', 1245, 252, 14, 'F4', '#1a6b3c')
  canvas.text('AMAL JYOTHI', 1245, 286, 25, 'F4')
  canvas.text('COLLEGE OF ENGINEERING', 1245, 309, 13, 'F4')
  canvas.text('AUTONOMOUS', 1245, 330, 11, 'F4', '#6b6b65')
  canvas.text('KOOVAPPALLY - KANJIRAPPALLY', 1245, 359, 11, 'F3', '#6b6b65', 275, 9)
  canvas.text('KOTTAYAM DISTRICT', 1245, 379, 11, 'F3', '#6b6b65')
  canvas.text(ticket.ticketCode, 1260, 425, 17, 'F3', '#6b6b65', 250, 12)
  canvas.rect(1260, 452, 230, 8, '#ff1e1e')

  const stream = ['q', ...canvas.commands, 'Q'].join('\n')
  const objects = [
    makePdfObject(1, '<< /Type /Catalog /Pages 2 0 R >>'),
    makePdfObject(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),
    makePdfObject(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${TICKET_WIDTH} ${TICKET_HEIGHT}] /Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R /F4 8 0 R >> >> /Contents 4 0 R >>`),
    makePdfObject(4, `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`),
    makePdfObject(5, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'),
    makePdfObject(6, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'),
    makePdfObject(7, '<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>'),
    makePdfObject(8, '<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>'),
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
  const whatsappText = ticket.whatsappGroupUrl ? `\nJoin the official ${ticket.whatsappGroupName} WhatsApp group for event updates: ${ticket.whatsappGroupUrl}\n` : ''
  const htmlRows = rows.map(([label, value]) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #deded8;color:#686864;font-size:12px;text-transform:uppercase;letter-spacing:.08em">${escapeHtml(label)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #deded8;color:#111;font-size:15px;font-weight:700">${escapeHtml(value)}</td>
    </tr>`).join('')
  return {
    text: `Hello ${ticket.name},\n\nYour AI Conclave 2026 registration has been received.\n\n${textRows}\nVenue: ${VENUE}\n${whatsappText}\nYour ticket is attached as a PDF. You can also view your registration at ${registrationsUrl}.\n\nAI Conclave 2026\nAmal Jyothi College of Engineering`,
    html: `<!doctype html><html><body style="margin:0;background:#f4f4f1;font-family:Arial,sans-serif;color:#111"><div style="max-width:680px;margin:0 auto;padding:28px 14px"><div style="border-top:7px solid #ff2229;background:#fff;border-left:1px solid #aaa;border-right:1px solid #aaa;border-bottom:1px solid #aaa"><div style="padding:28px 28px 18px"><div style="font:700 13px monospace;letter-spacing:.12em;color:#187440">REGISTRATION CONFIRMED</div><h1 style="font:700 30px monospace;margin:12px 0">AI CONCLAVE 2026</h1><p style="font-size:16px;line-height:1.55;color:#555">Hello ${escapeHtml(ticket.name)}, your registration has been received. Keep the attached ticket for event day.</p></div><table style="width:100%;border-collapse:collapse">${htmlRows}</table><div style="padding:22px 28px"><p style="font-size:14px;line-height:1.5"><strong>Venue</strong><br>${escapeHtml(VENUE)}</p>${ticket.whatsappGroupUrl ? `<div style="margin:18px 0;padding:18px;background:#eef8f1;border-left:4px solid #168c4b"><strong style="display:block;margin-bottom:8px">Join the official ${escapeHtml(ticket.whatsappGroupName)} WhatsApp group</strong><span style="display:block;margin-bottom:12px;color:#4b554e;font-size:14px">Get schedules, announcements and event-day updates.</span><a href="${escapeHtml(ticket.whatsappGroupUrl)}" style="display:inline-block;padding:13px 18px;background:#168c4b;color:#fff;text-decoration:none;font:700 13px monospace">JOIN WHATSAPP GROUP →</a></div>` : ''}<a href="${escapeHtml(registrationsUrl)}" style="display:inline-block;padding:13px 18px;background:#111;color:#fff;text-decoration:none;font:700 13px monospace">VIEW MY REGISTRATIONS →</a></div></div><p style="font-size:12px;color:#777;text-align:center">This is an automatic registration confirmation. Please do not share your ticket publicly.</p></div></body></html>`,
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
        whatsappGroupName: 'panel discussion',
        whatsappGroupUrl: WHATSAPP_GROUPS.panel,
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
        whatsappGroupName: 'hackathon',
        whatsappGroupUrl: WHATSAPP_GROUPS.hackathon,
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

export const _test = { createTicketPdf, buildEmailBodies, buildMimeMessage, escapeHtml, safeHeader, WHATSAPP_GROUPS }
