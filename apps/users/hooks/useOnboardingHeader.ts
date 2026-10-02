import { useEffect } from "react";

import { useLayout } from "@/stores/layout";

const useOnboardingHeader = (handleBack: () => void) => {
  const setHeaderConfiguration = useLayout((state) => state.setHeaderConfiguration);

  useEffect(() => {
    setHeaderConfiguration({
      showBackButton: true,
      backButtonHandler: handleBack,
      showRightMenu: false,
      logoPosition: "hidden",
    });
  }, [handleBack, setHeaderConfiguration]);

  useEffect(() => () => setHeaderConfiguration({}), [setHeaderConfiguration]);
};

export default useOnboardingHeader;
