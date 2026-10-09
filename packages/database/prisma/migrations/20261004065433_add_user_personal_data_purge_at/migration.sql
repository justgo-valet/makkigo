-- AlterTable
ALTER TABLE "users" ADD COLUMN     "personal_data_purge_at" TIMESTAMPTZ(3);

-- CreateIndex
CREATE INDEX "users_personal_data_purge_at_idx" ON "users"("personal_data_purge_at");
