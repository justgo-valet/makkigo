import { useEffect } from "react";

import { useLayout } from "@/stores/layout";

const useHomeHeader = () => {
  const setHeaderConfiguration = useLayout((state) => state.setHeaderConfiguration);

  useEffect(() => {
    setHeaderConfiguration({ logoPosition: "left", showRightMenu: true });

    return () => setHeaderConfiguration({});
  }, [setHeaderConfiguration]);
};

export { useHomeHeader };
