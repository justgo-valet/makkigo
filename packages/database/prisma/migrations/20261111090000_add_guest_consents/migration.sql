-- CreateTable
CREATE TABLE "guest_consents" (
    "id" SERIAL NOT NULL,
    "valet_session_id" INTEGER NOT NULL,
    "type" "ConsentType" NOT NULL,
    "document_version" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_consents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guest_consents_valet_session_id_idx" ON "guest_consents"("valet_session_id");

-- AddForeignKey
ALTER TABLE "guest_consents" ADD CONSTRAINT "guest_consents_valet_session_id_fkey" FOREIGN KEY ("valet_session_id") REFERENCES "valet_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

