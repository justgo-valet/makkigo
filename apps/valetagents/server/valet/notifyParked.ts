import "server-only";

import { sendUserNotification } from "@makkigo/push";

interface ParkedNotice {
  userId: number;
  valetSessionId: number;
  plateNumber: string;
  merchantName: string | null;
}

const notifyParked = async ({ userId, valetSessionId, plateNumber, merchantName }: ParkedNotice) => {
  const place = merchantName ? `${merchantName} · ` : "";

  try {
    await sendUserNotification({
      userId,
      type: "PARKED",
      valetSessionId,
      title: "주차 완료",
      body: `${place}${plateNumber} 차량의 주차가 완료됐어요`,
    });
  } catch (error) {
    console.error("Failed to notify parked", error);
  }
};

export { notifyParked };
export type { ParkedNotice };
