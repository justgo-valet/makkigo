import { useEffect } from "react";

import { setAppStatusBarStyle } from "@/features/auth/appBridge";

import type { AppStatusBarStyle } from "@/features/auth/appBridge";

/** 이 화면이 떠 있는 동안 앱 상태바 글자색을 바꾸고, 벗어나면 기본(`dark`)으로 되돌린다. */
const useAppStatusBarStyle = (style: AppStatusBarStyle) => {
  useEffect(() => {
    setAppStatusBarStyle(style);

    return () => setAppStatusBarStyle("dark");
  }, [style]);
};

export { useAppStatusBarStyle };
