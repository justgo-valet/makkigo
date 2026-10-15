"use client";

import { TicketRenderer } from "@makkigo/ticket-design";
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
  imageBaseUrl,
}: Readonly<{
  design: TicketDesign;
  imageBaseUrl: string;
}>) {
  useTicketHeader();
  const resolveAssetUrl = (path: string) =>
    new URL(path, imageBaseUrl.endsWith("/") ? imageBaseUrl : `${imageBaseUrl}/`).toString();

  return (
    <div className="flex h-full items-center justify-center overflow-y-auto px-1 pb-6">
      <TicketRenderer
        ariaLabel="발렛 티켓"
        className="aspect-[3/4] w-full max-w-sm shadow-[0_2px_12px_rgba(3,9,15,0.18)]"
        design={design}
        resolveAssetUrl={resolveAssetUrl}
      />
    </div>
  );
}
