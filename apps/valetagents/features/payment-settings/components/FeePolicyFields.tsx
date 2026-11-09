"use client";

import { Input, cn } from "@makkigo/ui";

import type { FeePolicyFieldChanges, FeePolicyFieldValues } from "../hooks/useFeePolicyFields";

const NUMBER_INPUT_CLASS =
  "h-10 bg-white px-2 text-right text-base tabular-nums text-(--base-color) md:text-base";
const ROW_CLASS = "mt-3 flex items-center gap-1.5 text-base text-(--base-color)";

interface FeePolicyFieldsProps {
  values: FeePolicyFieldValues;
  onChange: FeePolicyFieldChanges;
  disabled?: boolean;
}

export default function FeePolicyFields({ values, onChange, disabled }: Readonly<FeePolicyFieldsProps>) {
  const field = (key: keyof FeePolicyFieldValues, label: string, width: string) => (
    <Input
      aria-label={label}
      inputMode="numeric"
      autoComplete="off"
      value={values[key]}
      disabled={disabled}
      onChange={(event) => onChange[key](event.target.value)}
      className={cn(NUMBER_INPUT_CLASS, width)}
    />
  );

  return (
    <>
      <p className={ROW_CLASS}>
        기본요금
        {field("baseHours", "기본 시간", "w-12")}
        시간
        {field("baseFee", "기본요금", "w-28")}
        원
      </p>
      <p className={ROW_CLASS}>
        추가요금
        {field("extraUnitMinutes", "추가 단위 시간(분)", "w-14")}
        분 당
        {field("extraUnitFee", "추가요금", "w-28")}
        원
      </p>
    </>
  );
}
