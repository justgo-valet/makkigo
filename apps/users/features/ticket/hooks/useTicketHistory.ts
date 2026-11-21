import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useLayout } from "@/stores/layout";

import type { UserTicket } from "@/libs/valet/ticketHistory";

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

const useTicketHistory = (imageBaseUrl: string) => {
  useTicketHeader();
  const [openedTicket, setOpenedTicket] = useState<UserTicket | null>(null);
  const baseUrl = imageBaseUrl.endsWith("/") ? imageBaseUrl : `${imageBaseUrl}/`;

  return {
    openedTicket,
    open: setOpenedTicket,
    close: () => setOpenedTicket(null),
    resolveAssetUrl: (path: string) => new URL(path, baseUrl).toString(),
  };
};

export { useTicketHistory };
