"use client";

import { Button, FieldError } from "@makkigo/ui";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@makkigo/ui/components/ui/sheet";
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
    <Sheet open={plateNumber !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        overlayClassName="bg-transparent"
        className="mx-auto max-w-[767px] gap-0 rounded-t-[32px] border border-[#d8d8d8] bg-[#f7f9fc] px-[27px] pt-[42px] pb-[max(25px,env(safe-area-inset-bottom))] shadow-[0_-3px_4px_rgba(0,0,0,0.25)] data-[state=closed]:duration-150 data-[state=open]:duration-200"
      >
        <SheetHeader className="p-0 text-left">
          <SheetTitle className="text-2xl leading-6 font-medium text-[#03090f]">{title}</SheetTitle>
          <SheetDescription className="sr-only">{description}</SheetDescription>
        </SheetHeader>

        <p className="mt-[46px] text-center text-[32px] leading-10 text-[#03090f]">
          {shownPlate && formatPlateNumber(shownPlate)}
        </p>

        <div className="mt-[50px]">
          {errorMessage && <FieldError className="mb-3 text-center">{errorMessage}</FieldError>}
          <Button
            type="button"
            className="h-16 w-full rounded-[6px] text-lg font-medium"
            disabled={isPending}
            onClick={onConfirm}
          >
            확인
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
