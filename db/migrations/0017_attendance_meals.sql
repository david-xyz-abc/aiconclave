-- Legacy records remain unknown; never infer a meal preference.
ALTER TABLE hackathon_attendance ADD COLUMN meal_preference TEXT
  CHECK (meal_preference IS NULL OR (present = 1 AND meal_preference IN ('Veg', 'Non-Veg')));
