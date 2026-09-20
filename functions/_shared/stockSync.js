// A durable claim is committed BEFORE fetch. Never reset an attempted row to pending:
// this intentionally provides at-most-one attempt, even if the response is lost.
export async function deliverOne(db, id, fetcher = fetch) {
  const row = await db.prepare(`UPDATE stock_checkin_deliveries SET status='sending',attempted_at=datetime('now')
    WHERE id=? AND status='pending' AND (SELECT enabled FROM stock_sync_control WHERE id=1)=1
    RETURNING *`).bind(id).first();
  if (!row) return;
  let status = 'uncertain', detail = 'No confirmed response; will not resend.', remoteId = null;
  const digits = row.phone.replace(/\D/g, '');
  const phone = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  if (!row.name.trim() || !row.email.trim() || !phone) {
    status = 'failed'; detail = 'Missing contact details. No request sent.';
  } else {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetcher('https://stock.aesajce.in/api', {
        method: 'POST', redirect: 'error', signal: controller.signal,
        headers: {'content-type':'application/json'},
        body: JSON.stringify({action:'addEventParticipant',event_id:row.event_id,name:row.name,email:row.email,phone}),
      });
      const reader = response.body?.getReader();
      let size = 0, text = ''; const decoder = new TextDecoder();
      if (!reader) throw new Error('Missing response');
      try {
        while (true) {
          const {done,value} = await reader.read(); if(done) break;
          size += value.byteLength;
          if(size > 16384) { await reader.cancel(); throw new Error('Response too large'); }
          text += decoder.decode(value,{stream:true});
        }
        text += decoder.decode();
      } finally { reader.releaseLock(); }
      const data = JSON.parse(text);
      if(response.ok && data.status === true) {
        status='sent'; detail='Participant added successfully.';
        remoteId=data.data?.participant_id == null ? null : String(data.data.participant_id).slice(0,80);
      } else if(data.status === false && response.status < 500) {
        status='failed'; detail='API rejected the request. Will not resend automatically.';
      }
    } catch { /* The remote side may have accepted it. Never retry. */ }
    finally { clearTimeout(timeout); }
  }
  await db.prepare(`UPDATE stock_checkin_deliveries SET status=?,detail=?,remote_id=?,finished_at=datetime('now')
    WHERE id=? AND status='sending'`).bind(status,detail,remoteId,id).run();
}

export async function dispatchPending(db, teamId = null, fetcher = fetch) {
  await db.prepare(`UPDATE stock_checkin_deliveries SET status='uncertain',detail='Delivery interrupted; will not resend.'
    WHERE status='sending' AND attempted_at < datetime('now','-2 minutes')`).run();
  const rows = await db.prepare(`SELECT id FROM stock_checkin_deliveries WHERE status='pending'
    AND (SELECT enabled FROM stock_sync_control WHERE id=1)=1 ${teamId === null ? '' : 'AND team_id=?'}
    ORDER BY id LIMIT 24`).bind(...(teamId === null ? [] : [teamId])).all();
  const ids = rows.results || [];
  for(let offset=0; offset<ids.length; offset+=4) {
    const outcomes=await Promise.allSettled(ids.slice(offset,offset+4).map(row=>deliverOne(db,row.id,fetcher)));
    if(outcomes.some(result=>result.status==='rejected')) console.error('Stock delivery storage operation failed');
  }
}
