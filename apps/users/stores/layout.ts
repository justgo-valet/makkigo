import { create } from "zustand";

type LogoPosition = "left" | "center" | "hidden";

interface HeaderConfiguration {
  showBackButton: boolean;
  backNavigateText: string | null;
  logoPosition: LogoPosition;
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
  showBackButton: false,
  backNavigateText: null,
  logoPosition: "center",
};

const defaultBottomConfiguration: BottomConfiguration = {
  visible: false,
};

const useLayout = create<LayoutState>(set => ({
  headerConfiguration: defaultHeaderConfiguration,
  bottomConfiguration: defaultBottomConfiguration,
  setHeaderConfiguration: config =>
    set({ headerConfiguration: { ...defaultHeaderConfiguration, ...config } }),
  setBottomConfiguration: config =>
    set({ bottomConfiguration: { ...defaultBottomConfiguration, ...config } }),
}));

export { useLayout };
export type { HeaderConfiguration, BottomConfiguration, LogoPosition };
