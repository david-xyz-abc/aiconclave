"""Historical importer for the original 0025 plan; not for revised spreadsheets.

The revised exhibition plan is in 0026_exhibition_allocation.sql.
"""
import collections
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
def rows(path):
    with zipfile.ZipFile(path) as z:
        strings = [''.join(e.itertext()) for e in ET.fromstring(z.read('xl/sharedStrings.xml'))] if 'xl/sharedStrings.xml' in z.namelist() else []
        result = []
        for row in ET.fromstring(z.read('xl/worksheets/sheet1.xml')).findall('s:sheetData/s:row', NS):
            values = {}
            for cell in row:
                v = cell.find('s:v', NS)
                value = v.text if v is not None else None
                if cell.get('t') == 's': value = strings[int(value)]
                if cell.get('t') == 'inlineStr': value = ''.join(cell.find('s:is', NS).itertext())
                values[re.sub(r'\d', '', cell.get('r'))] = value
            result.append(values)
        return result

raise SystemExit('Historical importer disabled: use the reviewed 0026 exhibition migration; do not regenerate the initial venue reset.')

detail = [r for r in rows(Path.home() / 'Downloads/table numbering.xlsx') if re.fullmatch(r'T\d+', r.get('A') or '')]
summary = [r for r in rows(Path.home() / 'Downloads/tables per venue.xlsx') if r.get('A') and re.fullmatch(r'T\d+-T\d+', r.get('F') or '')]
assert [r['A'] for r in detail] == [f'T{i}' for i in range(1, 569)]
assert len(summary) == 23
venues = []
for i, r in enumerate(summary, 1):
    start, end = map(int, re.findall(r'\d+', r['F']))
    matched = [t for t in detail if t['B'] == r['B']]
    assert len(matched) == int(float(r['D'])) == end-start+1
    assert [t['A'] for t in matched] == [f'T{n}' for n in range(start, end+1)]
    assert all(t['C'] == r['C'] and float(t['D']) == float(r['E']) for t in matched)
    venues.append(dict(id=1000+i, name='RS504' if r['B'] == 'RS504 505 506' else r['B'], category=r['C'], seats=int(float(r['E'])), start=start, end=end))
assert sum(v['end']-v['start']+1 for v in venues) == 568
(ROOT / 'db/real-venues.json').write_text(json.dumps(venues, indent=2)+'\n')
quote = lambda s: "'"+s.replace("'", "''")+"'"
sql = '''-- Alpha only. Reconciled against both supplied spreadsheets; 23 venues, T1-T568.
-- Preserve the prior plan and assignment metadata for audit/recovery.
PRAGMA defer_foreign_keys=ON;
CREATE TABLE venue_plan_0025_rooms AS SELECT * FROM venue_rooms;
CREATE TABLE venue_plan_0025_tables AS SELECT * FROM venue_tables;
CREATE TABLE venue_plan_0025_allocations AS SELECT * FROM venue_allocations;
CREATE TABLE venue_plan_0025_judging AS SELECT * FROM judging_assignments;
CREATE TABLE venue_plan_0025_room_order AS SELECT * FROM judging_room_order;
CREATE TABLE venue_rooms_new (
 id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, block TEXT NOT NULL,
 project_mode TEXT CHECK(project_mode IN ('Prepared','Starting from scratch')),
 sector TEXT CHECK(sector IN ('Agriculture','Education','Healthcare')),
 solution_type TEXT NOT NULL CHECK(solution_type IN ('Technical','Non-Technical')),
 seats INTEGER NOT NULL CHECK(seats IN (2,3,4))
);
INSERT INTO venue_rooms_new SELECT * FROM venue_rooms;
DROP TABLE venue_rooms;
ALTER TABLE venue_rooms_new RENAME TO venue_rooms;
'''
for action in ['insert', 'update', 'delete']:
    sql += f'CREATE TRIGGER judging_track_venue_rooms_{action} AFTER {action.upper()} ON venue_rooms BEGIN UPDATE judging_state SET revision=revision+1 WHERE id=1; END;\n'
sql += 'INSERT INTO venue_rooms(id,name,block,project_mode,sector,solution_type,seats) VALUES\n'
# The workbooks do not specify blocks: leave them blank instead of inventing locations.
sql += ',\n'.join(f"({v['id']},{quote(v['name'])},'',NULL,NULL,{quote(v['category'])},{v['seats']})" for v in venues)+';\n'
sql += 'INSERT INTO venue_tables(id,room_id,table_number,seats) VALUES\n'
sql += ',\n'.join(f"({10000+n},{v['id']},{n},{v['seats']})" for v in venues for n in range(v['start'],v['end']+1))+';\n'
sql += '''DELETE FROM venue_allocations;
-- User requested a fresh start: do not reassign dummy allocations.
DELETE FROM judging_assignments;
CREATE TABLE venue_plan_0025_guard(ok INTEGER CHECK(ok=1));
INSERT INTO venue_plan_0025_guard SELECT COUNT(*)=0 FROM venue_allocations;
INSERT INTO venue_plan_0025_guard SELECT COUNT(*)=0 FROM judging_assignments;
DELETE FROM judging_room_order;
INSERT INTO judging_room_order SELECT id,id-1000 FROM venue_rooms WHERE id BETWEEN 1001 AND 1023;
DELETE FROM venue_tables WHERE id NOT BETWEEN 10001 AND 10568;
DELETE FROM venue_rooms WHERE id NOT BETWEEN 1001 AND 1023;
INSERT INTO venue_plan_0025_guard SELECT COUNT(*)=568 AND COUNT(DISTINCT table_number)=568 AND MIN(table_number)=1 AND MAX(table_number)=568 FROM venue_tables;
INSERT INTO venue_plan_0025_guard SELECT COUNT(*)=23 FROM venue_rooms;
INSERT INTO venue_plan_0025_guard SELECT COUNT(*)=0 FROM pragma_foreign_key_check;
DROP TABLE venue_plan_0025_guard;
PRAGMA defer_foreign_keys=OFF;
'''
(ROOT / 'db/migrations/0025_real_venue_plan.sql').write_text(sql)
print('Validated all 568 tables and 23 venues; generated alpha migration.')
