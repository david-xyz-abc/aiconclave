-- Alpha only: updated tables per venue.xlsx. Preserve seating inventory and compatible assignments.
CREATE TABLE venue_plan_0026_rooms AS SELECT * FROM venue_rooms;
CREATE TABLE venue_plan_0026_allocations AS SELECT * FROM venue_allocations;
UPDATE venue_rooms SET name='Rb Auditorium', solution_type='Technical', project_mode='Starting from scratch', sector=NULL WHERE id=1001;
UPDATE venue_rooms SET name='RS203', solution_type='Technical', project_mode='Starting from scratch', sector=NULL WHERE id=1002;
UPDATE venue_rooms SET name='RS205', solution_type='Technical', project_mode='Starting from scratch', sector=NULL WHERE id=1003;
UPDATE venue_rooms SET name='RS209', solution_type='Technical', project_mode='Starting from scratch', sector=NULL WHERE id=1004;
UPDATE venue_rooms SET name='2nd Corridor', solution_type='Technical', project_mode='Prepared', sector=NULL WHERE id=1005;
UPDATE venue_rooms SET name='RS305', solution_type='Technical', project_mode='Starting from scratch', sector=NULL WHERE id=1006;
UPDATE venue_rooms SET name='3rd Corridor', solution_type='Technical', project_mode='Prepared', sector=NULL WHERE id=1007;
UPDATE venue_rooms SET name='RS503', solution_type='Technical', project_mode='Starting from scratch', sector=NULL WHERE id=1008;
UPDATE venue_rooms SET name='RS504', solution_type='Technical', project_mode='Starting from scratch', sector=NULL WHERE id=1009;
UPDATE venue_rooms SET name='RS508', solution_type='Technical', project_mode='Starting from scratch', sector=NULL WHERE id=1010;
UPDATE venue_rooms SET name='RS703', solution_type='Non-Technical', project_mode=NULL, sector=NULL WHERE id=1011;
UPDATE venue_rooms SET name='RS705', solution_type='Non-Technical', project_mode=NULL, sector=NULL WHERE id=1012;
UPDATE venue_rooms SET name='RS706', solution_type='Technical', project_mode='Starting from scratch', sector=NULL WHERE id=1013;
UPDATE venue_rooms SET name='RS802', solution_type='Technical', project_mode='Starting from scratch', sector=NULL WHERE id=1014;
UPDATE venue_rooms SET name='RS803', solution_type='Technical', project_mode='Starting from scratch', sector=NULL WHERE id=1015;
UPDATE venue_rooms SET name='RS806', solution_type='Technical', project_mode='Starting from scratch', sector=NULL WHERE id=1016;
UPDATE venue_rooms SET name='CCF LAB 1', solution_type='Technical', project_mode='Starting from scratch', sector=NULL WHERE id=1017;
UPDATE venue_rooms SET name='CCF LAB 2', solution_type='Technical', project_mode='Starting from scratch', sector=NULL WHERE id=1018;
UPDATE venue_rooms SET name='CCF LAB 3', solution_type='Technical', project_mode='Starting from scratch', sector=NULL WHERE id=1019;
UPDATE venue_rooms SET name='CCF LAB 4', solution_type='Technical', project_mode='Starting from scratch', sector=NULL WHERE id=1020;
UPDATE venue_rooms SET name='CCF Seminar hall', solution_type='Non-Technical', project_mode=NULL, sector=NULL WHERE id=1021;
UPDATE venue_rooms SET name='Incubation', solution_type='Non-Technical', project_mode=NULL, sector=NULL WHERE id=1022;
UPDATE venue_rooms SET name='Alphonsa Hall', solution_type='Technical', project_mode='Prepared', sector=NULL WHERE id=1023;
DELETE FROM venue_allocations WHERE NOT EXISTS (
 SELECT 1 FROM venue_requirements q JOIN venue_tables t ON t.id=venue_allocations.table_id
 JOIN venue_rooms r ON r.id=t.room_id WHERE q.team_id=venue_allocations.team_id
 AND r.solution_type=q.solution_type AND (r.project_mode IS NULL OR r.project_mode=q.project_mode)
 AND q.present_count>=2 AND q.lead_present=1 AND t.seats>=q.present_count
);
