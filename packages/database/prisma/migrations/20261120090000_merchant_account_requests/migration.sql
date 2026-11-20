-- CreateEnum
CREATE TYPE "MerchantAccountRequestStatus" AS ENUM ('PENDING', 'COMPLETED', 'REJECTED');

-- CreateTable
CREATE TABLE "merchant_account_requests" (
    "id" SERIAL NOT NULL,
    "merchant_id" INTEGER,
    "merchant_name" TEXT NOT NULL,
    "merchant_address" TEXT NOT NULL,
    "requester_name" TEXT NOT NULL,
    "requester_phone" TEXT NOT NULL,
    "status" "MerchantAccountRequestStatus" NOT NULL DEFAULT 'PENDING',
    "merchant_admin_id" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(3),

    CONSTRAINT "merchant_account_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "merchant_account_requests_status_created_at_idx" ON "merchant_account_requests"("status", "created_at");

-- CreateIndex
CREATE INDEX "merchant_account_requests_requester_phone_idx" ON "merchant_account_requests"("requester_phone");

-- AddForeignKey
ALTER TABLE "merchant_account_requests" ADD CONSTRAINT "merchant_account_requests_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_account_requests" ADD CONSTRAINT "merchant_account_requests_merchant_admin_id_fkey" FOREIGN KEY ("merchant_admin_id") REFERENCES "merchant_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

