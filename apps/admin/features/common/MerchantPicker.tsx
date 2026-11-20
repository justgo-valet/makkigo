"use client";

import { getErrorMessage } from "@makkigo/api-client";
import { Button, FieldError, Input } from "@makkigo/ui";
import { useState } from "react";

import { apiClient } from "@/libs/common/apiClient";

import type { MerchantOption } from "@/libs/merchant/contracts";

export default function MerchantPicker({
  onSelect,
  disabled,
}: Readonly<{ onSelect: (merchant: MerchantOption) => void; disabled?: boolean }>) {
  const [query, setQuery] = useState("");
  const [merchants, setMerchants] = useState<MerchantOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const search = async () => {
    setPending(true);
    setError(null);
    try {
      const body = await apiClient
        .get("merchants", { searchParams: { query: query.trim() } })
        .json<{ merchants: MerchantOption[] }>();
      setMerchants(body.merchants);
    } catch (cause) {
      setError(getErrorMessage(cause, "업체를 찾지 못했어요."));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          value={query}
          placeholder="업체 이름"
          aria-label="업체 이름"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void search();
            }
          }}
        />
        <Button type="button" variant="outline" disabled={pending} onClick={() => void search()}>
          찾기
        </Button>
      </div>
      {error && <FieldError>{error}</FieldError>}
      {merchants && (
        <ul className="max-h-64 overflow-y-auto rounded-md border">
          {merchants.length === 0 && <li className="p-3 text-sm text-(--tertiary-color)">찾는 업체가 없어요.</li>}
          {merchants.map((merchant) => (
            <li key={merchant.id} className="border-b last:border-0">
              <button
                type="button"
                disabled={disabled}
                className="flex w-full flex-col items-start gap-0.5 p-3 text-left hover:bg-muted disabled:opacity-50"
                onClick={() => onSelect(merchant)}
              >
                <span className="text-sm font-medium">{merchant.name}</span>
                <span className="text-xs text-(--tertiary-color)">{merchant.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
