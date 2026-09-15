import { AWARDS, CRITERIA } from '../../judging/shared/evaluation.js';
import { scorecardTemplates } from './scorecardTemplates.js';

const xml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c])).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
const column = n => String.fromCharCode(65 + n);
const awardIds = ['Agriculture','Healthcare','Education'].flatMap(sector => AWARDS[sector].map(([id]) => id));

export async function createJudgeScorecardWorkbook(rows, kind) {
  const template = scorecardTemplates[kind];
  if (!template) throw new Error('Choose a valid scorecard.');
  if (!rows.length) throw new Error('No submitted evaluations to export.');
  const {unzipSync,zipSync,strFromU8,strToU8} = await import('fflate');
  const files = unzipSync(Uint8Array.from(atob(template.base64), c => c.charCodeAt(0)));
  const normalize = value => value.replace(/(<\/?)(?:x:)/g, '$1').replace('xmlns:x=', 'xmlns=');
  let sheet = normalize(strFromU8(files['xl/worksheets/sheet1.xml']));
  const start = template.dataRow, last = start + rows.length - 1;
  const rowPattern = new RegExp(`<row\\b[^>]*\\br="${start}"[^>]*>[\\s\\S]*?<\\/row>`);
  const prototype = sheet.match(rowPattern)?.[0];
  if (!prototype) throw new Error('Scorecard layout could not be loaded.');
  const styles = [...prototype.matchAll(/<c\b([^>]*)>/g)].map(([,attrs]) => attrs.match(/\bs="(\d+)"/)?.[1] || '0');
  const body = rows.map((row,index) => {
    const r = start + index;
    const nominations = typeof row.nominations === 'string' ? JSON.parse(row.nominations) : row.nominations || [];
    const values = kind === 'evaluation'
      ? [index+1,row.team_code,row.participant_category,row.sector,...CRITERIA.map(c=>row.scores[c.id]),row.total]
      : [index+1,row.team_code,...awardIds.map(id=>!row.not_present && nominations.includes(id) ? '✓' : '')];
    const cells = values.map((v,i) => {
      const ref = `${column(i)}${r}`, style = styles[i] || styles[0];
      if (kind === 'evaluation' && i === 9) return `<c r="${ref}" s="${style}"><f>SUM(E${r}:I${r})</f><v>${Number(v)}</v></c>`;
      return typeof v === 'number'
        ? `<c r="${ref}" s="${style}"><v>${v}</v></c>`
        : `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`;
    }).join('');
    return `<row r="${r}" ht="32" customHeight="1">${cells}</row>`;
  }).join('');
  sheet = sheet.replace(rowPattern, body).replace(/<dimension\b[^>]*\/>/, `<dimension ref="A1:${template.end}${last+2}"/>`);
  const note = kind === 'evaluation'
    ? 'Type = College / School   |   Theme = Agriculture / Healthcare / Education   |   Tie-Breaker: if Total is equal, compare Impact and Creativity scores together.'
    : 'Ticks show recorded award nominations. Blank award cells mean no nomination for that award.';
  sheet = sheet.replace('</sheetData>', `<row r="${last+2}" ht="30" customHeight="1"><c r="A${last+2}" t="inlineStr"><is><t>${xml(note)}</t></is></c></row></sheetData>`);
  sheet = sheet.replace(/<mergeCells count="(\d+)">/, (_,n)=>`<mergeCells count="${Number(n)+1}">`).replace('</mergeCells>', `<mergeCell ref="A${last+2}:${template.end}${last+2}"/></mergeCells>`);
  sheet = sheet.replace(/<pageMargins\b[^>]*\/>/g,'').replace(/<pageSetup\b[^>]*\/>/g,'');
  sheet = sheet.replace('</worksheet>', '<pageMargins left="0.25" right="0.25" top="0.3" bottom="0.3" header="0.1" footer="0.1"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>');
  sheet = sheet.replace(/<sheetPr\s*\/>/, '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>');
  if (!sheet.includes('<sheetPr')) sheet = sheet.replace(/(<worksheet\b[^>]*>)/, '$1<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>');
  else if (!sheet.includes('fitToPage=')) sheet = sheet.replace('</sheetPr>', '<pageSetUpPr fitToPage="1"/></sheetPr>');
  files['xl/worksheets/sheet1.xml'] = strToU8(sheet);
  let workbook = normalize(strFromU8(files['xl/workbook.xml']));
  const names = `<definedNames><definedName name="_xlnm.Print_Area" localSheetId="0">'${template.sheetName}'!$A$1:$${template.end}$${last+2}</definedName><definedName name="_xlnm.Print_Titles" localSheetId="0">'${template.sheetName}'!$1:$${start-1}</definedName></definedNames>`;
  workbook = workbook.replace(/<definedNames[\s\S]*?<\/definedNames>/,'').replace('</sheets>', '</sheets>'+names);
  files['xl/workbook.xml'] = strToU8(workbook);
  return {bytes:zipSync(files,{level:6}),filename:`ai-conclave-judges-${kind}-sheet.xlsx`};
}

export async function downloadJudgeScorecardWorkbook(rows,kind) {
  const {bytes,filename} = await createJudgeScorecardWorkbook(rows,kind);
  const url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
