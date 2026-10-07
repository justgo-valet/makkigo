"use client";

import { Button, FieldError } from "@makkigo/ui";

import { useMemberGate } from "@/features/auth/hooks/useMemberGate";

import type { MemberArea } from "@/features/auth/hooks/useMemberGate";
import type { ReactNode } from "react";

interface MemberGateProps {
  area: MemberArea;
  children: ReactNode;
}

export default function MemberGate({ area, children }: Readonly<MemberGateProps>) {
  const gate = useMemberGate(area);

  if (gate.status === "error") {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full gap-3">
        <FieldError>{gate.errorMessage}</FieldError>
        <Button variant="outline" onClick={gate.retry}>
          다시 시도
        </Button>
      </div>
    );
  }

  if (gate.status === "loading") return null;

  return children;
}
