import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const protectedPages = [
  "../../app/(protected)/page.tsx",
  "../../app/(protected)/booths/new/page.tsx",
  "../../app/(protected)/booths/[boothId]/agents/page.tsx",
  "../../app/(protected)/booths/[boothId]/merchants/page.tsx",
  "../../app/(protected)/booths/[boothId]/payment-settings/page.tsx",
  "../../app/(protected)/settings/page.tsx",
  "../../app/(protected)/tickets/page.tsx",
  "../../app/(protected)/merchants/page.tsx",
  "../../app/(protected)/merchants/new/page.tsx",
] as const;

describe("protected route inventory", () => {
  it.each(protectedPages)("performs a fresh page-level guard in %s", (relativePath) => {
    const source = readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
    expect(source).toContain("requireProtectedStaff");
    expect(source).toMatch(/await requireProtectedStaff\(staffId\)/);
  });

  it("keeps login and onboarding outside the protected route group", () => {
    const publicRoutes = [
      "../../app/login/page.tsx",
      "../../app/onboarding/page.tsx",
      "../../app/api/v1/auth/oauth/[provider]/callback/route.ts",
      "../../app/api/v1/auth/oauth/[provider]/app-session/route.ts",
    ];
    for (const relativePath of publicRoutes) {
      const source = readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
      expect(source).not.toContain("requireProtectedStaff");
    }
  });
});
