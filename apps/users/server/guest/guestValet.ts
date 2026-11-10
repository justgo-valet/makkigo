import "server-only";
import { ticketDesignSchema } from "@makkigo/ticket-design";
import { ACTIVE_VALET_SESSION_STATUSES, findLatestTicketVersionId, prisma } from "database";

import { findSessionView } from "@/server/valet/getCurrentSession";
import { requestPickupWhere } from "@/server/valet/requestPickup";

import type {
  GuestMerchantResponse,
  GuestPickupRequest,
  GuestSessionResponse,
} from "@/libs/guest/contracts/guest";
import type { Prisma } from "database";

const GUEST_CONSENT_TYPES = ["TERMS_OF_SERVICE", "PRIVACY_THIRD_PARTY"] as const;

const findGuestMerchant = (merchantId: number) =>
  prisma.merchant.findFirst({
    where: {
      id: merchantId,
      deletedAt: null,
      booths: { some: { status: "APPROVED", booth: { deletedAt: null } } },
    },
    select: { id: true, name: true },
  });

const guestSessionWhere = (
  merchantId: number,
  plateNumber: string,
): Prisma.ValetSessionWhereInput => ({
  plateNumber,
  status: { in: [...ACTIVE_VALET_SESSION_STATUSES] },
  OR: [
    { merchantId },
    { booth: { deletedAt: null, merchants: { some: { merchantId, status: "APPROVED" } } } },
  ],
});

const findTicketDesign = async (ticketVersionId: number | null) => {
  if (ticketVersionId === null) return null;
  const version = await prisma.ticketVersion.findUnique({
    where: { id: ticketVersionId },
    select: { design: true },
  });
  const design = ticketDesignSchema.safeParse(version?.design);
  return design.success ? design.data : null;
};

const findLatestTicketDesign = async (merchantId: number) =>
  findTicketDesign(await findLatestTicketVersionId(prisma, merchantId));

const getGuestMerchant = async (merchantId: number): Promise<GuestMerchantResponse | null> => {
  const merchant = await findGuestMerchant(merchantId);
  if (!merchant) return null;
  return { merchant, ticket: await findLatestTicketDesign(merchant.id) };
};

const getGuestSession = async (
  merchantId: number,
  plateNumber: string,
  now: Date = new Date(),
): Promise<GuestSessionResponse | null> => {
  if (!(await findGuestMerchant(merchantId))) return null;
  const session = await findSessionView(guestSessionWhere(merchantId, plateNumber), now);
  if (!session) return null;

  const linked = await prisma.valetSession.findUniqueOrThrow({
    where: { id: session.id },
    select: { ticketVersionId: true, merchantId: true },
  });
  const ticket =
    linked.ticketVersionId !== null
      ? await findTicketDesign(linked.ticketVersionId)
      : linked.merchantId === null || linked.merchantId === merchantId
        ? await findLatestTicketDesign(merchantId)
        : null;

  return { session, ticket };
};

const requestGuestPickup = async (
  merchantId: number,
  { plateNumber, documentVersion }: GuestPickupRequest,
  now: Date = new Date(),
) => {
  if (!(await findGuestMerchant(merchantId))) return null;
  return requestPickupWhere(guestSessionWhere(merchantId, plateNumber), now, {
    merchantId,
    consents: GUEST_CONSENT_TYPES.map((type) => ({ type, documentVersion })),
  });
};

export { getGuestMerchant, getGuestSession, requestGuestPickup };
