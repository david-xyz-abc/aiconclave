import test from 'node:test';
import assert from 'node:assert/strict';
import {orderedTeams,SIDES,MODES} from '../judging/shared/assignments.js';
test('assignment filters independently select all four side/preparation combinations in mixed-sector rooms',()=>{
 const data={rooms:[{id:1,sector:null}],teams:SIDES.flatMap((solution_type,i)=>MODES.map((project_mode,j)=>({team_id:i*2+j+1,table_id:i*2+j+1,room_id:1,table_number:i*2+j+1,solution_type,project_mode,sector_track:j?'Education':'Agriculture',attendance_marked:1,lead_present:1,present_count:2,table_seats:3})))};
 for(const side of SIDES)for(const mode of MODES){const rows=orderedTeams(data,{solution_type:side,mode,sector:''});assert.equal(rows.length,1);assert.equal(rows[0].solution_type,side);assert.equal(rows[0].project_mode,mode);}
 assert.equal(orderedTeams(data,{solution_type:'Technical',mode:'Prepared',sector:'Education'}).length,0);
});
