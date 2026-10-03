-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('TERMS_OF_SERVICE', 'PRIVACY_COLLECTION', 'PRIVACY_OVERSEAS_TRANSFER', 'APP_PUSH', 'ALIMTALK');

-- CreateTable
CREATE TABLE "user_consents" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" "ConsentType" NOT NULL,
    "agreed" BOOLEAN NOT NULL,
    "document_version" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_consents_user_id_type_created_at_idx" ON "user_consents"("user_id", "type", "created_at");

-- AddForeignKey
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
