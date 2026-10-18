"use client";

import * as React from "react";

interface ViewportMetrics {
  innerHeight: number;
  visualHeight: number;
  visualOffsetTop: number;
}

export const getKeyboardInset = ({
  innerHeight,
  visualHeight,
  visualOffsetTop,
}: ViewportMetrics) => Math.max(0, Math.round(innerHeight - visualHeight - visualOffsetTop));

const readKeyboardInset = () => {
  const viewport = window.visualViewport;
  if (!viewport) return 0;

  return getKeyboardInset({
    innerHeight: window.innerHeight,
    visualHeight: viewport.height,
    visualOffsetTop: viewport.offsetTop,
  });
};

export const useKeyboardInset = (enabled = true) => {
  const [inset, setInset] = React.useState(0);

  React.useEffect(() => {
    if (!enabled) {
      setInset(0);
      return;
    }

    const viewport = window.visualViewport;
    if (!viewport) return;

    const update = () => setInset(readKeyboardInset());
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);

    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, [enabled]);

  return inset;
};
