import { useEffect } from "react";

import { useLayout } from "@/stores/layout";

const useHiddenHeader = () => {
  const setHeaderConfiguration = useLayout((state) => state.setHeaderConfiguration);

  useEffect(() => {
    setHeaderConfiguration({ visible: false });

    return () => setHeaderConfiguration({});
  }, [setHeaderConfiguration]);
};

export { useHiddenHeader };
