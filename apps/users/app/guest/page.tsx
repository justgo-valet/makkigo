import GuestUnavailable from "@/features/guest/components/GuestUnavailable";
import GuestValet from "@/features/guest/components/GuestValet";
import { guestMerchantIdSchema } from "@/libs/guest/contracts/guest";
import { getGuestMerchant } from "@/server/guest/guestValet";

interface GuestPageProps {
  searchParams: Promise<{ merchant?: string | string[] }>;
}

export default async function GuestPage({ searchParams }: Readonly<GuestPageProps>) {
  const merchantId = guestMerchantIdSchema.safeParse((await searchParams).merchant);
  const guest = merchantId.success ? await getGuestMerchant(merchantId.data) : null;
  if (!guest) return <GuestUnavailable />;

  const imageBaseUrl = process.env.IMAGE_BASE_URL?.trim();
  if (!imageBaseUrl) throw new Error("IMAGE_BASE_URL is required to render ticket images");

  return (
    <GuestValet
      merchant={guest.merchant}
      merchantTicket={guest.ticket}
      imageBaseUrl={imageBaseUrl}
    />
  );
}
