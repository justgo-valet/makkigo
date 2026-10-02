import { create } from "zustand";

import type {
  BottomConfiguration,
  HeaderConfiguration,
  LayoutState,
} from "@/types/store/layoutStore";

const defaultHeaderConfiguration: HeaderConfiguration = {
  showBackButton: false,
  backNavigateText: null,
  backButtonHandler: null,
  logoPosition: "center",
  showRightMenu: false,
};

const defaultBottomConfiguration: BottomConfiguration = {
  visible: false,
};

const useLayout = create<LayoutState>()((set) => ({
  headerConfiguration: { ...defaultHeaderConfiguration },
  bottomConfiguration: { ...defaultBottomConfiguration },
  setHeaderConfiguration: (config) =>
    set({ headerConfiguration: { ...defaultHeaderConfiguration, ...config } }),
  setBottomConfiguration: (config) =>
    set({ bottomConfiguration: { ...defaultBottomConfiguration, ...config } }),
}));

export { useLayout };
