import { create } from "zustand";

interface MerchantSearchMemoryState {
  keyword: string;
  detailMerchantId: number | null;
  setKeyword: (keyword: string) => void;
  setDetailMerchantId: (merchantId: number | null) => void;
  clear: () => void;
}

const useMerchantSearchMemory = create<MerchantSearchMemoryState>()((set) => ({
  keyword: "",
  detailMerchantId: null,
  setKeyword: (keyword) => set({ keyword }),
  setDetailMerchantId: (detailMerchantId) => set({ detailMerchantId }),
  clear: () => set({ keyword: "", detailMerchantId: null }),
}));

export { useMerchantSearchMemory };
