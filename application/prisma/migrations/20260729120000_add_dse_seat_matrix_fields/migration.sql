ALTER TABLE "seat_matrices"
ADD COLUMN "vacant_seats" INTEGER,
ADD COLUMN "lateral_entry_seats" INTEGER,
ADD COLUMN "pwd_seats" INTEGER,
ADD COLUMN "defence_seats" INTEGER,
ADD COLUMN "category_seats" JSONB;
