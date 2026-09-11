// Reproducible alpha planning seed: approximately half of each group per mode.
import { writeFileSync } from 'node:fs';
const groups = [
 ['RS','Agriculture','Technical',[16,27,59]], ['RS','Agriculture','Non-Technical',[4,3,8]],
 ['R','Education','Technical',[19,22,61]], ['R','Education','Non-Technical',[1,3,11]],
 ['CC','Healthcare','Technical',[20,40,92]], ['D','Healthcare','Non-Technical',[2,1,7]],
];
const quote = s => `'${s.replaceAll("'", "''")}'`;
let roomId = 0, tableId = 0;
const sequence = {}, rooms = [], tables = [];
for (const [block, sector, type, sizes] of groups) {
 for (const [index, count] of sizes.entries()) {
  for (const [mode, n] of [['Prepared',Math.floor(count/2)],['Starting from scratch',Math.ceil(count/2)]]) {
   let capacities = Array(Math.ceil(n/10)).fill(10);
   if (index === 2 && type === 'Technical' && block === 'RS') capacities = [15,15];
   if (index === 2 && type === 'Technical' && block === 'R') capacities = n === 30 ? [15,15] : [15,10,10];
   for (const capacity of capacities) {
    const name = `${block}-${100 + (sequence[block] = (sequence[block] || 0) + 1)}`;
    roomId++;
    rooms.push(`(${roomId},${quote(name)},${quote(block)},${quote(mode)},${quote(sector)},${quote(type)},${index+2})`);
    for (let number=1;number<=capacity;number++) tables.push(`(${++tableId},${roomId},${number})`);
   }
  }
 }
}
if (roomId !== 53 || tableId !== 565) throw new Error('Unexpected planning totals');
writeFileSync(new URL('../db/migrations/0020_alpha_venue_plan.sql',import.meta.url),
 `-- Provisional 53-room alpha plan: 46 ten-table rooms and seven fifteen-table rooms.\nINSERT INTO venue_rooms VALUES\n${rooms.join(',\n')};\nINSERT INTO venue_tables VALUES\n${tables.join(',\n')};\n`);
console.log(`${roomId} rooms, ${tableId} tables`);
