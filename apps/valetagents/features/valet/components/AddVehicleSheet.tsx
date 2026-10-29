"use client";

import { Button, FieldError, Input, Label } from "@makkigo/ui";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@makkigo/ui/components/ui/sheet";
import { useState } from "react";

import { PLATE_NUMBER_PATTERN, normalizePlateNumber } from "@/libs/valet/contracts/add-vehicle";

interface AddVehicleFormProps {
  isAdding: boolean;
  errorMessage: string | null;
  onAdd: (plateNumber: string) => void;
  onClose: () => void;
}

function AddVehicleForm({ isAdding, errorMessage, onAdd, onClose }: Readonly<AddVehicleFormProps>) {
  const [value, setValue] = useState("");
  const plateNumber = normalizePlateNumber(value);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onAdd(plateNumber);
      }}
    >
      <SheetHeader className="gap-[13px] p-0 text-left">
        <SheetTitle className="text-2xl leading-6 font-medium text-[#03090f]">차량 추가</SheetTitle>
        <SheetDescription className="text-sm leading-6 text-[#717171]">
          직접 주차된 차량을 추가해요
        </SheetDescription>
      </SheetHeader>

      <Label
        htmlFor="add-vehicle-plate-number"
        className="mt-[9px] gap-1 text-xl leading-6 font-medium text-[#03090f]"
      >
        차량 번호
        <span aria-hidden className="text-[#ff0000]">
          *
        </span>
      </Label>
      <Input
        id="add-vehicle-plate-number"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="62가 3214"
        autoComplete="off"
        required
        aria-invalid={errorMessage !== null}
        className="mt-2.5 -ml-[5px] h-[68px] w-[calc(100%+13px)] rounded-lg border-[#d8d8d8] bg-white pr-6 text-right text-[32px] text-[#03090f] shadow-none md:text-[32px]"
      />
      {errorMessage && <FieldError className="mt-2">{errorMessage}</FieldError>}

      <div className="mt-[46px] flex gap-[5px]">
        <Button
          type="button"
          className="h-16 flex-1 rounded-[6px] bg-(--secondary-color) text-lg font-medium hover:bg-(--secondary-color)"
          onClick={onClose}
        >
          닫기
        </Button>
        <Button
          type="submit"
          className="h-16 flex-1 rounded-[6px] text-lg font-medium"
          disabled={isAdding || !PLATE_NUMBER_PATTERN.test(plateNumber)}
        >
          추가하기
        </Button>
      </div>
    </form>
  );
}

interface AddVehicleSheetProps extends AddVehicleFormProps {
  open: boolean;
}

export default function AddVehicleSheet({ open, ...form }: Readonly<AddVehicleSheetProps>) {
  return (
    <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && form.onClose()}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        overlayClassName="bg-transparent"
        className="mx-auto max-w-[767px] gap-0 rounded-t-[32px] border border-[#d8d8d8] bg-[#f7f9fc] pr-[21px] pl-[25px] pt-[45px] pb-[max(17px,var(--safe-area-inset-bottom))] shadow-[0_-3px_4px_rgba(0,0,0,0.25)] data-[state=closed]:duration-150 data-[state=open]:duration-200"
      >
        <AddVehicleForm {...form} />
      </SheetContent>
    </Sheet>
  );
}
