-- AlterTable
ALTER TABLE "valet_sessions" ADD COLUMN     "ticket_number" INTEGER;

-- CreateTable
CREATE TABLE "merchant_ticket_counters" (
    "merchant_id" INTEGER NOT NULL,
    "day" DATE NOT NULL,
    "last_number" INTEGER NOT NULL,

    CONSTRAINT "merchant_ticket_counters_pkey" PRIMARY KEY ("merchant_id","day")
);

-- AddForeignKey
ALTER TABLE "merchant_ticket_counters" ADD CONSTRAINT "merchant_ticket_counters_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

