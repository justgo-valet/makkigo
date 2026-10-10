import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { Merchant } from "@/libs/merchant/contracts/merchants";

interface SelectedMerchantState {
  merchant: Merchant | null;
  selectMerchant: (merchant: Merchant) => void;
  clearMerchant: () => void;
}

const useSelectedMerchant = create<SelectedMerchantState>()(
  persist(
    (set) => ({
      merchant: null,
      selectMerchant: (merchant) => set({ merchant }),
      clearMerchant: () => set({ merchant: null }),
    }),
    {
      name: "makkigo-selected-merchant",
      storage: createJSONStorage(() => localStorage),
      partialize: ({ merchant }) => ({ merchant }),
      skipHydration: true,
    },
  ),
);

export { useSelectedMerchant };
