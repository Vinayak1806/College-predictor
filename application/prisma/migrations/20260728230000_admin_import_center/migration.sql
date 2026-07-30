CREATE TABLE "admin_imports" (
    "id" BIGSERIAL NOT NULL,
    "document_type" TEXT NOT NULL,
    "admission_route" TEXT,
    "academic_year" TEXT,
    "cap_round" INTEGER,
    "quota" TEXT,
    "original_filename" TEXT NOT NULL,
    "stored_path" TEXT NOT NULL,
    "mime_type" TEXT,
    "file_size" INTEGER NOT NULL,
    "file_hash" TEXT NOT NULL,
    "source_url" TEXT,
    "status" TEXT NOT NULL,
    "summary" JSONB,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "rolled_back_at" TIMESTAMP(3),

    CONSTRAINT "admin_imports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admin_import_records" (
    "id" BIGSERIAL NOT NULL,
    "import_id" BIGINT NOT NULL,
    "row_number" INTEGER NOT NULL,
    "record_type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "valid" BOOLEAN NOT NULL DEFAULT false,
    "needs_review" BOOLEAN NOT NULL DEFAULT true,
    "issues" JSONB,
    "published_record_id" BIGINT,

    CONSTRAINT "admin_import_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_imports_file_hash_key" ON "admin_imports"("file_hash");
CREATE INDEX "admin_imports_status_created_at_idx" ON "admin_imports"("status", "created_at");
CREATE UNIQUE INDEX "admin_import_records_import_id_row_number_key" ON "admin_import_records"("import_id", "row_number");
CREATE INDEX "admin_import_records_import_id_valid_needs_review_idx" ON "admin_import_records"("import_id", "valid", "needs_review");

ALTER TABLE "admin_import_records"
ADD CONSTRAINT "admin_import_records_import_id_fkey"
FOREIGN KEY ("import_id") REFERENCES "admin_imports"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
