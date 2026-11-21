"use client";

import { Button, Field, FieldError, FieldLabel, Input, cn } from "@makkigo/ui";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
} from "@makkigo/ui/components/ui/bottom-sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@makkigo/ui/components/ui/select";
import { useState } from "react";

import { PLATE_NUMBER_PATTERN, normalizePlateNumber } from "@/libs/valet/contracts/add-vehicle";

import type { AddVehicleInput } from "../apis/addVehicle";


const NO_MERCHANT = "none";
const LABEL_CLASS = "gap-1 text-sm font-semibold text-(--base-color)";

interface AddVehicleFormProps {
  merchants: { id: number; name: string }[];
  isAdding: boolean;
  errorMessage: string | null;
  onAdd: (input: AddVehicleInput) => void;
  onClose: () => void;
}

function AddVehicleForm({
  merchants,
  isAdding,
  errorMessage,
  onAdd,
  onClose,
}: Readonly<AddVehicleFormProps>) {
  const [value, setValue] = useState("");
  const [merchantId, setMerchantId] = useState(merchants.length === 1 ? String(merchants[0].id) : NO_MERCHANT);
  const plateNumber = normalizePlateNumber(value);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onAdd({ plateNumber, merchantId: merchantId === NO_MERCHANT ? null : Number(merchantId) });
      }}
    >
      <BottomSheetHeader title="차량 추가" description="직접 주차된 차량을 추가해요" />
      <Field data-invalid={errorMessage !== null} className="gap-2 px-5 pt-5">
        <FieldLabel htmlFor="add-vehicle-plate-number" className={LABEL_CLASS}>
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
        {merchants.length > 0 && (
          <>
            <FieldLabel htmlFor="add-vehicle-merchant" className={cn(LABEL_CLASS, "mt-3")}>
              업체
            </FieldLabel>
            <Select value={merchantId} onValueChange={setMerchantId}>
              <SelectTrigger id="add-vehicle-merchant">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_MERCHANT}>선택 안 함</SelectItem>
                {merchants.map(({ id, name }) => (
                  <SelectItem key={id} value={String(id)}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
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
