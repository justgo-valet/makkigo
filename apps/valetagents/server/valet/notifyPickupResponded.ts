import "server-only";

import { sendUserNotification } from "@makkigo/push";

interface PickupRespondedNotice {
  userId: number;
  valetSessionId: number;
  plateNumber: string;
  merchantName: string | null;
  actualFee: number;
  expectedPickupMinutes: number;
}

const notifyPickupResponded = async ({
  userId,
  valetSessionId,
  plateNumber,
  merchantName,
  actualFee,
  expectedPickupMinutes,
}: PickupRespondedNotice) => {
  const place = merchantName ? `${merchantName} · ` : "";

  try {
    await sendUserNotification({
      userId,
      type: "PICKUP_RESPONDED",
      valetSessionId,
      title: "출차 응답",
      body: `${place}${plateNumber} 차량이 ${expectedPickupMinutes}분 뒤 출차돼요. 요금은 ${actualFee.toLocaleString("ko-KR")}원이에요`,
    });
  } catch (error) {
    console.error("Failed to notify pickup response", error);
  }
};

export { notifyPickupResponded };
export type { PickupRespondedNotice };
