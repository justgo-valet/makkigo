"use client";

import { Button, FieldError, Input, Label } from "@makkigo/ui";
import { makkigoLogo } from "@makkigo/ui/assets";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import type { FormEvent } from "react";

const FAILED_MESSAGE = "로그인하지 못했어요. 다시 시도해 주세요.";

export default function LoginForm() {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId, password }),
      });
      if (response.ok) {
        window.location.replace("/");
        return;
      }
      const body: unknown = await response.json().catch(() => null);
      const message = typeof body === "object" && body !== null && "message" in body ? body.message : null;
      setError(typeof message === "string" ? message : FAILED_MESSAGE);
    } catch {
      setError(FAILED_MESSAGE);
    }
    setPending(false);
  };

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-sm rounded-2xl bg-white p-6 sm:p-8 shadow-[0_8px_32px_rgba(3,9,15,0.08)]"
    >
      <Image src={makkigoLogo} alt="마끼고" width={132} height={54} priority />
      <h1 className="mt-6 text-2xl font-bold tracking-tight">업체 관리</h1>
      <p className="mt-2 text-sm leading-relaxed break-keep text-(--tertiary-color)">
        마끼고 운영팀이 발급해 드린 아이디와 비밀번호로 로그인해 주세요. 비밀번호를 잊어버렸다면 운영팀에 문의해 주세요.
      </p>
      <div className="mt-8 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="loginId">아이디</Label>
          <Input
            id="loginId"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            maxLength={100}
            value={loginId}
            onChange={(event) => setLoginId(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">비밀번호</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={200}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        {error && <FieldError className="text-center">{error}</FieldError>}
        <Button type="submit" size="lg" className="mt-2 w-full" disabled={pending}>
          {pending ? "로그인 중…" : "로그인"}
        </Button>
        <p className="text-center text-sm text-(--tertiary-color)">
          계정이 없나요?{" "}
          <Link href="/find-merchant" className="font-medium text-primary hover:underline">
            내 업체 찾기
          </Link>
        </p>
      </div>
    </form>
  );
}
