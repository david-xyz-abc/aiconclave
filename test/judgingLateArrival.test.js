import test from 'node:test';
import assert from 'node:assert/strict';
import {judgeRoute} from '../judging/shared/assignments.js';

test('late check-ins do not block a fixed route; actual route changes still do', () => {
 const judge={id:'j',assignment_solution_type:'Technical',mode_filter:'Prepared',sector_filter:''};
 const team=(id,n,room=1)=>({team_id:id,table_id:n,table_number:n,room_id:room,attendance_marked:1,lead_present:1,present_count:3,table_seats:4,solution_type:'Technical',project_mode:'Prepared'});
 const data={rooms:[{id:1},{id:2}],teams:[team(1,204),team(2,496,2)],assignments:[{judge_id:'j',team_id:1,table_id:204,visit_order:1},{judge_id:'j',team_id:2,table_id:496,visit_order:2}]};
 assert.equal(judgeRoute(data,judge).needsReview,false);
 data.teams.push(team(3,205));
 assert.equal(judgeRoute(data,judge).needsReview,false);
 data.teams[0].table_id=999;
 assert.equal(judgeRoute(data,judge).needsReview,true);
 data.teams[0].table_id=204;
 data.teams[0].lead_present=0;
 assert.equal(judgeRoute(data,judge).needsReview,true);
 data.teams[0].lead_present=1;
 data.rooms.reverse();
 assert.equal(judgeRoute(data,judge).needsReview,true);
});
