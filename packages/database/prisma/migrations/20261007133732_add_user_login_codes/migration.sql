-- CreateTable
CREATE TABLE "user_login_codes" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "code_hash" CHAR(64) NOT NULL,
    "app_challenge" CHAR(43) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_login_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_login_codes_code_hash_key" ON "user_login_codes"("code_hash");

-- CreateIndex
CREATE INDEX "user_login_codes_user_id_idx" ON "user_login_codes"("user_id");

-- CreateIndex
CREATE INDEX "user_login_codes_expires_at_idx" ON "user_login_codes"("expires_at");

-- AddForeignKey
ALTER TABLE "user_login_codes" ADD CONSTRAINT "user_login_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
