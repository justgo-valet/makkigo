import "server-only";

import { sendUserNotification } from "@makkigo/push";

interface PickupCompletedNotice {
  userId: number;
  valetSessionId: number;
  plateNumber: string;
  merchantName: string | null;
}

const notifyPickupCompleted = async ({
  userId,
  valetSessionId,
  plateNumber,
  merchantName,
}: PickupCompletedNotice) => {
  const place = merchantName ? `${merchantName} · ` : "";

  try {
    await sendUserNotification({
      userId,
      type: "PICKUP_COMPLETED",
      valetSessionId,
      title: "출차 완료",
      body: `${place}${plateNumber} 차량의 출차가 완료됐어요`,
    });
  } catch (error) {
    console.error("Failed to notify pickup completion", error);
  }
};

export { notifyPickupCompleted };
export type { PickupCompletedNotice };
