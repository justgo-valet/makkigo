-- AlterEnum
BEGIN;
CREATE TYPE "SocialProvider_new" AS ENUM ('KAKAO', 'GOOGLE', 'APPLE');
ALTER TABLE "user_social_accounts" ALTER COLUMN "provider" TYPE "SocialProvider_new" USING ("provider"::text::"SocialProvider_new");
ALTER TABLE "staff_social_accounts" ALTER COLUMN "provider" TYPE "SocialProvider_new" USING ("provider"::text::"SocialProvider_new");
ALTER TYPE "SocialProvider" RENAME TO "SocialProvider_old";
ALTER TYPE "SocialProvider_new" RENAME TO "SocialProvider";
DROP TYPE "SocialProvider_old";
COMMIT;
