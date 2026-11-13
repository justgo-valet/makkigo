import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { hasExitCompletedNotice, shouldWatchExit } from "@/features/home/exitCompletion";
import { clearWatchedExit, useExitCompletionStore } from "@/features/home/exitCompletion.store";
import { formatVehicleNumber } from "@/features/home/homeFormat";
import { getNotifications } from "@/features/notification/apis/getNotifications";
import { useCurrentSession } from "@/features/valet/hooks/useCurrentSession";

const NOTICE_CHECK_INTERVAL_MS = 5 * 1000;
const NOTICE_CHECK_LIMIT = 12;

const useExitCompletion = () => {
  const sessionQuery = useCurrentSession();
  const session = sessionQuery.isSuccess ? sessionQuery.data.session : undefined;
  const watchedExit = useExitCompletionStore((state) => state.watchedExit);
  const watchExit = useExitCompletionStore((state) => state.watchExit);
  const endedExit = session === null ? watchedExit : null;

  const noticeQuery = useQuery({
    queryKey: ["exit-completion", endedExit?.sessionId],
    queryFn: async () => {
      const { notifications } = await getNotifications(null);
      return hasExitCompletedNotice(notifications, endedExit?.sessionId);
    },
    enabled: endedExit !== null,
    retry: false,
    refetchInterval: ({ state }) =>
      state.data || state.dataUpdateCount >= NOTICE_CHECK_LIMIT ? false : NOTICE_CHECK_INTERVAL_MS,
  });

  useEffect(() => {
    void useExitCompletionStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (!session || !shouldWatchExit(session) || watchedExit?.sessionId === session.id) return;

    watchExit({
      sessionId: session.id,
      merchantName: session.merchantName ?? session.boothName,
      plateNumber: session.plateNumber,
    });
  }, [session, watchedExit, watchExit]);

  const completedExit = endedExit && noticeQuery.data === true ? endedExit : null;

  return {
    isOpen: completedExit !== null,
    description: completedExit
      ? `${completedExit.merchantName ? `${completedExit.merchantName} · ` : ""}${formatVehicleNumber(completedExit.plateNumber)} 차량을 받으셨어요. 이용해 주셔서 감사해요`
      : "",
    confirm: clearWatchedExit,
  };
};

export { useExitCompletion };
