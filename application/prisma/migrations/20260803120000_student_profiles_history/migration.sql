CREATE TABLE "student_profiles" (
  "id" BIGSERIAL NOT NULL,
  "user_id" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "admission_route" TEXT NOT NULL,
  "form_data" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "prediction_history" (
  "id" BIGSERIAL NOT NULL,
  "user_id" INTEGER NOT NULL,
  "admission_route" TEXT NOT NULL,
  "form_data" JSONB NOT NULL,
  "result_count" INTEGER NOT NULL DEFAULT 0,
  "zone_counts" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "prediction_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "student_profiles_user_id_admission_route_name_key"
  ON "student_profiles"("user_id", "admission_route", "name");
CREATE INDEX "student_profiles_user_id_admission_route_updated_at_idx"
  ON "student_profiles"("user_id", "admission_route", "updated_at");
CREATE INDEX "prediction_history_user_id_admission_route_created_at_idx"
  ON "prediction_history"("user_id", "admission_route", "created_at");

ALTER TABLE "student_profiles"
  ADD CONSTRAINT "student_profiles_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prediction_history"
  ADD CONSTRAINT "prediction_history_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
