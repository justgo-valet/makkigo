import { cert, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

const [token, link = "/"] = process.argv.slice(2);

if (!token || !process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  console.error(
    "사용법: node --env-file=apps/users/.env.development.local packages/push/scripts/send-test.mjs <FCM 토큰> [열 경로]",
  );
  process.exit(1);
}

initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)) });

const messageId = await getMessaging().send({
  token,
  notification: { title: "마끼고 테스트 알림", body: "푸시가 잘 도착했어요." },
  data: { link },
  android: { priority: "high", notification: { channelId: "makkigo_default" } },
  apns: { payload: { aps: { sound: "default" } } },
});

console.log("보냄:", messageId);
