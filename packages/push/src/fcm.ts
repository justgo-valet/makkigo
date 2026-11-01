import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

const SERVICE_ACCOUNT_ENV = "FIREBASE_SERVICE_ACCOUNT_JSON";
const ANDROID_CHANNEL_ID = "makkigo_default";
// 요원 앱 전용 알림음. 앱(makkigo-mobile valetagents)에 같은 이름의 Android 채널 · iOS 소리 파일이 있다.
// 이 채널 · 파일이 없는 예전 앱은 기본 채널 · 기본 알림음으로 울린다.
const VALET_ALERT_ANDROID_CHANNEL_ID = "makkigo_valet_alert";
const VALET_ALERT_IOS_SOUND = "valet_alert.caf";
const INVALID_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

export type PushSound = "default" | "valet-alert";

export interface PushMessage {
  title: string;
  body: string;
  link?: string;
  sound?: PushSound;
}

export interface PushSendResult {
  sentCount: number;
  sentTokens: string[];
  invalidTokens: string[];
}

const getFirebaseApp = () => {
  const existing = getApps()[0];
  if (existing) return existing;

  const serviceAccount = process.env[SERVICE_ACCOUNT_ENV]?.trim();
  if (!serviceAccount) {
    throw new Error(`환경변수 ${SERVICE_ACCOUNT_ENV} 이 설정되지 않았습니다.`);
  }

  return initializeApp({ credential: cert(JSON.parse(serviceAccount)) });
};

export const isInvalidTokenError = (code: string | undefined) =>
  code !== undefined && INVALID_TOKEN_CODES.has(code);

export const sendPushToTokens = async (
  tokens: string[],
  { title, body, link, sound = "default" }: PushMessage,
): Promise<PushSendResult> => {
  if (tokens.length === 0) return { sentCount: 0, sentTokens: [], invalidTokens: [] };

  const response = await getMessaging(getFirebaseApp()).sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: link ? { link } : undefined,
    android: {
      priority: "high",
      notification: {
        channelId: sound === "valet-alert" ? VALET_ALERT_ANDROID_CHANNEL_ID : ANDROID_CHANNEL_ID,
      },
    },
    apns: { payload: { aps: { sound: sound === "valet-alert" ? VALET_ALERT_IOS_SOUND : "default" } } },
  });

  const sentTokens = response.responses.flatMap((result, index) =>
    result.success ? [tokens[index]!] : [],
  );
  const invalidTokens = response.responses.flatMap((result, index) =>
    !result.success && isInvalidTokenError(result.error?.code) ? [tokens[index]!] : [],
  );

  return { sentCount: response.successCount, sentTokens, invalidTokens };
};
