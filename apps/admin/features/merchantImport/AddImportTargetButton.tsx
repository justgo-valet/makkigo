"use client";

import { getErrorMessage } from "@makkigo/api-client";
import { Button, Field, FieldDescription, FieldError, FieldGroup, FieldLabel, Input } from "@makkigo/ui";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@makkigo/ui/components/ui/dialog";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiClient } from "@/libs/common/apiClient";

import type { IndustryCategory, MerchantImportTargetBody, SignguRegion } from "@/libs/merchantImport/contracts";

const loadIndustries = (parent: string | null) =>
  apiClient
    .get("industry-categories", { searchParams: parent ? { parent } : {}, timeout: 30_000 })
    .json<{ industries: IndustryCategory[] }>()
    .then(({ industries }) => industries);

export default function AddImportTargetButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [regionQuery, setRegionQuery] = useState("");
  const [region, setRegion] = useState<SignguRegion | null>(null);
  const [regionError, setRegionError] = useState<string | null>(null);
  const [largeCategories, setLargeCategories] = useState<IndustryCategory[] | null>(null);
  const [middleCategories, setMiddleCategories] = useState<IndustryCategory[] | null>(null);
  const [selected, setSelected] = useState<IndustryCategory[]>([]);
  const [industryError, setIndustryError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setRegionQuery("");
    setRegion(null);
    setRegionError(null);
    setLargeCategories(null);
    setMiddleCategories(null);
    setSelected([]);
    setIndustryError(null);
    setError(null);
  };

  const showIndustries = async (parent: string | null) => {
    setIndustryError(null);
    try {
      const industries = await loadIndustries(parent);
      if (parent === null) setLargeCategories(industries);
      else setMiddleCategories(industries);
    } catch (cause) {
      setIndustryError(getErrorMessage(cause, "업종 목록을 불러오지 못했어요."));
    }
  };

  const findRegion = async () => {
    setRegionError(null);
    setRegion(null);
    try {
      const body = await apiClient
        .get("regions", { searchParams: { query: regionQuery.trim() } })
        .json<{ region: SignguRegion }>();
      setRegion(body.region);
    } catch (cause) {
      setRegionError(getErrorMessage(cause, "지역을 찾지 못했어요."));
    }
  };

  const toggle = (industry: IndustryCategory, checked: boolean) =>
    setSelected((current) =>
      checked ? [...current, industry] : current.filter(({ code }) => code !== industry.code),
    );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void showIndustries(null);
        else reset();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button">
          <Plus aria-hidden />
          수집 대상 추가
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>수집 대상 추가</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!region || selected.length === 0) {
              setError("지역을 찾고 업종을 하나 이상 골라 주세요.");
              return;
            }
            const body: MerchantImportTargetBody = {
              signguCode: region.code,
              signguName: region.name,
              industries: selected,
            };
            setPending(true);
            setError(null);
            try {
              await apiClient.post("merchant-import-targets", { json: body });
              setOpen(false);
              reset();
              router.refresh();
            } catch (cause) {
              setError(getErrorMessage(cause, "수집 대상을 저장하지 못했어요."));
            } finally {
              setPending(false);
            }
          }}
        >
          <FieldGroup className="gap-5">
            <Field>
              <FieldLabel htmlFor="regionQuery">지역 (시군구)</FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="regionQuery"
                  value={regionQuery}
                  placeholder="서울 강남구"
                  autoComplete="off"
                  onChange={(event) => setRegionQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void findRegion();
                    }
                  }}
                />
                <Button type="button" variant="outline" disabled={!regionQuery.trim()} onClick={() => void findRegion()}>
                  찾기
                </Button>
              </div>
              <FieldDescription>
                {region
                  ? `${region.name} (시군구 코드 ${region.code}) 으로 추가해요.`
                  : "구가 있는 시(수원 · 성남 · 고양 등)는 \"수원시 장안구\" 처럼 구 단위로 입력해 주세요."}
              </FieldDescription>
              {regionError && <FieldError>{regionError}</FieldError>}
            </Field>
            <Field>
              <FieldLabel htmlFor="largeCategory">업종</FieldLabel>
              <select
                id="largeCategory"
                defaultValue=""
                disabled={!largeCategories}
                className="h-9 rounded-md border bg-white px-3 text-sm"
                onChange={(event) => {
                  setMiddleCategories(null);
                  if (event.target.value) void showIndustries(event.target.value);
                }}
              >
                <option value="">대분류를 고르세요</option>
                {largeCategories?.map(({ code, name }) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
              {middleCategories && (
                <ul className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto rounded-md border p-3">
                  {middleCategories.map((industry) => (
                    <li key={industry.code}>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="size-4 accent-primary"
                          checked={selected.some(({ code }) => code === industry.code)}
                          onChange={(event) => toggle(industry, event.target.checked)}
                        />
                        {industry.name}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              {selected.length > 0 && (
                <FieldDescription>고른 업종: {selected.map(({ name }) => name).join(", ")}</FieldDescription>
              )}
              {industryError && <FieldError>{industryError}</FieldError>}
            </Field>
            {error && <FieldError>{error}</FieldError>}
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                추가
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
