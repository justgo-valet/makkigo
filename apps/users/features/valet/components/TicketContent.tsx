"use client";

import { formatTicketNumber, TicketRenderer } from "@makkigo/ticket-design";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useLayout } from "@/stores/layout";

import type { TicketDesign } from "@makkigo/ticket-design";

const useTicketHeader = () => {
  const router = useRouter();
  const setHeaderConfiguration = useLayout((state) => state.setHeaderConfiguration);

  useEffect(() => {
    const goBack = () => {
      if (window.history.length > 1) router.back();
      else router.replace("/");
    };
    setHeaderConfiguration({
      showBackButton: true,
      backButtonHandler: goBack,
      logoPosition: "hidden",
    });
    return () => setHeaderConfiguration({});
  }, [router, setHeaderConfiguration]);
};

export default function TicketContent({
  design,
  ticketNumber,
  imageBaseUrl,
}: Readonly<{
  design: TicketDesign;
  ticketNumber: number | null;
  imageBaseUrl: string;
}>) {
  useTicketHeader();
  const resolveAssetUrl = (path: string) =>
    new URL(path, imageBaseUrl.endsWith("/") ? imageBaseUrl : `${imageBaseUrl}/`).toString();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 overflow-y-auto px-1 pb-6">
      {ticketNumber !== null && (
        <p className="text-center">
          <span className="block text-sm text-(--tertiary-color)">티켓 번호</span>
          <span className="text-2xl font-bold tabular-nums text-(--base-color)">
            {formatTicketNumber(ticketNumber)}
          </span>
        </p>
      )}
      <TicketRenderer
        ariaLabel="발렛 티켓"
        className="aspect-[3/4] w-full max-w-sm shadow-[0_2px_12px_rgba(3,9,15,0.18)]"
        design={design}
        resolveAssetUrl={resolveAssetUrl}
      />
    </div>
  );
}
