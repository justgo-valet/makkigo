ALTER TABLE "ticket_image_uploads"
ADD COLUMN "staging_deleted_at" TIMESTAMPTZ(3);

CREATE INDEX "ticket_image_uploads_state_staging_deleted_at_idx"
ON "ticket_image_uploads"("state", "staging_deleted_at");
