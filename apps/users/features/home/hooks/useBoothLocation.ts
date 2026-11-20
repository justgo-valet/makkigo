import { useState } from "react";

import { getBoothLocationMerchantId, hasBoothPhotos } from "@/features/home/boothLocation";
import { useMerchantDetail } from "@/features/merchant/hooks/useMerchantDetail";

import type { HomeSnapshot } from "@/features/home/homeSnapshot";

const useBoothLocation = (snapshot: HomeSnapshot) => {
  const [isOpen, setIsOpen] = useState(false);
  const { merchant } = useMerchantDetail(getBoothLocationMerchantId(snapshot));
  const isVisible = hasBoothPhotos(merchant);

  return {
    isVisible,
    isOpen: isOpen && isVisible,
    booths: merchant?.booths ?? [],
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  };
};

type BoothLocation = ReturnType<typeof useBoothLocation>;

export { useBoothLocation };
export type { BoothLocation };
