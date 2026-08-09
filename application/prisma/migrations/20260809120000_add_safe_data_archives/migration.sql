ALTER TABLE "cutoff_datasets"
ADD COLUMN "prediction_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "history_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "archived_at" TIMESTAMP(3);

CREATE TABLE "college_route_archives" (
    "id" BIGSERIAL NOT NULL,
    "college_id" BIGINT NOT NULL,
    "admission_route" TEXT NOT NULL,
    "reason" TEXT,
    "archived_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "college_route_archives_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "college_route_archives_college_id_admission_route_key"
ON "college_route_archives"("college_id", "admission_route");

CREATE INDEX "college_route_archives_admission_route_archived_at_idx"
ON "college_route_archives"("admission_route", "archived_at");

ALTER TABLE "college_route_archives"
ADD CONSTRAINT "college_route_archives_college_id_fkey"
FOREIGN KEY ("college_id") REFERENCES "colleges"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
