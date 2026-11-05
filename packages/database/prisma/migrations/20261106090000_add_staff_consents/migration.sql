-- CreateEnum
CREATE TYPE "StaffConsentType" AS ENUM ('PARTNER_TERMS', 'PARTNER_PRIVACY_COLLECTION');

-- CreateTable
CREATE TABLE "staff_consents" (
    "id" SERIAL NOT NULL,
    "staff_id" INTEGER NOT NULL,
    "type" "StaffConsentType" NOT NULL,
    "document_version" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_consents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "staff_consents_staff_id_type_idx" ON "staff_consents"("staff_id", "type");

-- AddForeignKey
ALTER TABLE "staff_consents" ADD CONSTRAINT "staff_consents_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

