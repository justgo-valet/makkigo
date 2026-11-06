import "server-only";

import { valetSessionListResponseSchema } from "@/libs/valet/contracts/sessions";

import { readValetSessionLists } from "./readValetSessionLists";

import type { ValetSessionListResponse } from "@/libs/valet/contracts/sessions";

const listMerchantValetSessions = async (
  staffId: number,
  imageBaseUrl: string,
  now = new Date(),
): Promise<ValetSessionListResponse> => {
  const merchant = { adminId: staffId, deletedAt: null };
  const lists = await readValetSessionLists(
    {
      active: {
        status: { in: ["ARRIVING", "PARKED", "PICKUP_REQUESTED", "PICKUP_PREPARING"] },
        merchant,
      },
      completed: { merchant },
    },
    imageBaseUrl,
    now,
  );

  return valetSessionListResponseSchema.parse(lists);
};

export { listMerchantValetSessions };
