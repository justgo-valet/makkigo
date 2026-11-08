"use client";

import { Button, FieldError, Input } from "@makkigo/ui";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
} from "@makkigo/ui/components/ui/bottom-sheet";
import { useState } from "react";

import { MAX_VALET_FEE } from "@/libs/valet/contracts/fee";

import { formatPlateNumber } from "../formatters";

import type { CompletedValetSession } from "../schemas/sessions";

type FeeTarget = Pick<CompletedValetSession, "id" | "plateNumber" | "fee">;

interface FeeEditFormProps {
  session: FeeTarget;
  isUpdating: boolean;
  errorMessage: string | null;
  onSave: (fee: number) => void;
  onClose: () => void;
}

function FeeEditForm({
  session,
  isUpdating,
  errorMessage,
  onSave,
  onClose,
}: Readonly<FeeEditFormProps>) {
  const [fee, setFee] = useState(session.fee === null ? "" : String(session.fee));
  const amount = Number(fee);
  const canSave = fee !== "" && amount <= MAX_VALET_FEE && amount !== session.fee;

  return (
    <form
      className="flex min-h-0 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSave && !isUpdating) onSave(amount);
      }}
    >
      <BottomSheetHeader
        title="발렛 금액 수정"
        description="출차 완료된 차량의 발렛 금액을 고쳐요"
      />

      <div className="px-5 pt-5">
        <p className="text-center text-2xl font-bold tabular-nums text-(--base-color)">
          {formatPlateNumber(session.plateNumber)}
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Input
            aria-label="발렛 금액"
            inputMode="numeric"
            autoComplete="off"
            value={fee === "" ? "" : amount.toLocaleString("ko-KR")}
            onChange={(event) => setFee(event.target.value.replace(/\D/g, "").slice(0, 8))}
            className="h-14 flex-1 bg-white text-right text-2xl tabular-nums text-(--base-color) md:text-2xl"
          />
          <span className="w-6 text-xl text-(--base-color)">원</span>
        </div>
        {errorMessage && <FieldError className="mt-3">{errorMessage}</FieldError>}
      </div>

      <BottomSheetFooter className="flex-row pt-6">
        <Button
          type="button"
          variant="outline"
          size="xl"
          className="flex-1 text-(--tertiary-color)"
          onClick={onClose}
        >
          닫기
        </Button>
        <Button type="submit" size="xl" className="flex-1" disabled={isUpdating || !canSave}>
          저장
        </Button>
      </BottomSheetFooter>
    </form>
  );
}

interface FeeEditSheetProps extends Omit<FeeEditFormProps, "session"> {
  session: FeeTarget | null;
}

export default function FeeEditSheet({ session, ...form }: Readonly<FeeEditSheetProps>) {
  const [shown, setShown] = useState(session);
  if (session && session !== shown) setShown(session);

  return (
    <BottomSheet open={session !== null} onClose={form.onClose}>
      <BottomSheetContent>
        {shown && <FeeEditForm key={shown.id} session={shown} {...form} />}
      </BottomSheetContent>
    </BottomSheet>
  );
}
