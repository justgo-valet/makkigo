import { Button } from "@makkigo/ui";
import { TicketRenderer } from "@makkigo/ticket-design";
import Link from "next/link";

import AppHeader from "@/components/layouts/AppHeader";

import type { MenuAccess } from "@/libs/auth/menuItems";
import type { TicketListResponse } from "@/libs/ticket/contracts/tickets";

interface TicketManagementProps {
  imageBaseUrl: string;
  menu: MenuAccess;
  tickets: TicketListResponse;
}

const createAssetUrlResolver = (imageBaseUrl: string) => {
  const baseUrl = new URL(imageBaseUrl).toString().replace(/\/$/, "");
  return (assetPath: string) => `${baseUrl}/${assetPath.replace(/^\/+/, "")}`;
};

export default function TicketManagement({
  imageBaseUrl,
  menu,
  tickets,
}: Readonly<TicketManagementProps>) {
  const resolveAssetUrl = createAssetUrlResolver(imageBaseUrl);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col">
      <AppHeader menu={menu} backHref="/" />

      <h1 className="mt-4 text-xl font-bold text-(--base-color)">티켓 관리</h1>

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5">
        {tickets.items.map((ticket) => (
          <Link
            key={ticket.id}
            href={`/tickets/${ticket.id}`}
            aria-label={`티켓 ${ticket.id} 편집`}
            className="block self-start drop-shadow-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            <TicketRenderer
              ariaLabel={`티켓 ${ticket.id}`}
              className="aspect-3/4 w-full"
              design={ticket.design}
              resolveAssetUrl={resolveAssetUrl}
            />
          </Link>
        ))}
      </div>

      <Button asChild size="xl" className="mt-auto w-full">
        <Link href="/tickets/new">티켓 추가하기</Link>
      </Button>
    </div>
  );
}
