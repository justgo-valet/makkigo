"use client";

import { Button, FieldError } from "@makkigo/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@makkigo/ui/components/ui/dialog";

import { useCloseOnAppBack } from "@/features/auth/hooks/useCloseOnAppBack";

import { formatPlateNumber } from "../formatters";

interface EarlyPickupDialogProps {
  plateNumber: string | null;
  isPending: boolean;
  errorMessage: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

export default function EarlyPickupDialog({
  plateNumber,
  isPending,
  errorMessage,
  onConfirm,
  onClose,
}: Readonly<EarlyPickupDialogProps>) {
  const open = plateNumber !== null;
  useCloseOnAppBack(open, onClose);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      {plateNumber && (
        <DialogContent
          showCloseButton={false}
          className="max-w-[min(22rem,calc(100%-2rem))] gap-0 rounded-2xl border-0 p-6 sm:max-w-sm"
        >
          <DialogTitle className="text-center text-lg font-bold break-keep text-(--base-color)">
            출차 요청 전인 차량이에요
          </DialogTitle>
          <p className="mt-4 text-center text-3xl font-bold tabular-nums text-(--base-color)">
            {formatPlateNumber(plateNumber)}
          </p>
          <DialogDescription className="mt-3 text-center text-sm break-keep text-(--tertiary-color)">
            고객이 아직 출차 요청을 하지 않았어요. 출차 완료로 처리할까요?
          </DialogDescription>
          {errorMessage && <FieldError className="mt-4 text-center">{errorMessage}</FieldError>}
          <div className="mt-6 flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="xl"
              className="flex-1 text-(--tertiary-color)"
              disabled={isPending}
              onClick={onClose}
            >
              취소
            </Button>
            <Button type="button" size="xl" className="flex-1" disabled={isPending} onClick={onConfirm}>
              출차 완료
            </Button>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
