"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { resetRole } from "../apis/resetRole";

const useResetRole = () => {
  const router = useRouter();
  const [isResetting, setIsResetting] = useState(false);

  const reset = async () => {
    if (isResetting) return;
    setIsResetting(true);
    try {
      await resetRole();
      router.replace("/onboarding");
    } catch {
      setIsResetting(false);
    }
    router.refresh();
  };

  return { isResetting, reset: () => void reset() };
};

export { useResetRole };
