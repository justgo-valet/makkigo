import "server-only";

import { prisma } from "database";

import type { KakaoPlace } from "@/libs/merchant/contracts";

const REQUEST_TIMEOUT_MS = 3000;

interface KakaoKeywordDocument {
  id?: string;
  place_name?: string;
  road_address_name?: string;
  address_name?: string;
  phone?: string;
  x?: string;
  y?: string;
}

const getKakaoJson = async (path: string, params: Record<string, string>): Promise<unknown> => {
  const apiKey = process.env.KAKAO_REST_API_KEY?.trim();
  if (!apiKey) throw new Error("KAKAO_REST_API_KEY is not set");
  const url = new URL(path, "https://dapi.kakao.com");
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  const response = await fetch(url, {
    headers: { Authorization: `KakaoAK ${apiKey}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Kakao API responded ${response.status}`);
  return response.json();
};

const findPostalCode = async (address: string) => {
  const body = (await getKakaoJson("/v2/local/search/address.json", { query: address, size: "1" })) as {
    documents?: { road_address?: { zone_no?: string } | null }[];
  };
  const zoneNo = body.documents?.[0]?.road_address?.zone_no;
  return zoneNo && /^\d{5}$/.test(zoneNo) ? zoneNo : null;
};

export const searchKakaoPlaces = async (query: string): Promise<KakaoPlace[]> => {
  const body = (await getKakaoJson("/v2/local/search/keyword.json", { query, size: "10" })) as {
    documents?: KakaoKeywordDocument[];
  };
  const places = (body.documents ?? []).flatMap((document) => {
    const latitude = Number(document.y);
    const longitude = Number(document.x);
    const address = document.road_address_name || document.address_name;
    if (!document.id || !document.place_name || !address || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return [];
    }
    return [{ kakaoPlaceId: document.id, name: document.place_name, address, latitude, longitude, phone: document.phone || null }];
  });
  const [postalCodes, merchants] = await Promise.all([
    Promise.all(places.map(({ address }) => findPostalCode(address).catch(() => null))),
    prisma.merchant.findMany({
      where: { kakaoPlaceId: { in: places.map(({ kakaoPlaceId }) => kakaoPlaceId) } },
      select: { id: true, kakaoPlaceId: true },
    }),
  ]);
  const merchantIds = new Map(merchants.map(({ id, kakaoPlaceId }) => [kakaoPlaceId, id]));
  return places.map((place, index) => ({
    ...place,
    postalCode: postalCodes[index] ?? null,
    merchantId: merchantIds.get(place.kakaoPlaceId) ?? null,
  }));
};
