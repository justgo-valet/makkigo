"use client";

import { useEffect, useEffectEvent } from "react";

import { onAppBack } from "../appBridge";

const useCloseOnAppBack = (open: boolean, close: () => void) => {
  const handleBack = useEffectEvent(close);

  useEffect(() => {
    if (!open) return;
    return onAppBack(() => handleBack());
  }, [open]);
};

export { useCloseOnAppBack };
