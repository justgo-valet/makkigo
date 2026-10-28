"use client";

import { Button, Field, FieldError, FieldLabel, Input } from "@makkigo/ui";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
} from "@makkigo/ui/components/ui/bottom-sheet";
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
      <BottomSheetHeader title="차량 추가" description="직접 주차된 차량을 추가해요" />
      <Field data-invalid={errorMessage !== null} className="gap-2 px-5 pt-5">
        <FieldLabel
          htmlFor="add-vehicle-plate-number"
          className="gap-1 text-sm font-semibold text-(--base-color)"
        >
          차량 번호
          <span aria-hidden className="text-destructive">
            *
          </span>
        </FieldLabel>
        <Input
          id="add-vehicle-plate-number"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="62가 3214"
          autoComplete="off"
          required
          aria-invalid={errorMessage !== null}
          className="h-14 bg-white text-right text-2xl tabular-nums text-(--base-color) md:text-2xl"
        />
        {errorMessage && <FieldError>{errorMessage}</FieldError>}
      </Field>
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
        <Button
          type="submit"
          size="xl"
          className="flex-1"
          disabled={isAdding || !PLATE_NUMBER_PATTERN.test(plateNumber)}
        >
          추가하기
        </Button>
      </BottomSheetFooter>
    </form>
  );
}

interface AddVehicleSheetProps extends AddVehicleFormProps {
  open: boolean;
}

export default function AddVehicleSheet({ open, ...form }: Readonly<AddVehicleSheetProps>) {
  return (
    <BottomSheet open={open} onClose={form.onClose}>
      <BottomSheetContent>
        <AddVehicleForm {...form} />
      </BottomSheetContent>
    </BottomSheet>
  );
}
