"use client";

import { useEffect, useRef, useState } from "react";

import { loadKakaoMaps } from "@/libs/kakao/loadKakaoMaps";

import type { KakaoGeocoderResult, KakaoMapsApi, KakaoPlace } from "@/libs/kakao/loadKakaoMaps";

interface MerchantAddressSelection {
  roadAddress: string;
  postalCode: string;
}

interface MerchantCoordinates {
  latitude: number;
  longitude: number;
}

interface AddressSearchResult extends MerchantAddressSelection {
  placeName: string | null;
  lotAddress: string | null;
}

type AddressSearchState =
  | { status: "idle" }
  | { status: "searching" }
  | { status: "error" }
  | { status: "done"; results: AddressSearchResult[] };
type CoordinateState = "idle" | "loading" | "ready" | "error";

const ADDRESS_SEARCH_SIZE = 30;
const PLACE_SEARCH_SIZE = 10;

const toList =
  <T,>(maps: KakaoMapsApi, resolve: (value: T[]) => void, reject: (error: Error) => void) =>
  (results: T[], status: string) => {
    if (status === maps.services.Status.ZERO_RESULT) resolve([]);
    else if (status === maps.services.Status.OK) resolve(results);
    else reject(new Error(status));
  };

const findRoadAddresses = async (maps: KakaoMapsApi, query: string, size: number) => {
  const results = await new Promise<KakaoGeocoderResult[]>((resolve, reject) =>
    new maps.services.Geocoder().addressSearch(query, toList(maps, resolve, reject), { size }),
  );
  return results.flatMap(({ address, road_address }) =>
    road_address?.zone_no
      ? [
          {
            roadAddress: road_address.address_name,
            postalCode: road_address.zone_no,
            placeName: null,
            lotAddress: address?.address_name ?? null,
          },
        ]
      : [],
  );
};

const findPlaceAddresses = async (maps: KakaoMapsApi, query: string) => {
  const places = await new Promise<KakaoPlace[]>((resolve, reject) =>
    new maps.services.Places().keywordSearch(query, toList(maps, resolve, reject), {
      size: PLACE_SEARCH_SIZE,
    }),
  );
  const roadAddresses = new Map<string, string>();
  for (const { road_address_name, place_name } of places) {
    if (road_address_name && !roadAddresses.has(road_address_name)) {
      roadAddresses.set(road_address_name, place_name);
    }
  }
  const found = await Promise.allSettled(
    [...roadAddresses].map(async ([roadAddress, placeName]) => {
      const [match] = await findRoadAddresses(maps, roadAddress, 1);
      return match ? [{ ...match, placeName }] : [];
    }),
  );
  return found.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
};

const searchAddresses = async (kakaoMapAppKey: string, query: string) => {
  const maps = await loadKakaoMaps(kakaoMapAppKey);
  const addresses = await findRoadAddresses(maps, query, ADDRESS_SEARCH_SIZE);
  return addresses.length > 0 ? addresses : findPlaceAddresses(maps, query);
};

const useMerchantAddress = (kakaoMapAppKey: string) => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchId = useRef(0);
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState<AddressSearchState>({ status: "idle" });
  const [selection, setSelection] = useState<MerchantAddressSelection | null>(null);
  const [lookupAttempt, setLookupAttempt] = useState(0);
  const [lookup, setLookup] = useState<{
    key: string;
    coordinates: MerchantCoordinates | null;
  } | null>(null);
  const roadAddress = selection?.roadAddress ?? null;
  const lookupKey = `${roadAddress}:${lookupAttempt}`;

  useEffect(() => {
    if (roadAddress === null) return;
    let cancelled = false;
    const key = `${roadAddress}:${lookupAttempt}`;
    const finish = (coordinates: MerchantCoordinates | null) => {
      if (!cancelled) setLookup({ key, coordinates });
    };

    loadKakaoMaps(kakaoMapAppKey)
      .then((maps) => {
        new maps.services.Geocoder().addressSearch(roadAddress, (results, status) => {
          const [first] = results ?? [];
          const found = { latitude: Number(first?.y), longitude: Number(first?.x) };
          finish(
            status === maps.services.Status.OK &&
              Number.isFinite(found.latitude) &&
              Number.isFinite(found.longitude)
              ? found
              : null,
          );
        });
      })
      .catch(() => finish(null));

    return () => {
      cancelled = true;
    };
  }, [roadAddress, kakaoMapAppKey, lookupAttempt]);

  const coordinates = lookup?.key === lookupKey ? lookup.coordinates : null;
  let coordinateState: CoordinateState;
  if (roadAddress === null) coordinateState = "idle";
  else if (lookup?.key !== lookupKey) coordinateState = "loading";
  else coordinateState = coordinates ? "ready" : "error";

  const close = () => {
    searchId.current += 1;
    setSearchOpen(false);
    triggerRef.current?.focus();
  };

  return {
    triggerRef,
    isSearchOpen,
    search,
    selection,
    coordinates,
    coordinateState,
    open: () => {
      setSearch({ status: "idle" });
      setSearchOpen(true);
    },
    close,
    searchAddresses: async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) return;
      const id = ++searchId.current;
      setSearch({ status: "searching" });
      try {
        const results = await searchAddresses(kakaoMapAppKey, trimmed);
        if (id === searchId.current) setSearch({ status: "done", results });
      } catch {
        if (id === searchId.current) setSearch({ status: "error" });
      }
    },
    select: ({ roadAddress: selectedRoadAddress, postalCode }: AddressSearchResult) => {
      setSelection({ roadAddress: selectedRoadAddress, postalCode });
      close();
    },
    retryCoordinates: () => setLookupAttempt((attempt) => attempt + 1),
  };
};

export { useMerchantAddress };
export type { AddressSearchResult };
