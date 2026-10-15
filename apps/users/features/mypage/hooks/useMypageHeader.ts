import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useLayout } from "@/stores/layout";

const HOME_PATH = "/";

const useMypageHeader = () => {
  const router = useRouter();
  const setHeaderConfiguration = useLayout((state) => state.setHeaderConfiguration);

  useEffect(() => {
    const goBack = () => {
      if (window.history.length > 1) router.back();
      else router.replace(HOME_PATH);
    };

    setHeaderConfiguration({
      showBackButton: true,
      backButtonHandler: goBack,
      logoPosition: "hidden",
    });

    return () => setHeaderConfiguration({});
  }, [router, setHeaderConfiguration]);
};

export { useMypageHeader };
