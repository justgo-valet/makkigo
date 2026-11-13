import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface WatchedExit {
  sessionId: number;
  merchantName: string | null;
  plateNumber: string;
}

interface ExitCompletionState {
  watchedExit: WatchedExit | null;
  watchExit: (watchedExit: WatchedExit) => void;
  clearWatchedExit: () => void;
}

const useExitCompletionStore = create<ExitCompletionState>()(
  persist(
    (set) => ({
      watchedExit: null,
      watchExit: (watchedExit) => set({ watchedExit }),
      clearWatchedExit: () => set({ watchedExit: null }),
    }),
    {
      name: "makkigo-watched-exit",
      storage: createJSONStorage(() => localStorage),
      partialize: ({ watchedExit }) => ({ watchedExit }),
      skipHydration: true,
    },
  ),
);

const clearWatchedExit = () => {
  useExitCompletionStore.getState().clearWatchedExit();
  useExitCompletionStore.persist.clearStorage();
};

export { clearWatchedExit, useExitCompletionStore };
export type { WatchedExit };
