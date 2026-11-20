-- AlterTable
ALTER TABLE "merchants" ADD COLUMN     "category" TEXT,
ADD COLUMN     "import_target_id" INTEGER,
ADD COLUMN     "public_data_id" TEXT;

-- CreateTable
CREATE TABLE "merchant_import_targets" (
    "id" SERIAL NOT NULL,
    "signgu_code" TEXT NOT NULL,
    "signgu_name" TEXT NOT NULL,
    "industry_codes" TEXT[],
    "industry_names" TEXT[],
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_synced_at" TIMESTAMPTZ(3),
    "last_result" JSONB,

    CONSTRAINT "merchant_import_targets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "merchants_public_data_id_key" ON "merchants"("public_data_id");

-- CreateIndex
CREATE INDEX "merchants_import_target_id_idx" ON "merchants"("import_target_id");

-- AddForeignKey
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_import_target_id_fkey" FOREIGN KEY ("import_target_id") REFERENCES "merchant_import_targets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

