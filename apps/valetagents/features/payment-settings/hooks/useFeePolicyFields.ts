"use client";

import { useState } from "react";

import type { FeePolicySettings } from "@/libs/booth/contracts/payment-settings";

const toText = (value: number | undefined) => (value === undefined ? "" : String(value));
const toDigits = (value: string, maxLength: number) => value.replace(/\D/g, "").slice(0, maxLength);
const toNumber = (value: string) => (value === "" ? Number.NaN : Number(value));

const useFeePolicyFields = (initial: FeePolicySettings | null) => {
  const [baseHours, setBaseHours] = useState(initial ? toText(initial.baseMinutes / 60) : "");
  const [baseFee, setBaseFee] = useState(toText(initial?.baseFee));
  const [extraUnitMinutes, setExtraUnitMinutes] = useState(toText(initial?.extraUnitMinutes));
  const [extraUnitFee, setExtraUnitFee] = useState(toText(initial?.extraUnitFee));

  return {
    values: { baseHours, baseFee, extraUnitMinutes, extraUnitFee },
    feePolicy: {
      baseMinutes: toNumber(baseHours) * 60,
      baseFee: toNumber(baseFee),
      extraUnitMinutes: toNumber(extraUnitMinutes),
      extraUnitFee: toNumber(extraUnitFee),
    },
    filled: [baseHours, baseFee, extraUnitMinutes, extraUnitFee].every((value) => value !== ""),
    change: {
      baseHours: (value: string) => setBaseHours(toDigits(value, 2)),
      baseFee: (value: string) => setBaseFee(toDigits(value, 7)),
      extraUnitMinutes: (value: string) => setExtraUnitMinutes(toDigits(value, 3)),
      extraUnitFee: (value: string) => setExtraUnitFee(toDigits(value, 7)),
    },
  };
};

type FeePolicyFieldValues = ReturnType<typeof useFeePolicyFields>["values"];
type FeePolicyFieldChanges = ReturnType<typeof useFeePolicyFields>["change"];

export { useFeePolicyFields };
export type { FeePolicyFieldChanges, FeePolicyFieldValues };
