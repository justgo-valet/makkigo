import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  activeMerchantRegistrationSessionStates,
  isActiveMerchantRegistrationSessionState,
  merchantRegistrationSessionStateSchema,
  merchantRegistrationSessionStates,
} from "./registration-session";

const enumsSchema = readFileSync(
  fileURLToPath(
    new URL("../../../../../packages/database/prisma/models/enums.prisma", import.meta.url),
  ),
  "utf8",
);
const migration = readFileSync(
  fileURLToPath(
    new URL(
      "../../../../../packages/database/prisma/migrations/20261012090000_add_merchant_registration/migration.sql",
      import.meta.url,
    ),
  ),
  "utf8",
);

describe("merchant registration session states", () => {
  it("exports the canonical session lifecycle and no alternate in-flight state", () => {
    expect(merchantRegistrationSessionStates).toEqual([
      "OPEN",
      "PROCESSING",
      "RETRYABLE",
      "COMMITTED",
      "FAILED",
      "EXPIRED",
    ]);
    expect(merchantRegistrationSessionStateSchema.safeParse("SUBMITTING").success).toBe(false);
    expect(merchantRegistrationSessionStateSchema.safeParse("CLEANING").success).toBe(false);
  });

  it("uses exactly OPEN, PROCESSING and RETRYABLE as active-owner states", () => {
    expect(activeMerchantRegistrationSessionStates).toEqual(["OPEN", "PROCESSING", "RETRYABLE"]);
    expect(
      Object.fromEntries(
        merchantRegistrationSessionStates.map((state) => [
          state,
          isActiveMerchantRegistrationSessionState(state),
        ]),
      ),
    ).toEqual({
      OPEN: true,
      PROCESSING: true,
      RETRYABLE: true,
      COMMITTED: false,
      FAILED: false,
      EXPIRED: false,
    });
  });

  it("matches the Prisma enum and partial unique index predicate", () => {
    const enumBlock = enumsSchema.match(/enum MerchantRegistrationSessionState \{([\s\S]*?)\}/)?.[1];
    expect(enumBlock?.match(/[A-Z_]+/g)).toEqual([...merchantRegistrationSessionStates]);
    expect(migration).toContain(`WHERE "state" IN ('OPEN', 'PROCESSING', 'RETRYABLE')`);
    expect(migration).not.toMatch(/MerchantRegistrationSessionState[\s\S]*?'CLEANING'/);
  });

  it("keeps the legacy merchant migration additive and nullable", () => {
    expect(migration).toMatch(/ALTER TABLE "merchants"\s+ADD COLUMN "postal_code" TEXT;/);
    expect(migration).not.toMatch(
      /DROP (?:TABLE|COLUMN)|UPDATE\s+"merchants"|ALTER COLUMN[\s\S]*?SET NOT NULL/,
    );
  });
});
