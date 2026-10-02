type LogoPosition = "left" | "center" | "hidden";

interface HeaderConfiguration {
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

export type { BottomConfiguration, HeaderConfiguration, LayoutState, LogoPosition };
