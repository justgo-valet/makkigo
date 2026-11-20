import "server-only";

import { z } from "zod";

import { getKakaoJson } from "./searchKakaoPlaces";

import type { SignguRegion } from "@/libs/merchantImport/contracts";

const addressSearchSchema = z.object({
  documents: z.array(
    z.object({
      address: z
        .object({ b_code: z.string(), region_1depth_name: z.string(), region_2depth_name: z.string() })
        .nullish(),
    }),
  ),
});

export const findSignguRegion = async (query: string): Promise<SignguRegion | null> => {
  const body = addressSearchSchema.parse(await getKakaoJson("/v2/local/search/address.json", { query, size: "10" }));
  for (const { address } of body.documents) {
    if (!address || !/^\d{10}$/.test(address.b_code)) continue;
    const code = address.b_code.slice(0, 5);
    if (code.endsWith("000")) continue;
    return { code, name: [address.region_1depth_name, address.region_2depth_name].filter(Boolean).join(" ") };
  }
  return null;
};
