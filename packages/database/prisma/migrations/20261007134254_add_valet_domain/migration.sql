-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('IOS', 'ANDROID');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('VALET_AGENT', 'MERCHANT_ADMIN');

-- CreateEnum
CREATE TYPE "BoothAgentStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BoothMerchantStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ValetSessionStatus" AS ENUM ('ARRIVING', 'PARKED', 'PICKUP_REQUESTED', 'PICKUP_PREPARING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ARRIVAL', 'ARRIVAL_DELAYED', 'ARRIVAL_CANCELLED', 'PARKED', 'PICKUP_REQUESTED', 'PICKUP_RESPONDED', 'PICKUP_COMPLETED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('PUSH', 'ALIMTALK');

-- CreateTable
CREATE TABLE "booths" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "address_detail" TEXT,
    "creator_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "booths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booth_photos" (
    "id" SERIAL NOT NULL,
    "booth_id" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booth_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booth_agents" (
    "id" SERIAL NOT NULL,
    "booth_id" INTEGER NOT NULL,
    "staff_id" INTEGER NOT NULL,
    "status" "BoothAgentStatus" NOT NULL DEFAULT 'REQUESTED',
    "work_start_time" TIME(0),
    "work_end_time" TIME(0),
    "notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "booth_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booth_fee_policies" (
    "id" SERIAL NOT NULL,
    "booth_id" INTEGER NOT NULL,
    "base_minutes" INTEGER NOT NULL,
    "base_fee" INTEGER NOT NULL,
    "extra_unit_minutes" INTEGER NOT NULL,
    "extra_unit_fee" INTEGER NOT NULL,
    "effective_from" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booth_fee_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booth_bank_accounts" (
    "id" SERIAL NOT NULL,
    "booth_id" INTEGER NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "account_holder" TEXT NOT NULL,
    "effective_from" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booth_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchants" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "address_detail" TEXT,
    "admin_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "merchants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_photos" (
    "id" SERIAL NOT NULL,
    "merchant_id" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "merchant_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booth_merchants" (
    "booth_id" INTEGER NOT NULL,
    "merchant_id" INTEGER NOT NULL,
    "status" "BoothMerchantStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "booth_merchants_pkey" PRIMARY KEY ("booth_id","merchant_id")
);

-- CreateTable
CREATE TABLE "push_devices" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "staff_id" INTEGER,
    "platform" "DevicePlatform" NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "push_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel",
    "user_id" INTEGER,
    "staff_id" INTEGER,
    "valet_session_id" INTEGER,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff" (
    "id" SERIAL NOT NULL,
    "role" "StaffRole" NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_social_accounts" (
    "id" SERIAL NOT NULL,
    "staff_id" INTEGER NOT NULL,
    "provider" "SocialProvider" NOT NULL,
    "provider_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_social_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" SERIAL NOT NULL,
    "merchant_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_versions" (
    "id" SERIAL NOT NULL,
    "ticket_id" INTEGER NOT NULL,
    "design" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "valet_sessions" (
    "id" SERIAL NOT NULL,
    "status" "ValetSessionStatus" NOT NULL DEFAULT 'ARRIVING',
    "plate_number" TEXT NOT NULL,
    "vehicle_id" INTEGER,
    "user_id" INTEGER,
    "merchant_id" INTEGER,
    "booth_id" INTEGER,
    "ticket_version_id" INTEGER,
    "arrival_delay_minutes" INTEGER,
    "arrival_delayed_at" TIMESTAMPTZ(3),
    "parked_at" TIMESTAMPTZ(3),
    "parked_by_id" INTEGER,
    "pickup_requested_at" TIMESTAMPTZ(3),
    "base_fee" INTEGER,
    "pickup_responded_at" TIMESTAMPTZ(3),
    "pickup_responded_by_id" INTEGER,
    "actual_fee" INTEGER,
    "expected_pickup_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "completed_by_id" INTEGER,
    "cancelled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "valet_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "booths_name_idx" ON "booths"("name");

-- CreateIndex
CREATE INDEX "booth_photos_booth_id_sort_order_idx" ON "booth_photos"("booth_id", "sort_order");

-- CreateIndex
CREATE INDEX "booth_agents_staff_id_status_idx" ON "booth_agents"("staff_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "booth_agents_booth_id_staff_id_key" ON "booth_agents"("booth_id", "staff_id");

-- CreateIndex
CREATE INDEX "booth_fee_policies_booth_id_effective_from_idx" ON "booth_fee_policies"("booth_id", "effective_from");

-- CreateIndex
CREATE INDEX "booth_bank_accounts_booth_id_effective_from_idx" ON "booth_bank_accounts"("booth_id", "effective_from");

-- CreateIndex
CREATE INDEX "merchants_name_idx" ON "merchants"("name");

-- CreateIndex
CREATE INDEX "merchant_photos_merchant_id_sort_order_idx" ON "merchant_photos"("merchant_id", "sort_order");

-- CreateIndex
CREATE INDEX "booth_merchants_merchant_id_status_idx" ON "booth_merchants"("merchant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "push_devices_token_key" ON "push_devices"("token");

-- CreateIndex
CREATE INDEX "push_devices_user_id_idx" ON "push_devices"("user_id");

-- CreateIndex
CREATE INDEX "push_devices_staff_id_idx" ON "push_devices"("staff_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_staff_id_created_at_idx" ON "notifications"("staff_id", "created_at");

-- CreateIndex
CREATE INDEX "staff_social_accounts_staff_id_idx" ON "staff_social_accounts"("staff_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_social_accounts_provider_provider_user_id_key" ON "staff_social_accounts"("provider", "provider_user_id");

-- CreateIndex
CREATE INDEX "tickets_merchant_id_idx" ON "tickets"("merchant_id");

-- CreateIndex
CREATE INDEX "ticket_versions_ticket_id_created_at_idx" ON "ticket_versions"("ticket_id", "created_at");

-- CreateIndex
CREATE INDEX "valet_sessions_plate_number_status_idx" ON "valet_sessions"("plate_number", "status");

-- CreateIndex
CREATE INDEX "valet_sessions_user_id_created_at_idx" ON "valet_sessions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "valet_sessions_booth_id_status_idx" ON "valet_sessions"("booth_id", "status");

-- CreateIndex
CREATE INDEX "valet_sessions_merchant_id_status_idx" ON "valet_sessions"("merchant_id", "status");

-- AddForeignKey
ALTER TABLE "booths" ADD CONSTRAINT "booths_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booth_photos" ADD CONSTRAINT "booth_photos_booth_id_fkey" FOREIGN KEY ("booth_id") REFERENCES "booths"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booth_agents" ADD CONSTRAINT "booth_agents_booth_id_fkey" FOREIGN KEY ("booth_id") REFERENCES "booths"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booth_agents" ADD CONSTRAINT "booth_agents_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booth_fee_policies" ADD CONSTRAINT "booth_fee_policies_booth_id_fkey" FOREIGN KEY ("booth_id") REFERENCES "booths"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booth_bank_accounts" ADD CONSTRAINT "booth_bank_accounts_booth_id_fkey" FOREIGN KEY ("booth_id") REFERENCES "booths"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_photos" ADD CONSTRAINT "merchant_photos_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booth_merchants" ADD CONSTRAINT "booth_merchants_booth_id_fkey" FOREIGN KEY ("booth_id") REFERENCES "booths"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booth_merchants" ADD CONSTRAINT "booth_merchants_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_devices" ADD CONSTRAINT "push_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_devices" ADD CONSTRAINT "push_devices_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_valet_session_id_fkey" FOREIGN KEY ("valet_session_id") REFERENCES "valet_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_social_accounts" ADD CONSTRAINT "staff_social_accounts_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_versions" ADD CONSTRAINT "ticket_versions_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valet_sessions" ADD CONSTRAINT "valet_sessions_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valet_sessions" ADD CONSTRAINT "valet_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valet_sessions" ADD CONSTRAINT "valet_sessions_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valet_sessions" ADD CONSTRAINT "valet_sessions_booth_id_fkey" FOREIGN KEY ("booth_id") REFERENCES "booths"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valet_sessions" ADD CONSTRAINT "valet_sessions_ticket_version_id_fkey" FOREIGN KEY ("ticket_version_id") REFERENCES "ticket_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valet_sessions" ADD CONSTRAINT "valet_sessions_parked_by_id_fkey" FOREIGN KEY ("parked_by_id") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valet_sessions" ADD CONSTRAINT "valet_sessions_pickup_responded_by_id_fkey" FOREIGN KEY ("pickup_responded_by_id") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valet_sessions" ADD CONSTRAINT "valet_sessions_completed_by_id_fkey" FOREIGN KEY ("completed_by_id") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
