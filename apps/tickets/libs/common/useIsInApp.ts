import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

export const useIsInApp = () => useSyncExternalStore(subscribe, () => "MakkigoApp" in window, () => false);
