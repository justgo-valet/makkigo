import "server-only";

import { z } from "zod";

import type { IndustryCategory } from "@/libs/merchantImport/contracts";
import type { ImportStore } from "./planMerchantImport";

const BASE_URL = "https://apis.data.go.kr/B553077/api/open/sdsc2/";
const PAGE_SIZE = 1000;
const REQUEST_TIMEOUT_MS = 15000;
const RESULT_OK = "00";
const RESULT_NO_DATA = "03";

class PublicDataError extends Error {}

const hasPublicDataServiceKey = () => Boolean(process.env.PUBLIC_DATA_SERVICE_KEY?.trim());

const readServiceKey = () => {
  const key = process.env.PUBLIC_DATA_SERVICE_KEY?.trim();
  if (!key) throw new PublicDataError("공공데이터 서비스키(PUBLIC_DATA_SERVICE_KEY)가 설정되지 않았습니다.");
  return key.includes("%") ? decodeURIComponent(key) : key;
};

const looseText = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((value) => (value === null || value === undefined ? null : String(value).trim() || null));

const coordinate = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((value) => {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  });

const envelopeSchema = z.object({
  header: z.object({ resultCode: z.string(), resultMsg: z.string().nullish() }),
  body: z.unknown(),
});

const responseSchema = z.union([envelopeSchema, z.object({ response: envelopeSchema }).transform(({ response }) => response)]);

const itemListSchema = z.union([
  z.array(z.unknown()),
  z.literal("").transform((): unknown[] => []),
  z
    .object({ item: z.union([z.array(z.unknown()), z.record(z.string(), z.unknown())]) })
    .transform(({ item }) => (Array.isArray(item) ? item : [item])),
]);

const storeSchema = z.object({
  bizesId: z.union([z.string().min(1), z.number()]).transform(String),
  bizesNm: z.string().min(1),
  brchNm: looseText,
  indsSclsNm: looseText,
  rdnmAdr: looseText,
  lnoAdr: looseText,
  newZipcd: looseText,
  lon: coordinate,
  lat: coordinate,
});

const storePageSchema = z.object({
  totalCount: z.union([z.number(), z.string().regex(/^\d+$/)]).transform(Number),
  items: itemListSchema.pipe(z.array(storeSchema)),
});

const largeIndustrySchema = z.object({ indsLclsCd: z.string().min(1), indsLclsNm: z.string().min(1) });
const middleIndustrySchema = z.object({ indsMclsCd: z.string().min(1), indsMclsNm: z.string().min(1) });

const summarize = (text: string, serviceKey: string) =>
  [serviceKey, encodeURIComponent(serviceKey)]
    .reduce((summary, secret) => summary.replaceAll(secret, "***"), text)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);

const requestPublicData = async (operation: string, params: Record<string, string>) => {
  const serviceKey = readServiceKey();
  const url = new URL(operation, BASE_URL);
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("type", "json");
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  let response: Response;
  let text: string;
  try {
    response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    text = await response.text();
  } catch {
    throw new PublicDataError(`공공데이터 API ${operation} 에 연결하지 못했습니다(시간 초과 등).`);
  }
  if (!response.ok) {
    throw new PublicDataError(`공공데이터 API ${operation} 가 ${response.status} 로 응답했습니다: ${summarize(text, serviceKey)}`);
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new PublicDataError(`공공데이터 API ${operation} 응답이 JSON 이 아닙니다: ${summarize(text, serviceKey)}`);
  }
  const parsed = responseSchema.safeParse(json);
  if (!parsed.success) throw new PublicDataError(`공공데이터 API ${operation} 응답 형식이 예상과 다릅니다.`);
  const { header, body } = parsed.data;
  if (header.resultCode === RESULT_NO_DATA) return null;
  if (header.resultCode !== RESULT_OK) {
    throw new PublicDataError(`공공데이터 API ${operation} 오류 ${header.resultCode}: ${header.resultMsg ?? ""}`.trim());
  }
  return body;
};

const parseBody = <Output>(operation: string, schema: z.ZodType<Output>, body: unknown) => {
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new PublicDataError(`공공데이터 API ${operation} 응답 형식이 예상과 다릅니다.`);
  return parsed.data;
};

const fetchIndustryCategories = async (largeCode: string | null): Promise<IndustryCategory[]> => {
  if (largeCode === null) {
    const body = await requestPublicData("largeUpjongList", {});
    const items = parseBody("largeUpjongList", z.object({ items: itemListSchema.pipe(z.array(largeIndustrySchema)) }), body ?? { items: [] });
    return items.items.map(({ indsLclsCd, indsLclsNm }) => ({ code: indsLclsCd, name: indsLclsNm }));
  }
  const body = await requestPublicData("middleUpjongList", { indsLclsCd: largeCode });
  const items = parseBody("middleUpjongList", z.object({ items: itemListSchema.pipe(z.array(middleIndustrySchema)) }), body ?? { items: [] });
  return items.items.map(({ indsMclsCd, indsMclsNm }) => ({ code: indsMclsCd, name: indsMclsNm }));
};

const toImportStore = (store: z.output<typeof storeSchema>): ImportStore => {
  const located =
    store.lat !== null && store.lon !== null && Math.abs(store.lat) <= 90 && Math.abs(store.lon) <= 180;
  return {
    publicDataId: store.bizesId,
    name: [store.bizesNm.trim(), store.brchNm].filter(Boolean).join(" "),
    address: store.rdnmAdr ?? store.lnoAdr,
    postalCode: store.newZipcd && /^\d{5}$/.test(store.newZipcd) ? store.newZipcd : null,
    latitude: located ? store.lat : null,
    longitude: located ? store.lon : null,
    category: store.indsSclsNm,
  };
};

const fetchStoresInSignguIndustry = async (signguCode: string, industryCode: string) => {
  const stores = new Map<string, ImportStore>();
  let rows = 0;
  let totalCount = 0;
  for (let pageNo = 1; pageNo === 1 || rows < totalCount; pageNo += 1) {
    const body = await requestPublicData("storeListInDong", {
      divId: "signguCd",
      key: signguCode,
      indsMclsCd: industryCode,
      numOfRows: String(PAGE_SIZE),
      pageNo: String(pageNo),
    });
    if (body === null) break;
    const page = parseBody("storeListInDong", storePageSchema, body);
    if (page.items.length === 0) break;
    totalCount = page.totalCount;
    rows += page.items.length;
    for (const store of page.items) stores.set(store.bizesId, toImportStore(store));
  }
  if (stores.size < totalCount) {
    throw new PublicDataError(`공공데이터 API 가 전체 ${totalCount}건 중 ${stores.size}건만 보내 수집을 멈췄습니다.`);
  }
  return [...stores.values()];
};

const fetchTargetStores = async (signguCode: string, industryCodes: string[]) => {
  const stores = new Map<string, ImportStore>();
  for (const industryCode of industryCodes) {
    for (const store of await fetchStoresInSignguIndustry(signguCode, industryCode)) stores.set(store.publicDataId, store);
  }
  return [...stores.values()];
};

export { fetchIndustryCategories, fetchTargetStores, hasPublicDataServiceKey, PublicDataError };
