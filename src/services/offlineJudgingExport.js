// Fill the styled workbook template without adding a spreadsheet engine to the browser bundle.
export const OFFLINE_TEMPLATE_URL = '/templates/offline-judging.xlsx';
const PAGE_ROWS = 13;
const SHEETS = [
  {name:'Evaluation',firstRow:7,columns:10,lastColumn:'J'},
  {name:'Award Nominations',firstRow:14,columns:20,lastColumn:'T'},
];
const xmlText = value => String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'')
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');

function cell(reference, value, style) {
  if (value === '' || value == null) return `<x:c r="${reference}" s="${style}"/>`;
  if (typeof value === 'number') return `<x:c r="${reference}" s="${style}" t="n"><x:v>${value}</x:v></x:c>`;
  return `<x:c r="${reference}" s="${style}" t="inlineStr"><x:is><x:t xml:space="preserve">${xmlText(value)}</x:t></x:is></x:c>`;
}

function fillSheet(xml, spec, teams, judge, generatedAt) {
  const sheetData = xml.match(/<x:sheetData>([\s\S]*?)<\/x:sheetData>/)?.[1];
  if (!sheetData) throw new Error('The offline workbook template could not be read. Refresh and try again.');
  const rows = [...sheetData.matchAll(/<x:row\b[^>]*r="(\d+)"[^>]*>[\s\S]*?<\/x:row>/g)];
  const header = rows.filter(row => Number(row[1]) < spec.firstRow).map(row => row[0]).join('');
  const prototypes = [spec.firstRow,spec.firstRow+1].map(number => {
    const row = rows.find(item => Number(item[1]) === number)?.[0];
    const height = row?.match(/\bht="([\d.]+)"/)?.[1];
    const styles = [...(row || '').matchAll(/<x:c\b[^>]*\bs="(\d+)"/g)].map(match => match[1]);
    if (!height || styles.length !== spec.columns) throw new Error('The offline workbook template is incomplete.');
    return {height,styles};
  });
  const count = Math.ceil(teams.length/PAGE_ROWS)*PAGE_ROWS;
  const body = Array.from({length:count},(_,index) => {
    const rowNumber = spec.firstRow+index;
    const team = teams[index];
    const values = team ? spec.name === 'Evaluation'
      ? [index+1,`${team.room_name}\nTable ${team.table_number}`,team.participant_category,team.sector_track]
      : [index+1,team.team_code] : [];
    const {height,styles} = prototypes[index%2];
    return `<x:row r="${rowNumber}" ht="${height}" customHeight="1">${styles.map((style,column) =>
      cell(`${String.fromCharCode(65+column)}${rowNumber}`,values[column],style)).join('')}</x:row>`;
  }).join('');
  const date = new Date(generatedAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'});
  xml = xml.replace(/<x:sheetData>[\s\S]*?<\/x:sheetData>/,() => `<x:sheetData>${header}${body}</x:sheetData>`)
    .replace('{{JUDGE}}',() => xmlText(judge.name)).replace('{{EXPORTED}}',() => xmlText(`${date} IST`));
  xml = xml.replace(/<x:c\b([^>]*?)t="str"([^>]*)><x:v>([\s\S]*?)<\/x:v><\/x:c>/g,
    (_,before,after,value)=>`<x:c${before}t="inlineStr"${after}><x:is><x:t xml:space="preserve">${value}</x:t></x:is></x:c>`);
  // Print one sheet wide, with a new page after every 13 teams and repeated headers.
  xml = xml.replace(/<x:sheetPr\b[^>]*\/>|<x:sheetPr\b[^>]*>[\s\S]*?<\/x:sheetPr>/g,'')
    .replace(/<x:worksheet\b[^>]*>/,match => `${match}<x:sheetPr><x:pageSetUpPr fitToPage="1" autoPageBreaks="0"/></x:sheetPr>`);
  for (const name of ['pageMargins','pageSetup','headerFooter','rowBreaks','printOptions']) {
    xml = xml.replace(new RegExp(`<x:${name}\\b[^>]*\\/>|<x:${name}\\b[^>]*>[\\s\\S]*?<\\/x:${name}>`,'g'),'');
  }
  const breaks = Array.from({length:count/PAGE_ROWS-1},(_,i) =>
    `<x:brk id="${spec.firstRow-1+(i+1)*PAGE_ROWS}" min="0" max="16383" man="1"/>`).join('');
  const note = spec.name === 'Evaluation'
    ? 'Type = College / School | Theme = Agriculture / Healthcare / Education\nTie-Breaker: If Total is equal, compare Impact and Creativity scores together.'
    : 'Tick all awards a team qualifies for.';
  const print = `<x:printOptions horizontalCentered="1"/><x:pageMargins left="0.25" right="0.25" top="0.25" bottom="0.5" header="0.1" footer="0.15"/>
    <x:pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>
    <x:headerFooter><x:oddFooter>${xmlText(`&L&8${note}&R&P / &N`)}</x:oddFooter></x:headerFooter>
    ${breaks ? `<x:rowBreaks count="${count/PAGE_ROWS-1}" manualBreakCount="${count/PAGE_ROWS-1}">${breaks}</x:rowBreaks>` : ''}`;
  return xml.replace('</x:worksheet>',`${print}</x:worksheet>`);
}

export async function createOfflineJudgingWorkbook({judge,teams,generatedAt}, templateBytes) {
  if (!judge?.id || !judge?.name || !Array.isArray(teams) || !teams.length) throw new Error('This judge has no assigned teams yet.');
  if (Number.isNaN(new Date(generatedAt).getTime())) throw new Error('The export timestamp is missing. Please try again.');
  if (teams.some(team => !team.team_code || !team.room_name || !Number.isInteger(team.table_number) ||
    !['College','School'].includes(team.participant_category) || !['Agriculture','Healthcare','Education'].includes(team.sector_track))) {
    throw new Error('An assigned team is missing its location or registration details. Review the assignments before downloading.');
  }
  if (new Set(teams.map(team=>team.team_id)).size !== teams.length) throw new Error('The assignment list contains a repeated team. Refresh and try again.');
  const ordered = [...teams].sort((a,b)=>a.visit_order-b.visit_order || a.team_id-b.team_id);
  const {unzipSync,zipSync,strToU8,strFromU8} = await import('fflate');
  const files = unzipSync(new Uint8Array(templateBytes));
  for (const [index,spec] of SHEETS.entries()) {
    const path = `xl/worksheets/sheet${index+1}.xml`;
    if (!files[path]) throw new Error('The offline workbook template is incomplete.');
    files[path] = strToU8(fillSheet(strFromU8(files[path]),spec,ordered,judge,generatedAt));
  }
  const count = Math.ceil(teams.length/PAGE_ROWS)*PAGE_ROWS;
  const names = SHEETS.map((sheet,index) => {
    const quoted = `'${sheet.name}'`;
    return `<x:definedName name="_xlnm.Print_Area" localSheetId="${index}">${quoted}!$A$1:$${sheet.lastColumn}$${sheet.firstRow+count-1}</x:definedName>
      <x:definedName name="_xlnm.Print_Titles" localSheetId="${index}">${quoted}!$1:$${sheet.firstRow-1}</x:definedName>`;
  }).join('');
  const workbook = strFromU8(files['xl/workbook.xml']).replace(/<x:definedNames>[\s\S]*?<\/x:definedNames>/,'')
    .replace('</x:sheets>',`</x:sheets><x:definedNames>${names}</x:definedNames>`);
  files['xl/workbook.xml'] = strToU8(workbook);
  const safeName = judge.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'judge';
  return {bytes:zipSync(files,{level:6}),filename:`ai-conclave-offline-${safeName}-${generatedAt.slice(0,10)}.xlsx`};
}

export async function downloadOfflineJudgingWorkbook(data) {
  const response = await fetch(OFFLINE_TEMPLATE_URL);
  if (!response.ok) throw new Error('Could not load the judging sheet format. Please try again.');
  const {bytes,filename} = await createOfflineJudgingWorkbook(data,await response.arrayBuffer());
  const url = URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  const anchor = document.createElement('a');
  anchor.href=url; anchor.download=filename; document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
