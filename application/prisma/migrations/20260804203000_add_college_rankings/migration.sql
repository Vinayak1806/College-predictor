CREATE TABLE "college_rankings" (
    "id" BIGSERIAL NOT NULL,
    "institute_code" TEXT NOT NULL,
    "ranking_system" TEXT NOT NULL,
    "ranking_year" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "rank" INTEGER,
    "band" TEXT,
    "score" DECIMAL(10,4),
    "matched_name" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "source_url" TEXT,
    "source_file" TEXT,

    CONSTRAINT "college_rankings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "college_rankings_institute_code_ranking_system_ranking_year_category_key"
ON "college_rankings"("institute_code", "ranking_system", "ranking_year", "category");

CREATE INDEX "college_rankings_ranking_system_ranking_year_category_rank_idx"
ON "college_rankings"("ranking_system", "ranking_year", "category", "rank");

ALTER TABLE "college_rankings"
ADD CONSTRAINT "college_rankings_institute_code_fkey"
FOREIGN KEY ("institute_code") REFERENCES "colleges"("institute_code")
ON DELETE RESTRICT ON UPDATE CASCADE;
