import { useState } from "react";

import { isInApp } from "@/features/auth/appBridge";
import { useSelectedMerchant } from "@/features/merchant/selectedMerchant.store";
import { useMe } from "@/features/user/hooks/useMe";
import { useSendArrival } from "@/features/valet/hooks/useSendArrival";

import type { Merchant } from "@/libs/merchant/contracts/merchants";

type MerchantSearchStep = "search" | "arrival" | "locationConsent";

const useMerchantSearchFlow = () => {
  const [step, setStep] = useState<MerchantSearchStep | null>(null);
  const [pickedMerchant, setPickedMerchant] = useState<Merchant | null>(null);
  const selectMerchant = useSelectedMerchant((state) => state.selectMerchant);
  const { data: me } = useMe();
  const arrival = useSendArrival(() => setStep(null));

  const open = () => setStep("search");

  const close = () => {
    if (arrival.isSending) return;
    arrival.resetError();
    setStep(null);
  };

  const pickMerchant = (merchant: Merchant) => {
    selectMerchant(merchant);
    setPickedMerchant(merchant);
    arrival.resetError();
    setStep("arrival");
  };

  const sendArrival = () => {
    if (!pickedMerchant || arrival.isSending) return;

    if (!isInApp() || me?.locationAgreed) {
      arrival.send({ merchantId: pickedMerchant.id, usesLocation: isInApp() });
      return;
    }

    arrival.resetError();
    setStep("locationConsent");
  };

  const sendWithLocationConsent = (agreesToLocation: boolean) => {
    if (!pickedMerchant || arrival.isSending) return;

    arrival.send({
      merchantId: pickedMerchant.id,
      usesLocation: agreesToLocation,
      agreesToLocation,
    });
  };

  return {
    isSearchOpen: step === "search",
    isArrivalOpen: step === "arrival",
    isLocationConsentOpen: step === "locationConsent",
    pickedMerchant,
    isSending: arrival.isSending,
    sendErrorMessage: arrival.errorMessage,
    open,
    close,
    pickMerchant,
    sendArrival,
    agreeLocationAndSend: () => sendWithLocationConsent(true),
    sendWithoutLocation: () => sendWithLocationConsent(false),
  };
};

export { useMerchantSearchFlow };
