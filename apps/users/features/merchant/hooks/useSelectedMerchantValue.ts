import { useEffect } from "react";

import { useSelectedMerchant } from "@/features/merchant/selectedMerchant.store";

const useSelectedMerchantValue = () => {
  useEffect(() => {
    void useSelectedMerchant.persist.rehydrate();
  }, []);

  return useSelectedMerchant((state) => state.merchant);
};

export { useSelectedMerchantValue };
