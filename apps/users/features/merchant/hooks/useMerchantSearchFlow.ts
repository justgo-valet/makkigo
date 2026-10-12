import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";

import { useSelectedMerchant } from "@/features/merchant/selectedMerchant.store";
import { merchantIdSchema } from "@/libs/merchant/contracts/merchantDetail";

import type { Merchant } from "@/libs/merchant/contracts/merchants";

type MerchantSearchStep = "search" | "arrival";

const MERCHANT_PARAM = "merchant";

const useMerchantSearchFlow = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasPushedDetailRef = useRef(false);
  const [step, setStep] = useState<MerchantSearchStep | null>(null);
  const [pickedMerchant, setPickedMerchant] = useState<Merchant | null>(null);
  const selectMerchant = useSelectedMerchant((state) => state.selectMerchant);

  const parsedMerchantId = merchantIdSchema.safeParse(searchParams.get(MERCHANT_PARAM));
  const detailMerchantId =
    step === "search" && parsedMerchantId.success ? parsedMerchantId.data : null;

  const buildUrl = (merchantId: number | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (merchantId === null) params.delete(MERCHANT_PARAM);
    else params.set(MERCHANT_PARAM, String(merchantId));
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const leaveDetail = () => {
    if (!searchParams.has(MERCHANT_PARAM)) return;
    if (hasPushedDetailRef.current) {
      hasPushedDetailRef.current = false;
      router.back();
      return;
    }
    window.history.replaceState(null, "", buildUrl(null));
  };

  const open = () => setStep("search");

  const close = () => {
    leaveDetail();
    setStep(null);
  };

  const viewMerchant = (merchant: Merchant) => {
    hasPushedDetailRef.current = true;
    window.history.pushState(null, "", buildUrl(merchant.id));
  };

  const chooseMerchant = (merchant: Merchant) => {
    leaveDetail();
    selectMerchant(merchant);
    setPickedMerchant(merchant);
    setStep("arrival");
  };

  return {
    isSearchOpen: step === "search",
    isArrivalOpen: step === "arrival",
    detailMerchantId,
    pickedMerchant,
    open,
    close,
    viewMerchant,
    backToList: leaveDetail,
    chooseMerchant,
    sendArrival: close,
  };
};

export { useMerchantSearchFlow };
