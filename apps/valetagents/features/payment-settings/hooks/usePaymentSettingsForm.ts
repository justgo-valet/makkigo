"use client";

import { getErrorMessage } from "@makkigo/api-client";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { paymentSettingsSchema } from "@/libs/booth/contracts/payment-settings";

import { savePaymentSettings } from "../apis/savePaymentSettings";
import { useFeePolicyFields } from "./useFeePolicyFields";

import type {
  BankAccountSettings,
  FeePolicySettings,
} from "@/libs/booth/contracts/payment-settings";

const SAVE_ERROR_MESSAGE = "요금 · 계좌를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.";
const INVALID_MESSAGE =
  "기본 1~24시간, 요금 100만 원 이하, 추가 1~180분, 계좌번호는 숫자와 하이픈으로 입력해 주세요.";

interface UsePaymentSettingsFormOptions {
  boothId: number;
  feePolicy: FeePolicySettings | null;
  bankAccount: BankAccountSettings | null;
}

const usePaymentSettingsForm = ({ boothId, feePolicy, bankAccount }: UsePaymentSettingsFormOptions) => {
  const fee = useFeePolicyFields(feePolicy);
  const [bankName, setBankName] = useState(bankAccount?.bankName ?? "");
  const [accountNumber, setAccountNumber] = useState(bankAccount?.accountNumber ?? "");
  const [accountHolder, setAccountHolder] = useState(bankAccount?.accountHolder ?? "");
  const [saved, setSaved] = useState(false);

  const parsed = paymentSettingsSchema.safeParse({
    feePolicy: fee.feePolicy,
    bankAccount: { bankName, accountNumber, accountHolder },
  });

  const mutation = useMutation({
    mutationFn: () => {
      if (!parsed.success) throw new Error("invalid");
      return savePaymentSettings(boothId, parsed.data);
    },
    retry: false,
    onSuccess: () => setSaved(true),
  });

  const edit = <Value,>(setter: (value: Value) => void) => (value: Value) => {
    if (mutation.isPending) return;
    setSaved(false);
    mutation.reset();
    setter(value);
  };

  return {
    feeValues: fee.values,
    changeFee: {
      baseHours: edit(fee.change.baseHours),
      baseFee: edit(fee.change.baseFee),
      extraUnitMinutes: edit(fee.change.extraUnitMinutes),
      extraUnitFee: edit(fee.change.extraUnitFee),
    },
    bankName,
    accountNumber,
    accountHolder,
    changeBankName: edit(setBankName),
    changeAccountNumber: edit((value: string) => setAccountNumber(value.replace(/[^\d-]/g, "").slice(0, 30))),
    changeAccountHolder: edit(setAccountHolder),
    canSave: parsed.success && !mutation.isPending,
    invalidMessage:
      !parsed.success &&
      fee.filled &&
      [bankName, accountNumber, accountHolder].every((value) => value.trim() !== "")
        ? INVALID_MESSAGE
        : null,
    save: () => mutation.mutate(),
    saved,
    errorMessage: mutation.error ? getErrorMessage(mutation.error, SAVE_ERROR_MESSAGE) : null,
  };
};

export { usePaymentSettingsForm };
