"use client";

import { Button, FieldError } from "@makkigo/ui";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
} from "@makkigo/ui/components/ui/bottom-sheet";
import { useState } from "react";

import { formatPlateNumber, formatWon } from "../formatters";

interface PlateConfirmSheetProps {
  title: string;
  description: string;
  plateNumber: string | null;
  fee?: number | null;
  isPending: boolean;
  errorMessage: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

export default function PlateConfirmSheet({
  title,
  description,
  plateNumber,
  fee,
  isPending,
  errorMessage,
  onConfirm,
  onClose,
}: Readonly<PlateConfirmSheetProps>) {
  const [shown, setShown] = useState({ plateNumber, fee });
  if (plateNumber && (plateNumber !== shown.plateNumber || fee !== shown.fee)) {
    setShown({ plateNumber, fee });
  }

  return (
    <BottomSheet open={plateNumber !== null} onClose={onClose}>
      <BottomSheetContent>
        <BottomSheetHeader title={title} description={description} />
        <p className="px-5 pt-6 pb-2 text-center text-3xl font-bold tabular-nums text-(--base-color)">
          {shown.plateNumber && formatPlateNumber(shown.plateNumber)}
        </p>
        {shown.fee !== undefined && (
          <dl className="mx-5 mt-2 flex items-center justify-between rounded-2xl bg-(--surface-color) px-4 py-3 text-(--base-color)">
            <dt className="text-base font-medium">정산 금액</dt>
            <dd
              className={
                shown.fee === null ? "text-base text-(--tertiary-color)" : "text-xl font-bold tabular-nums"
              }
            >
              {shown.fee === null ? "금액 미입력" : formatWon(shown.fee)}
            </dd>
          </dl>
        )}
        <BottomSheetFooter>
          {errorMessage && <FieldError className="text-center">{errorMessage}</FieldError>}
          <Button type="button" size="xl" className="w-full" disabled={isPending} onClick={onConfirm}>
            확인
          </Button>
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  );
}
