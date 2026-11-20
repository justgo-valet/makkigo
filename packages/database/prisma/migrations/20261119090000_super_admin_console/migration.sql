-- DeactivateMerchantAdminStaff
UPDATE "staff_refresh_tokens" SET "revoked_at" = CURRENT_TIMESTAMP
WHERE "revoked_at" IS NULL
  AND "staff_id" IN (SELECT "id" FROM "staff" WHERE "role" = 'MERCHANT_ADMIN');

UPDATE "staff" SET "role" = NULL, "deleted_at" = COALESCE("deleted_at", CURRENT_TIMESTAMP)
WHERE "role" = 'MERCHANT_ADMIN';

-- AlterEnum
BEGIN;
CREATE TYPE "StaffRole_new" AS ENUM ('VALET_AGENT');
ALTER TABLE "staff" ALTER COLUMN "role" TYPE "StaffRole_new" USING ("role"::text::"StaffRole_new");
ALTER TYPE "StaffRole" RENAME TO "StaffRole_old";
ALTER TYPE "StaffRole_new" RENAME TO "StaffRole";
DROP TYPE "StaffRole_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "merchant_registration_sessions" DROP CONSTRAINT "merchant_registration_sessions_staff_id_fkey";

-- DropForeignKey
ALTER TABLE "merchant_registration_sessions" DROP CONSTRAINT "merchant_registration_sessions_merchant_id_fkey";

-- DropForeignKey
ALTER TABLE "merchant_image_uploads" DROP CONSTRAINT "merchant_image_uploads_session_id_fkey";

-- DropForeignKey
ALTER TABLE "merchants" DROP CONSTRAINT "merchants_admin_id_fkey";

-- DropForeignKey
ALTER TABLE "ticket_image_uploads" DROP CONSTRAINT "ticket_image_uploads_staff_id_fkey";

-- DropIndex
DROP INDEX "merchants_admin_id_deleted_at_idx";

-- DropIndex
DROP INDEX "ticket_image_uploads_merchant_id_staff_id_state_idx";

-- AlterTable
ALTER TABLE "merchants" DROP COLUMN "admin_id",
ADD COLUMN     "kakao_place_id" TEXT,
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "ticket_image_uploads" DROP COLUMN "staff_id",
ADD COLUMN     "merchant_admin_id" INTEGER;

-- DropTable
DROP TABLE "merchant_registration_sessions";

-- DropTable
DROP TABLE "merchant_image_uploads";

-- DropEnum
DROP TYPE "MerchantRegistrationSessionState";

-- DropEnum
DROP TYPE "MerchantImageUploadState";

-- CreateTable
CREATE TABLE "admins" (
    "id" SERIAL NOT NULL,
    "login_id" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(3),
    "disabled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_refresh_tokens" (
    "id" SERIAL NOT NULL,
    "admin_id" INTEGER NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "user_agent" TEXT,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "last_used_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_admins" (
    "id" SERIAL NOT NULL,
    "login_id" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "merchant_id" INTEGER,
    "password_change_required" BOOLEAN NOT NULL DEFAULT true,
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(3),
    "disabled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "merchant_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_admin_refresh_tokens" (
    "id" SERIAL NOT NULL,
    "merchant_admin_id" INTEGER NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "user_agent" TEXT,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "last_used_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "merchant_admin_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_login_id_key" ON "admins"("login_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_refresh_tokens_token_hash_key" ON "admin_refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "admin_refresh_tokens_admin_id_idx" ON "admin_refresh_tokens"("admin_id");

-- CreateIndex
CREATE INDEX "admin_refresh_tokens_expires_at_idx" ON "admin_refresh_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_admins_login_id_key" ON "merchant_admins"("login_id");

-- CreateIndex
CREATE INDEX "merchant_admins_merchant_id_idx" ON "merchant_admins"("merchant_id");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_admin_refresh_tokens_token_hash_key" ON "merchant_admin_refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "merchant_admin_refresh_tokens_merchant_admin_id_idx" ON "merchant_admin_refresh_tokens"("merchant_admin_id");

-- CreateIndex
CREATE INDEX "merchant_admin_refresh_tokens_expires_at_idx" ON "merchant_admin_refresh_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "merchants_kakao_place_id_key" ON "merchants"("kakao_place_id");

-- CreateIndex
CREATE INDEX "ticket_image_uploads_merchant_id_merchant_admin_id_state_idx" ON "ticket_image_uploads"("merchant_id", "merchant_admin_id", "state");

-- AddForeignKey
ALTER TABLE "admin_refresh_tokens" ADD CONSTRAINT "admin_refresh_tokens_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_admins" ADD CONSTRAINT "merchant_admins_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_admin_refresh_tokens" ADD CONSTRAINT "merchant_admin_refresh_tokens_merchant_admin_id_fkey" FOREIGN KEY ("merchant_admin_id") REFERENCES "merchant_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_image_uploads" ADD CONSTRAINT "ticket_image_uploads_merchant_admin_id_fkey" FOREIGN KEY ("merchant_admin_id") REFERENCES "merchant_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
