-- Capacity belongs to each table. Keep room.seats only for older deployments.
-- Existing inventory and assignments are preserved; new tables default conservatively to 2.
ALTER TABLE venue_tables ADD COLUMN seats INTEGER NOT NULL DEFAULT 2 CHECK(seats IN (2,3,4));
UPDATE venue_tables SET seats = (SELECT seats FROM venue_rooms WHERE id = venue_tables.room_id);
CREATE INDEX venue_table_capacity ON venue_tables(seats, room_id, table_number);
