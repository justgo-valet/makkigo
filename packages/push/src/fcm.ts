import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

const SERVICE_ACCOUNT_ENV = "FIREBASE_SERVICE_ACCOUNT_JSON";
const INVALID_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

export type PushSound = "default" | "valet-arrival" | "valet-pickup" | "user-pickup-completed";

interface PlatformSound {
  androidChannelId: string;
  iosSound: string;
}

// 음성 알림음. 앱(makkigo-mobile)에 같은 이름의 Android 채널 · iOS 소리 파일이 들어 있고, OS가 알림 소리로 재생한다.
// 이 채널 · 파일이 없는 예전 앱은 기본 채널 · 기본 알림음으로 울린다.
// Android 는 만든 채널의 소리를 바꿀 수 없으므로 소리를 바꾸려면 새 채널 id 를 쓴다.
const PLATFORM_SOUNDS: Record<PushSound, PlatformSound> = {
  default: { androidChannelId: "makkigo_default", iosSound: "default" },
  // 요원 앱: "차량이 곧 도착합니다"
  "valet-arrival": { androidChannelId: "makkigo_valet_arrival", iosSound: "valet_arrival.caf" },
  // 요원 앱: "출차 요청이 왔습니다"
  "valet-pickup": { androidChannelId: "makkigo_valet_pickup", iosSound: "valet_pickup.caf" },
  // 고객 앱: "차량이 준비되었습니다"
  "user-pickup-completed": {
    androidChannelId: "makkigo_user_pickup_completed",
    iosSound: "user_pickup_completed.caf",
  },
};

export const platformSound = (sound: PushSound): PlatformSound => PLATFORM_SOUNDS[sound];

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

  const { androidChannelId, iosSound } = platformSound(sound);

  const response = await getMessaging(getFirebaseApp()).sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: link ? { link } : undefined,
    android: {
      priority: "high",
      notification: { channelId: androidChannelId },
    },
    apns: { payload: { aps: { sound: iosSound } } },
  });

  const sentTokens = response.responses.flatMap((result, index) =>
    result.success ? [tokens[index]!] : [],
  );
  const invalidTokens = response.responses.flatMap((result, index) =>
    !result.success && isInvalidTokenError(result.error?.code) ? [tokens[index]!] : [],
  );

  return { sentCount: response.successCount, sentTokens, invalidTokens };
};
