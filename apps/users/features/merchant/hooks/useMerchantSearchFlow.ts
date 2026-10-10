import { useState } from "react";

import { useSelectedMerchant } from "@/features/merchant/selectedMerchant.store";

import type { Merchant } from "@/libs/merchant/contracts/merchants";

type MerchantSearchStep = "search" | "arrival";

const useMerchantSearchFlow = () => {
  const [step, setStep] = useState<MerchantSearchStep | null>(null);
  const [pickedMerchant, setPickedMerchant] = useState<Merchant | null>(null);
  const selectMerchant = useSelectedMerchant((state) => state.selectMerchant);

  const open = () => setStep("search");
  const close = () => setStep(null);

  const pickMerchant = (merchant: Merchant) => {
    selectMerchant(merchant);
    setPickedMerchant(merchant);
    setStep("arrival");
  };

  return {
    isSearchOpen: step === "search",
    isArrivalOpen: step === "arrival",
    pickedMerchant,
    open,
    close,
    pickMerchant,
    sendArrival: close,
  };
};

export { useMerchantSearchFlow };
