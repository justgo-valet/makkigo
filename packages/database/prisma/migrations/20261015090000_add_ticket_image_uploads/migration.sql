CREATE TYPE "TicketImageUploadState" AS ENUM ('RESERVED', 'COMPLETE');

CREATE TABLE "ticket_image_uploads" (
  "id" UUID NOT NULL,
  "merchant_id" INTEGER NOT NULL,
  "staff_id" INTEGER NOT NULL,
  "state" "TicketImageUploadState" NOT NULL DEFAULT 'RESERVED',
  "staging_key" TEXT NOT NULL,
  "final_key" TEXT NOT NULL,
  "content_type" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "source_etag" TEXT,
  "final_etag" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ticket_image_uploads_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ticket_image_uploads_size_check" CHECK ("size" BETWEEN 1 AND 5242880),
  CONSTRAINT "ticket_image_uploads_content_type_check" CHECK ("content_type" IN ('image/jpeg', 'image/png', 'image/webp'))
);

CREATE UNIQUE INDEX "ticket_image_uploads_staging_key_key" ON "ticket_image_uploads"("staging_key");
CREATE UNIQUE INDEX "ticket_image_uploads_final_key_key" ON "ticket_image_uploads"("final_key");
CREATE INDEX "ticket_image_uploads_merchant_id_staff_id_state_idx" ON "ticket_image_uploads"("merchant_id", "staff_id", "state");
CREATE INDEX "ticket_image_uploads_state_expires_at_idx" ON "ticket_image_uploads"("state", "expires_at");

ALTER TABLE "ticket_image_uploads" ADD CONSTRAINT "ticket_image_uploads_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ticket_image_uploads" ADD CONSTRAINT "ticket_image_uploads_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
