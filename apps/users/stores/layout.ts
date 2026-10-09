import { create } from "zustand";

type LogoPosition = "left" | "center" | "hidden";

interface HeaderConfiguration {
  visible: boolean;
  showBackButton: boolean;
  backNavigateText: string | null;
  backButtonHandler: (() => void) | null;
  logoPosition: LogoPosition;
  showRightMenu: boolean;
}

interface BottomConfiguration {
  visible: boolean;
}

interface LayoutState {
  headerConfiguration: HeaderConfiguration;
  bottomConfiguration: BottomConfiguration;
  setHeaderConfiguration: (config: Partial<HeaderConfiguration>) => void;
  setBottomConfiguration: (config: Partial<BottomConfiguration>) => void;
}

const defaultHeaderConfiguration: HeaderConfiguration = {
  visible: true,
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
export type { BottomConfiguration, HeaderConfiguration, LayoutState, LogoPosition };
