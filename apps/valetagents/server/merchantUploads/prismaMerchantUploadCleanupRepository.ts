import "server-only";

import { Prisma, prisma } from "database";

import type {
  CleanupCandidate,
  CleanupRepository,
} from "./cleanupMerchantUploads";

interface InspectionRow {
  eligibleCount: number;
  oldestEligibleAt: Date | null;
}

const eligibleSql = (now: Date) => Prisma.sql`
  (
    "state" IN (
      'REVOKED'::"MerchantImageUploadState",
      'TOMBSTONED'::"MerchantImageUploadState"
    )
    OR (
      "state" = 'ATTACHED'::"MerchantImageUploadState"
      AND ("last_outcome" IS NULL OR "last_outcome" <> 'STAGING_DELETED')
    )
  )
  AND ("next_sweep_at" IS NULL OR "next_sweep_at" <= ${now})
  AND ("cleanup_lease_until" IS NULL OR "cleanup_lease_until" <= ${now})
`;

const prismaMerchantUploadCleanupRepository: CleanupRepository = {
  async inspect(now) {
    const [row] = await prisma.$queryRaw<InspectionRow[]>(Prisma.sql`
      SELECT
        COUNT(*)::int AS "eligibleCount",
        MIN(COALESCE("next_sweep_at", "created_at")) AS "oldestEligibleAt"
      FROM "merchant_image_uploads"
      WHERE ${eligibleSql(now)}
    `);
    return row ?? { eligibleCount: 0, oldestEligibleAt: null };
  },

  async claim({ claimId, now, leaseUntil, limit }) {
    return prisma.$transaction((transaction) =>
      transaction.$queryRaw<CleanupCandidate[]>(Prisma.sql`
        WITH candidates AS (
          SELECT "id"
          FROM "merchant_image_uploads"
          WHERE ${eligibleSql(now)}
          ORDER BY "next_sweep_at" ASC NULLS FIRST, "id" ASC
          FOR UPDATE SKIP LOCKED
          LIMIT ${limit}
        )
        UPDATE "merchant_image_uploads" AS upload
        SET
          "cleanup_claim_id" = ${claimId}::uuid,
          "cleanup_lease_until" = ${leaseUntil},
          "cleanup_attempts" = "cleanup_attempts" + 1,
          "updated_at" = NOW()
        FROM candidates
        WHERE upload."id" = candidates."id"
        RETURNING
          upload."id",
          upload."state"::text AS "state",
          upload."staging_key" AS "stagingKey",
          upload."final_key" AS "finalKey",
          upload."source_etag" AS "sourceETag",
          upload."final_etag" AS "finalETag"
      `),
    );
  },

  async complete({ uploadId, claimId, state, now, nextSweepAt }) {
    const { count } = await prisma.merchantImageUpload.updateMany({
      where: { id: uploadId, cleanupClaimId: claimId, state },
      data: {
        cleanupClaimId: null,
        cleanupLeaseUntil: null,
        lastSweepAt: now,
        nextSweepAt,
        lastOutcome: state === "ATTACHED" ? "STAGING_DELETED" : "TOMBSTONE_SWEEP_OK",
      },
    });
    return count === 1;
  },

  async fail({ uploadId, claimId, now, nextSweepAt }) {
    const { count } = await prisma.merchantImageUpload.updateMany({
      where: { id: uploadId, cleanupClaimId: claimId },
      data: {
        cleanupClaimId: null,
        cleanupLeaseUntil: null,
        lastSweepAt: now,
        nextSweepAt,
        lastOutcome: "DELETE_FAILED",
      },
    });
    return count === 1;
  },
};

export { prismaMerchantUploadCleanupRepository };
