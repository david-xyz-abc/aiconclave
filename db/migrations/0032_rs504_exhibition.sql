-- Alpha: the combined RS504 505 506 room is Technical Exhibition.
-- Apply after clearing the previous alpha simulation, never across active assignments.
CREATE TABLE venue_plan_0032_guard(n INTEGER CHECK(n=0));
INSERT INTO venue_plan_0032_guard SELECT COUNT(*) FROM venue_allocations WHERE table_id IN (SELECT id FROM venue_tables WHERE room_id=1009);
CREATE TABLE venue_plan_0032_room AS SELECT * FROM venue_rooms WHERE id=1009;
UPDATE venue_rooms SET project_mode='Prepared',solution_type='Technical' WHERE id=1009 AND name='RS504 505 506';
DROP TABLE venue_plan_0032_guard;
