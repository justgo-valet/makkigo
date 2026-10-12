import "server-only";

interface Coordinates {
  latitude: number;
  longitude: number;
}

const REQUEST_TIMEOUT_MS = 3000;

const getKakaoJson = async (url: URL): Promise<unknown> => {
  const apiKey = process.env.KAKAO_REST_API_KEY?.trim();

  if (!apiKey) throw new Error("KAKAO_REST_API_KEY is not set");

  const response = await fetch(url, {
    headers: { Authorization: `KakaoAK ${apiKey}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) throw new Error(`Kakao API responded ${response.status}`);

  return response.json();
};

const findDrivingDurationSeconds = async (origin: Coordinates, destination: Coordinates) => {
  const url = new URL("https://apis-navi.kakaomobility.com/v1/directions");
  url.searchParams.set("origin", `${origin.longitude},${origin.latitude}`);
  url.searchParams.set("destination", `${destination.longitude},${destination.latitude}`);

  const body = (await getKakaoJson(url)) as {
    routes?: { result_code?: number; summary?: { duration?: number } }[];
  };
  const route = body.routes?.[0];

  if (route?.result_code === 104) return 0;
  if (route?.result_code !== 0 || typeof route.summary?.duration !== "number") return null;

  return route.summary.duration;
};

const findAddressCoordinates = async (address: string): Promise<Coordinates | null> => {
  const url = new URL("https://dapi.kakao.com/v2/local/search/address.json");
  url.searchParams.set("query", address);
  url.searchParams.set("size", "1");

  const body = (await getKakaoJson(url)) as { documents?: { x?: string; y?: string }[] };
  const latitude = Number(body.documents?.[0]?.y);
  const longitude = Number(body.documents?.[0]?.x);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return { latitude, longitude };
};

export { findAddressCoordinates, findDrivingDurationSeconds };
export type { Coordinates };
