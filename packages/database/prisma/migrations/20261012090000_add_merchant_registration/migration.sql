ALTER TABLE "merchants"
ADD COLUMN "postal_code" TEXT;

CREATE TYPE "MerchantRegistrationSessionState" AS ENUM (
    'OPEN',
    'PROCESSING',
    'RETRYABLE',
    'COMMITTED',
    'FAILED',
    'EXPIRED'
);

CREATE TYPE "MerchantImageUploadState" AS ENUM (
    'RESERVED',
    'READY',
    'CLAIMED',
    'COPYING',
    'VALIDATED',
    'ATTACHED',
    'REVOKED',
    'TOMBSTONED'
);

CREATE TABLE "merchant_registration_sessions" (
    "id" UUID NOT NULL,
    "staff_id" INTEGER NOT NULL,
    "state" "MerchantRegistrationSessionState" NOT NULL DEFAULT 'OPEN',
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "idempotency_key" TEXT,
    "canonical_payload" JSONB,
    "payload_hash" CHAR(64),
    "generation" INTEGER NOT NULL DEFAULT 0,
    "lease_until" TIMESTAMPTZ(3),
    "merchant_id" INTEGER,
    "replay_response" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "merchant_registration_sessions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "merchant_registration_sessions_generation_check" CHECK ("generation" >= 0),
    CONSTRAINT "merchant_registration_sessions_frozen_submission_check" CHECK (
        ("idempotency_key" IS NULL AND "canonical_payload" IS NULL AND "payload_hash" IS NULL)
        OR
        ("idempotency_key" IS NOT NULL AND "canonical_payload" IS NOT NULL AND "payload_hash" IS NOT NULL)
    )
);

CREATE TABLE "merchant_image_uploads" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "slot" INTEGER NOT NULL,
    "staging_key" TEXT NOT NULL,
    "final_key" TEXT NOT NULL,
    "declared_mime_type" TEXT NOT NULL,
    "declared_size" INTEGER NOT NULL,
    "source_etag" TEXT,
    "final_etag" TEXT,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "state" "MerchantImageUploadState" NOT NULL DEFAULT 'RESERVED',
    "cleanup_claim_id" UUID,
    "cleanup_lease_until" TIMESTAMPTZ(3),
    "cleanup_attempts" INTEGER NOT NULL DEFAULT 0,
    "last_sweep_at" TIMESTAMPTZ(3),
    "next_sweep_at" TIMESTAMPTZ(3),
    "last_outcome" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "merchant_image_uploads_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "merchant_image_uploads_slot_check" CHECK ("slot" BETWEEN 0 AND 4),
    CONSTRAINT "merchant_image_uploads_declared_size_check" CHECK ("declared_size" BETWEEN 1 AND 5242880),
    CONSTRAINT "merchant_image_uploads_declared_mime_type_check" CHECK (
        "declared_mime_type" IN ('image/jpeg', 'image/png', 'image/webp')
    ),
    CONSTRAINT "merchant_image_uploads_cleanup_attempts_check" CHECK ("cleanup_attempts" >= 0)
);

CREATE UNIQUE INDEX "merchant_registration_sessions_merchant_id_key"
ON "merchant_registration_sessions"("merchant_id");

CREATE INDEX "merchants_admin_id_deleted_at_idx"
ON "merchants"("admin_id", "deleted_at");

CREATE UNIQUE INDEX "merchant_registration_sessions_staff_id_idempotency_key_key"
ON "merchant_registration_sessions"("staff_id", "idempotency_key");

CREATE UNIQUE INDEX "merchant_registration_sessions_one_active_per_staff_key"
ON "merchant_registration_sessions"("staff_id")
WHERE "state" IN ('OPEN', 'PROCESSING', 'RETRYABLE');

CREATE INDEX "merchant_registration_sessions_staff_id_state_idx"
ON "merchant_registration_sessions"("staff_id", "state");

CREATE INDEX "merchant_registration_sessions_state_expires_at_idx"
ON "merchant_registration_sessions"("state", "expires_at");

CREATE INDEX "merchant_registration_sessions_state_lease_until_idx"
ON "merchant_registration_sessions"("state", "lease_until");

CREATE UNIQUE INDEX "merchant_image_uploads_staging_key_key"
ON "merchant_image_uploads"("staging_key");

CREATE UNIQUE INDEX "merchant_image_uploads_final_key_key"
ON "merchant_image_uploads"("final_key");

CREATE UNIQUE INDEX "merchant_image_uploads_one_live_slot_key"
ON "merchant_image_uploads"("session_id", "slot")
WHERE "state" NOT IN ('REVOKED', 'TOMBSTONED');

CREATE INDEX "merchant_image_uploads_session_id_slot_idx"
ON "merchant_image_uploads"("session_id", "slot");

CREATE INDEX "merchant_image_uploads_state_expires_at_idx"
ON "merchant_image_uploads"("state", "expires_at");

CREATE INDEX "merchant_image_uploads_state_next_sweep_at_id_idx"
ON "merchant_image_uploads"("state", "next_sweep_at", "id");

CREATE INDEX "merchant_image_uploads_cleanup_lease_until_idx"
ON "merchant_image_uploads"("cleanup_lease_until");

ALTER TABLE "merchant_registration_sessions"
ADD CONSTRAINT "merchant_registration_sessions_staff_id_fkey"
FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "merchant_registration_sessions"
ADD CONSTRAINT "merchant_registration_sessions_merchant_id_fkey"
FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "merchant_image_uploads"
ADD CONSTRAINT "merchant_image_uploads_session_id_fkey"
FOREIGN KEY ("session_id") REFERENCES "merchant_registration_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
