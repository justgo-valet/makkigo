-- Staff 유형은 최초 소셜 로그인 뒤 온보딩에서 선택합니다.
ALTER TABLE "staff" ALTER COLUMN "role" DROP NOT NULL;

ALTER TABLE "staff_social_accounts"
ADD COLUMN "email" TEXT,
ADD COLUMN "updated_at" TIMESTAMPTZ(3);

UPDATE "staff_social_accounts" SET "updated_at" = "created_at";
ALTER TABLE "staff_social_accounts" ALTER COLUMN "updated_at" SET NOT NULL;

CREATE TABLE "staff_refresh_tokens" (
    "id" SERIAL NOT NULL,
    "staff_id" INTEGER NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "user_agent" TEXT,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "last_used_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "staff_refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "staff_login_codes" (
    "id" SERIAL NOT NULL,
    "staff_id" INTEGER NOT NULL,
    "code_hash" CHAR(64) NOT NULL,
    "app_challenge" CHAR(43) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "staff_login_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "staff_refresh_tokens_token_hash_key" ON "staff_refresh_tokens"("token_hash");
CREATE INDEX "staff_refresh_tokens_staff_id_idx" ON "staff_refresh_tokens"("staff_id");
CREATE INDEX "staff_refresh_tokens_expires_at_idx" ON "staff_refresh_tokens"("expires_at");
CREATE UNIQUE INDEX "staff_login_codes_code_hash_key" ON "staff_login_codes"("code_hash");
CREATE INDEX "staff_login_codes_staff_id_idx" ON "staff_login_codes"("staff_id");
CREATE INDEX "staff_login_codes_expires_at_idx" ON "staff_login_codes"("expires_at");

ALTER TABLE "staff_refresh_tokens" ADD CONSTRAINT "staff_refresh_tokens_staff_id_fkey"
FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "staff_login_codes" ADD CONSTRAINT "staff_login_codes_staff_id_fkey"
FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
