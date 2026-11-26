"use client";

import { ArrowLeft } from "lucide-react";

import { useIsInApp } from "@/libs/common/useIsInApp";

export default function PartnerLoginLink({ href }: Readonly<{ href: string }>) {
  if (!useIsInApp()) return null;
  return (
    <a
      href={href}
      className="inline-flex h-10 items-center gap-1 self-start rounded-lg px-2 text-sm text-(--tertiary-color) transition-colors hover:bg-black/5 hover:text-(--base-color)"
    >
      <ArrowLeft className="size-4" aria-hidden />
      파트너 로그인으로 돌아가기
    </a>
  );
}
