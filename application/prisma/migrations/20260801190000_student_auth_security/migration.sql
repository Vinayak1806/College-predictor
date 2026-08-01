-- Authentication tables use integer user IDs because Better Auth's serial-ID mode
-- expects database-generated numeric identifiers.
ALTER TABLE "shortlists" DROP CONSTRAINT IF EXISTS "shortlists_user_id_fkey";
ALTER TABLE "preference_lists" DROP CONSTRAINT IF EXISTS "preference_lists_user_id_fkey";

ALTER TABLE "users"
  ALTER COLUMN "id" TYPE INTEGER,
  ALTER COLUMN "email" SET NOT NULL,
  ADD COLUMN "name" TEXT NOT NULL DEFAULT 'Student',
  ADD COLUMN "email_verified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "image" TEXT,
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "users" ALTER COLUMN "name" DROP DEFAULT;
ALTER TABLE "shortlists" ALTER COLUMN "user_id" TYPE INTEGER;
ALTER TABLE "shortlists" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "preference_lists" ALTER COLUMN "user_id" TYPE INTEGER;
ALTER TABLE "preference_lists" ALTER COLUMN "user_id" SET NOT NULL;

CREATE TABLE "user_sessions" (
  "id" SERIAL NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "token" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "user_id" INTEGER NOT NULL,
  CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_accounts" (
  "id" SERIAL NOT NULL,
  "account_id" TEXT NOT NULL,
  "provider_id" TEXT NOT NULL,
  "user_id" INTEGER NOT NULL,
  "access_token" TEXT,
  "refresh_token" TEXT,
  "id_token" TEXT,
  "access_token_expires_at" TIMESTAMP(3),
  "refresh_token_expires_at" TIMESTAMP(3),
  "scope" TEXT,
  "password" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "auth_verifications" (
  "id" SERIAL NOT NULL,
  "identifier" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "auth_verifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "auth_rate_limits" (
  "id" SERIAL NOT NULL,
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL,
  "last_request" BIGINT NOT NULL,
  CONSTRAINT "auth_rate_limits_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admin_sessions" (
  "id" BIGSERIAL NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ip_hash" TEXT,
  "user_agent_hash" TEXT,
  CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "saved_comparisons" (
  "id" BIGSERIAL NOT NULL,
  "user_id" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "items" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "saved_comparisons_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_sessions_token_key" ON "user_sessions"("token");
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions"("user_id");
CREATE INDEX "user_sessions_expires_at_idx" ON "user_sessions"("expires_at");
CREATE UNIQUE INDEX "user_accounts_provider_id_account_id_key" ON "user_accounts"("provider_id", "account_id");
CREATE INDEX "user_accounts_user_id_idx" ON "user_accounts"("user_id");
CREATE INDEX "auth_verifications_identifier_idx" ON "auth_verifications"("identifier");
CREATE UNIQUE INDEX "auth_rate_limits_key_key" ON "auth_rate_limits"("key");
CREATE UNIQUE INDEX "admin_sessions_token_hash_key" ON "admin_sessions"("token_hash");
CREATE INDEX "admin_sessions_expires_at_idx" ON "admin_sessions"("expires_at");
CREATE UNIQUE INDEX "shortlists_user_id_college_branch_id_key" ON "shortlists"("user_id", "college_branch_id");
CREATE INDEX "shortlists_user_id_created_at_idx" ON "shortlists"("user_id", "created_at");
CREATE INDEX "preference_lists_user_id_updated_at_idx" ON "preference_lists"("user_id", "updated_at");
CREATE INDEX "saved_comparisons_user_id_updated_at_idx" ON "saved_comparisons"("user_id", "updated_at");

ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_accounts" ADD CONSTRAINT "user_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shortlists" ADD CONSTRAINT "shortlists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "preference_lists" ADD CONSTRAINT "preference_lists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_comparisons" ADD CONSTRAINT "saved_comparisons_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
