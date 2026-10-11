-- CreateEnum
CREATE TYPE "LocationUsePurpose" AS ENUM ('ARRIVAL_ETA');

-- AlterEnum
ALTER TYPE "ConsentType" ADD VALUE 'LOCATION_BASED_SERVICE';

-- AlterTable
ALTER TABLE "merchants" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "valet_sessions" ADD COLUMN     "expected_arrival_at" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "location_use_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "valet_session_id" INTEGER,
    "purpose" "LocationUsePurpose" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "location_use_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "location_use_logs_user_id_created_at_idx" ON "location_use_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "location_use_logs_created_at_idx" ON "location_use_logs"("created_at");

-- AddForeignKey
ALTER TABLE "location_use_logs" ADD CONSTRAINT "location_use_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_use_logs" ADD CONSTRAINT "location_use_logs_valet_session_id_fkey" FOREIGN KEY ("valet_session_id") REFERENCES "valet_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
