"use client";

import { Button, Field, FieldError, FieldGroup, FieldLabel, Input } from "@makkigo/ui";
import { makkigoLogo } from "@makkigo/ui/assets";
import Image from "next/image";
import { useState } from "react";

export default function LoginForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-[0_8px_32px_rgba(3,9,15,0.08)]"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setPending(true);
        setError(null);
        const response = await fetch("/api/v1/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ loginId: form.get("loginId"), password: form.get("password") }),
        }).catch(() => null);
        if (response?.ok) {
          window.location.replace("/");
          return;
        }
        const body: unknown = await response?.json().catch(() => null);
        setError(
          body && typeof body === "object" && "message" in body && typeof body.message === "string"
            ? body.message
            : "로그인하지 못했어요. 다시 시도해 주세요.",
        );
        setPending(false);
      }}
    >
      <Image src={makkigoLogo} alt="마끼고" width={132} height={54} priority />
      <h1 className="mt-6 text-2xl font-bold tracking-tight">관리자 로그인</h1>
      <FieldGroup className="mt-8 gap-5">
        <Field>
          <FieldLabel htmlFor="loginId">아이디</FieldLabel>
          <Input id="loginId" name="loginId" autoComplete="username" required autoFocus />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">비밀번호</FieldLabel>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        {error && <FieldError>{error}</FieldError>}
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "로그인 중…" : "로그인"}
        </Button>
      </FieldGroup>
    </form>
  );
}
