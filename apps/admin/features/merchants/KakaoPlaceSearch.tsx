"use client";

import { getErrorMessage } from "@makkigo/api-client";
import { Button, FieldError, Input } from "@makkigo/ui";
import Link from "next/link";
import { useState } from "react";

import { apiClient } from "@/libs/common/apiClient";

import type { KakaoPlace } from "@/libs/merchant/contracts";

export default function KakaoPlaceSearch({ onSelect }: Readonly<{ onSelect: (place: KakaoPlace) => void }>) {
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<KakaoPlace[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setPending(true);
    setError(null);
    try {
      const body = await apiClient
        .get("kakao-places", { searchParams: { query: query.trim() } })
        .json<{ places: KakaoPlace[] }>();
      setPlaces(body.places);
    } catch (cause) {
      setError(getErrorMessage(cause, "카카오 장소를 검색하지 못했어요."));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Input
          value={query}
          placeholder="상호 · 주소로 카카오 장소 검색"
          aria-label="카카오 장소 검색어"
          maxLength={100}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void search();
            }
          }}
        />
        <Button type="button" variant="outline" disabled={pending} onClick={() => void search()}>
          {pending ? "검색 중…" : "검색"}
        </Button>
      </div>
      {error && <FieldError>{error}</FieldError>}
      {places && (
        <ul className="max-h-80 overflow-y-auto rounded-md border bg-white">
          {places.length === 0 && <li className="p-3 text-sm text-(--tertiary-color)">검색 결과가 없어요.</li>}
          {places.map((place) => (
            <li key={place.kakaoPlaceId} className="flex items-center justify-between gap-3 border-b p-3 last:border-0">
              <div className="min-w-0">
                <p className="text-sm font-medium">{place.name}</p>
                <p className="truncate text-xs text-(--tertiary-color)">
                  {place.address}
                  {place.phone ? ` · ${place.phone}` : ""}
                </p>
              </div>
              {place.merchantId ? (
                <Link href={`/merchants/${place.merchantId}`} className="shrink-0 text-xs text-primary hover:underline">
                  이미 등록됨
                </Link>
              ) : (
                <Button type="button" size="sm" variant="secondary" onClick={() => onSelect(place)}>
                  선택
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
