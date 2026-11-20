"use client";

import { Button, FieldError, Input, Label } from "@makkigo/ui";
import { Checkbox } from "@makkigo/ui/components/ui/checkbox";
import Link from "next/link";
import { useState } from "react";

import type { MerchantAccountRequestBody } from "@/libs/merchantAccountRequest/contracts";
import type { FormEvent } from "react";

const FAILED_MESSAGE = "요청을 보내지 못했어요. 다시 시도해 주세요.";

interface RequestableMerchant {
  id: number;
  name: string;
  address: string;
  category: string | null;
}

export default function AccountRequestForm({ merchant }: Readonly<{ merchant: RequestableMerchant | null }>) {
  const [consented, setConsented] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body: MerchantAccountRequestBody = {
      merchantId: merchant?.id ?? null,
      merchantName: String(form.get("merchantName") ?? ""),
      merchantAddress: String(form.get("merchantAddress") ?? ""),
      requesterName: String(form.get("requesterName") ?? ""),
      requesterPhone: String(form.get("requesterPhone") ?? ""),
      privacyConsent: true,
    };
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/v1/merchant-account-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        setDone(true);
        return;
      }
      const result: unknown = await response.json().catch(() => null);
      const message = typeof result === "object" && result !== null && "message" in result ? result.message : null;
      setError(typeof message === "string" ? message : FAILED_MESSAGE);
    } catch {
      setError(FAILED_MESSAGE);
    }
    setPending(false);
  };

  if (done) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center">
        <p className="font-medium">요청을 접수했어요.</p>
        <p className="mt-2 text-sm break-keep text-(--tertiary-color)">
          운영팀이 확인한 뒤 남겨 주신 연락처로 연락드릴게요.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/login">로그인으로</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-2xl bg-white p-6">
      {merchant ? (
        <div className="rounded-xl bg-(--surface-color) p-4">
          <p className="font-medium">{merchant.name}</p>
          <p className="mt-1 text-sm break-keep text-(--tertiary-color)">
            {merchant.category ? `${merchant.category} · ` : ""}
            {merchant.address}
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="merchantName">업체 이름</Label>
            <Input id="merchantName" name="merchantName" required maxLength={100} autoComplete="organization" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="merchantAddress">업체 주소</Label>
            <Input id="merchantAddress" name="merchantAddress" required maxLength={200} autoComplete="street-address" />
          </div>
        </>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="requesterName">요청하는 분 이름</Label>
        <Input id="requesterName" name="requesterName" required maxLength={50} autoComplete="name" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="requesterPhone">연락처</Label>
        <Input
          id="requesterPhone"
          name="requesterPhone"
          type="tel"
          inputMode="tel"
          required
          maxLength={20}
          placeholder="010-1234-5678"
          autoComplete="tel"
        />
      </div>
      <div className="flex items-start gap-2 rounded-xl bg-(--surface-color) p-4">
        <Checkbox
          id="privacyConsent"
          checked={consented}
          onCheckedChange={(checked) => setConsented(checked === true)}
          className="mt-0.5 bg-white"
        />
        <Label htmlFor="privacyConsent" className="flex-col items-start gap-1 text-sm font-normal leading-relaxed">
          <span className="font-medium">개인정보 수집 · 이용에 동의합니다. (필수)</span>
          <span className="break-keep text-(--tertiary-color)">
            수집 항목: 이름, 연락처 · 목적: 업체 관리자 계정 발급 안내 · 보관: 요청을 처리한 뒤 30일이 지나면 지웁니다.
          </span>
        </Label>
      </div>
      {error && <FieldError className="text-center">{error}</FieldError>}
      <Button type="submit" size="lg" className="w-full" disabled={pending || !consented}>
        {pending ? "보내는 중…" : "요청 보내기"}
      </Button>
    </form>
  );
}
