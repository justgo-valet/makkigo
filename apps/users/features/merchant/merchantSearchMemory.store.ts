import { create } from "zustand";

interface MerchantSearchMemoryState {
  keyword: string;
  setKeyword: (keyword: string) => void;
  clear: () => void;
}

const useMerchantSearchMemory = create<MerchantSearchMemoryState>()((set) => ({
  keyword: "",
  setKeyword: (keyword) => set({ keyword }),
  clear: () => set({ keyword: "" }),
}));

export { useMerchantSearchMemory };
