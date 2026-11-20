import type { Prisma } from "../generated/prisma/client";

export const nextTicketNumber = async (tx: Prisma.TransactionClient, merchantId: number, now: Date) => {
  const [counter] = await tx.$queryRaw<[{ last_number: number }]>`
    INSERT INTO merchant_ticket_counters (merchant_id, day, last_number)
    VALUES (${merchantId}, (${now}::timestamptz AT TIME ZONE 'Asia/Seoul')::date, 1)
    ON CONFLICT (merchant_id, day) DO UPDATE SET last_number = merchant_ticket_counters.last_number + 1
    RETURNING last_number`;
  return counter.last_number;
};
