"use client";

import { Button, FieldError } from "@makkigo/ui";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
} from "@makkigo/ui/components/ui/bottom-sheet";
import { useState } from "react";

import { formatPlateNumber } from "../formatters";

interface PlateConfirmSheetProps {
  title: string;
  description: string;
  plateNumber: string | null;
  isPending: boolean;
  errorMessage: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

export default function PlateConfirmSheet({
  title,
  description,
  plateNumber,
  isPending,
  errorMessage,
  onConfirm,
  onClose,
}: Readonly<PlateConfirmSheetProps>) {
  const [shownPlate, setShownPlate] = useState(plateNumber);
  if (plateNumber && plateNumber !== shownPlate) setShownPlate(plateNumber);

  return (
    <BottomSheet open={plateNumber !== null} onClose={onClose}>
      <BottomSheetContent>
        <BottomSheetHeader title={title} description={description} />
        <p className="px-5 pt-6 pb-2 text-center text-3xl font-bold tabular-nums text-(--base-color)">
          {shownPlate && formatPlateNumber(shownPlate)}
        </p>
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
