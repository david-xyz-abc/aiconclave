-- Keep Alphonsa Hall for exhibition. Apply after clearing simulated allocations.
CREATE TABLE venue_plan_0034_guard(n INTEGER CHECK(n=0));
INSERT INTO venue_plan_0034_guard SELECT COUNT(*) FROM venue_allocations;
CREATE TABLE venue_plan_0034_rooms AS SELECT * FROM venue_rooms;
UPDATE venue_rooms SET project_mode='Starting from scratch' WHERE name IN ('RS504 505 506','RS508','RS703','RS705','RS706','RS806') AND solution_type='Technical';
DROP TABLE venue_plan_0034_guard;
